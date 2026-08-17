import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { redactCustomerServiceSensitiveText } from '@fastgpt/global/core/customerService/privacy';

type Product = {
  name: string;
  modelCode: string;
  hardwareVersion: string;
  softwareVersion: string;
  allowedCollectionIds: string[];
};
type Question = {
  id: string;
  message: string;
  expectedStatuses: string[];
  requireCitation: boolean;
  expectedAnswerKeywords?: string[];
};
type Matrix = { description: string; products: Product[]; questions: Question[] };
type CustomerResponse = {
  status: string;
  answer: string;
  citations: Array<{ collectionId: string }>;
};
type EvaluationResult = {
  requestId: string;
  product: string;
  questionId: string;
  passed: boolean;
  status?: string;
  statusPassed?: boolean;
  answerPassed?: boolean;
  citationPassed?: boolean;
  recallAt5Passed?: boolean;
  isolationPassed?: boolean;
  hallucination?: boolean;
  latencyMs?: number;
  answer?: string;
  citationCount?: number;
  error?: string;
};

const baseUrl = process.env.CUSTOMER_SERVICE_BASE_URL || 'http://localhost:3000';
const apiKey = process.env.CUSTOMER_SERVICE_API_KEY;
const validateOnly = process.argv.includes('--validate');
const scriptDir = __dirname;
const workspaceRoot = resolve(scriptDir, '../../..');
const matrixPath = resolve(scriptDir, 'evaluation-200.matrix.json');

/** 校验评测矩阵规模及场景/问题唯一性，避免看似 200 条实际重复覆盖。 */
const validateMatrix = (matrix: Matrix) => {
  const scenarioIds = matrix.products.map(
    (item) => `${item.modelCode}:${item.hardwareVersion}:${item.softwareVersion}`
  );
  const questionIds = matrix.questions.map((item) => item.id);
  const caseCount = scenarioIds.length * questionIds.length;
  if (caseCount < 200) throw new Error('Evaluation matrix must contain at least 200 cases');
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new Error('Evaluation product/version scenarios must be unique');
  }
  if (new Set(questionIds).size !== questionIds.length) {
    throw new Error('Evaluation question IDs must be unique');
  }
  return { products: matrix.products.length, questions: matrix.questions.length, cases: caseCount };
};

/** 执行矩阵校验或完整在线评测，并生成脱敏指标报告。 */
const main = async () => {
  const matrix = JSON.parse(await readFile(matrixPath, 'utf8')) as Matrix;
  const matrixSummary = validateMatrix(matrix);
  if (validateOnly) {
    console.log(JSON.stringify({ matrixPath, valid: true, ...matrixSummary }));
    return;
  }
  if (!apiKey) throw new Error('CUSTOMER_SERVICE_API_KEY is required');

  const cases = matrix.products.flatMap((product) =>
    matrix.questions.map((question) => ({ product, question }))
  );
  const results: EvaluationResult[] = [];

  for (let index = 0; index < cases.length; index += 1) {
    const { product, question } = cases[index];
    const requestId = `eval-${Date.now()}-${index}`;
    const startTime = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/customer-service/v1/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requestId,
          sessionId: `eval-${product.modelCode}-${product.hardwareVersion}-${product.softwareVersion}-${question.id}`,
          message: question.message,
          productModel: product.modelCode,
          hardwareVersion: product.hardwareVersion,
          softwareVersion: product.softwareVersion,
          audience: 'public',
          stream: false
        })
      });
      const payload = await response.json();
      const data = payload.data as CustomerResponse | undefined;
      if (!response.ok || !data) throw new Error(payload.message || `HTTP ${response.status}`);

      const statusPassed = question.expectedStatuses.includes(data.status);
      const answerPassed = (question.expectedAnswerKeywords || []).every((keyword) =>
        data.answer.toLocaleLowerCase().includes(keyword.toLocaleLowerCase())
      );
      const citationPassed = !question.requireCitation || data.citations.length > 0;
      const recallAt5Passed =
        !question.requireCitation ||
        product.allowedCollectionIds.length === 0 ||
        data.citations
          .slice(0, 5)
          .some((item) => product.allowedCollectionIds.includes(item.collectionId));
      const isolationPassed =
        product.allowedCollectionIds.length === 0 ||
        data.citations.every((item) => product.allowedCollectionIds.includes(item.collectionId));
      const hallucination =
        data.status === 'answered' && (!citationPassed || !recallAt5Passed || !isolationPassed);
      results.push({
        requestId,
        product: `${product.modelCode}/${product.hardwareVersion}/${product.softwareVersion}`,
        questionId: question.id,
        status: data.status,
        statusPassed,
        answerPassed,
        citationPassed,
        recallAt5Passed,
        isolationPassed,
        hallucination,
        passed:
          statusPassed &&
          answerPassed &&
          citationPassed &&
          recallAt5Passed &&
          isolationPassed &&
          !hallucination,
        latencyMs: Date.now() - startTime,
        answer: redactCustomerServiceSensitiveText(data.answer),
        citationCount: data.citations.length
      });
    } catch (error) {
      results.push({
        requestId,
        product: `${product.modelCode}/${product.hardwareVersion}/${product.softwareVersion}`,
        questionId: question.id,
        passed: false,
        latencyMs: Date.now() - startTime,
        error: redactCustomerServiceSensitiveText(
          error instanceof Error ? error.message : String(error)
        )
      });
    }
  }

  const ratio = (predicate: (item: EvaluationResult) => boolean, subset = results) =>
    subset.length > 0 ? subset.filter(predicate).length / subset.length : 0;
  const citationCases = results.filter((_, index) => cases[index].question.requireCitation);
  const humanCases = results.filter((_, index) =>
    cases[index].question.expectedStatuses.includes('human_required')
  );
  const passed = results.filter((item) => item.passed).length;
  const report = {
    generatedAt: new Date().toISOString(),
    description: matrix.description,
    total: results.length,
    passed,
    metrics: {
      passRate: ratio((item) => item.passed),
      statusAccuracy: ratio((item) => item.statusPassed === true),
      answerKeywordAccuracy: ratio((item) => item.answerPassed === true),
      citationAccuracy: ratio((item) => item.citationPassed === true, citationCases),
      recallAt5: ratio((item) => item.recallAt5Passed === true, citationCases),
      collectionIsolationRate: ratio((item) => item.isolationPassed === true),
      handoffAccuracy: ratio((item) => item.status === 'human_required', humanCases),
      hallucinationRate: ratio((item) => item.hallucination === true),
      averageLatencyMs:
        results.reduce((sum, item) => sum + (item.latencyMs || 0), 0) / results.length
    },
    results
  };
  const reportPath = resolve(workspaceRoot, 'customer-service-evaluation-report.json');
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ reportPath, total: report.total, passed, metrics: report.metrics }));
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
