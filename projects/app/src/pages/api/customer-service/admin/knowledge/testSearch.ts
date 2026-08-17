import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { DatasetSearchModeEnum } from '@fastgpt/global/core/dataset/constants';
import {
  CustomerServiceAdminKnowledgeTestSearchBodySchema,
  CustomerServiceAdminKnowledgeTestSearchResponseSchema,
  type CustomerServiceAdminKnowledgeTestSearchResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { searchDatasetData } from '@fastgpt/service/core/dataset/search/defaultRecall';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { UserError } from '@fastgpt/global/common/error/utils';
import { getLLMModel } from '@fastgpt/service/core/ai/model';
import { createChatCompletion } from '@fastgpt/service/core/ai/llm/request/createChatCompletion';

/**
 * 审核试问沙盒与实时检索接口。
 *
 * 允许审核员/编辑在不发布的前提下，对指定 collection（即使处于 draft/pending/forbid 状态）
 * 执行隔离混合检索与 Rerank 重排试问，验证入库质量与召回率，并生成拟答预览。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminKnowledgeTestSearchResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeTestSearchBodySchema
  });

  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeReviewer,
      CustomerServiceMemberRoleEnum.knowledgeEditor
    ]
  });

  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: [body.datasetId],
    mode: 'read'
  });

  const dataset = await MongoDataset.findOne({ _id: body.datasetId, teamId }).lean();
  if (!dataset) {
    throw new UserError('Dataset not found');
  }

  // 1. 构造隔离白名单检索器执行混合检索 + Rerank
  const { searchRes } = await searchDatasetData({
    histories: [],
    teamId,
    datasetIds: [body.datasetId],
    textQueries: [body.question],
    reRankQuery: body.question,
    model: dataset.vectorModel,
    vlmModel: dataset.vlmModel,
    searchMode: DatasetSearchModeEnum.mixedRecall,
    usingReRank: true,
    collectionIdWhitelist: [body.collectionId],
    limit: 5000
  });

  // 2. 提取命中文档切片与相似度得分
  const chunks = searchRes.map((item) => {
    const content = [item.q, item.a].filter(Boolean).join('\n');
    const scoreVal = item.score?.[0]?.value ?? 0;
    return {
      chunkId: String(item.id),
      content,
      score: Number(scoreVal.toFixed(4))
    };
  });

  const rawMaxScore = chunks.length > 0 ? Math.max(...chunks.map((c) => c.score)) : 0;
  // 归一化得分到 0 ~ 1 之间
  const score = Number(
    Math.min(1, Math.max(0, rawMaxScore > 1 ? rawMaxScore / 100 : rawMaxScore)).toFixed(4)
  );
  const matchCount = chunks.length;

  // 3. 模型生成拟答预览
  let answerPreview = '';
  const context = chunks.map((c, i) => `[切片 ${i + 1}]:\n${c.content}`).join('\n\n');

  if (context) {
    try {
      const llmModel = getLLMModel();
      if (llmModel) {
        const aiRes = await createChatCompletion({
          modelData: llmModel,
          body: {
            model: llmModel.model,
            messages: [
              {
                role: 'system',
                content:
                  '你是一名企业无人自助设备智能客服专家。请严格根据提供的知识库切片内容，用规范、条理清晰的中文回答审核员的测试问题。若切片中未提供相关信息，请直接回答无法根据现有切片回答。'
              },
              {
                role: 'user',
                content: `【知识切片参考】：\n${context}\n\n【用户问题】：${body.question}`
              }
            ],
            temperature: 0.1,
            max_tokens: 600,
            stream: false
          },
          timeout: 8000
        });
        if (aiRes && !aiRes.isStreamResponse && aiRes.response.choices?.[0]?.message?.content) {
          answerPreview = aiRes.response.choices[0].message.content.trim();
        }
      }
    } catch {
      // 容错降级
    }
  }

  if (!answerPreview) {
    if (chunks.length > 0) {
      answerPreview = `您好！针对您咨询的 **“${body.question}”**：\n\n根据知识库匹配内容：\n${chunks
        .map((c, i) => `${i + 1}. ${c.content.slice(0, 160)}...`)
        .join(
          '\n\n'
        )}\n\n*(共命中 ${chunks.length} 条知识切片，最高匹配得分 ${(score * 100).toFixed(1)}%)*`;
    } else {
      answerPreview = `未在当前待审知识中检索到与 **“${body.question}”** 高度相关的切片。建议检查文档切片或补充相似问。`;
    }
  }

  return CustomerServiceAdminKnowledgeTestSearchResponseSchema.parse({
    score,
    matchCount,
    chunks,
    answerPreview
  });
}

export default NextAPI(handler);
