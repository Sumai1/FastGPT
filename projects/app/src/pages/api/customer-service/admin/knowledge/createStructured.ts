import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import {
  CustomerServiceAdminKnowledgeCreateStructuredBodySchema,
  CustomerServiceAdminKnowledgeCreateStructuredResponseSchema,
  type CustomerServiceAdminKnowledgeCreateStructuredResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { createCollectionAndInsertData } from '@fastgpt/service/core/dataset/collection/controller';
import { createCustomerServiceKnowledgeDraft } from '@fastgpt/service/core/customerService/knowledge/service';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { UserError } from '@fastgpt/global/common/error/utils';

/**
 * 将结构化模板数据格式化为标准化 Markdown 知识正文。
 */
const formatStructuredTemplateToMarkdown = (
  title: string,
  templateType: 'productMaster' | 'manual' | 'faq' | 'faultCard',
  data: Record<string, unknown>
): { markdown: string; knowledgeType: CustomerServiceKnowledgeTypeEnum } => {
  const customMarkdown =
    typeof data.markdown === 'string' && data.markdown.trim() ? data.markdown.trim() : '';

  if (templateType === 'productMaster') {
    if (customMarkdown) {
      return {
        markdown: customMarkdown,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.productMaster
      };
    }
    const brand = String(data.brand || '通用品牌');
    const modelName = String(data.modelName || '标准机型');
    const category = String(data.category || '无人自助设备');
    const powerSpecs = String(data.powerSpecs || 'AC 220V 50Hz');
    const dimensions = String(data.dimensions || '标准柜体尺寸');
    const operatingEnv = String(data.operatingEnv || '0℃~40℃, 湿度 20%~80% RH');
    const consumables = String(data.consumables || '专用标准耗材');
    const interfaces = String(data.interfaces || 'RJ45 / 4G / USB');
    const warrantyPolicy = String(data.warrantyPolicy || '整机质保 1 年');

    const markdown = `# 【产品主档】${title}

## 1. 基础产品属性
- **品牌名称**：${brand}
- **产品型号**：${modelName}
- **设备品类**：${category}

## 2. 硬件与电气规格
- **供电与电气参数**：${powerSpecs}
- **外形尺寸与重量**：${dimensions}
- **外部通信与接口**：${interfaces}

## 3. 运行环境要求
- **温湿度环境要求**：${operatingEnv}

## 4. 适配耗材与配件
- **适用耗材规格说明**：${consumables}

## 5. 售后质保标准
- **保修与售后政策**：${warrantyPolicy}`;

    return {
      markdown,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.productMaster
    };
  }

  if (templateType === 'manual') {
    if (customMarkdown) {
      return {
        markdown: customMarkdown,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.manual
      };
    }
    const purpose = String(data.purpose || '标准日常维护与操作流程');
    const safetyWarnings = String(
      data.safetyWarnings || '操作前务必先切断主电源，佩戴绝缘安全手套。'
    );
    const toolsRequired = String(data.toolsRequired || '标准十字螺丝刀、防静电刷、酒精清洁湿巾');
    const steps = String(
      data.steps || '1. 关闭设备电源总开关；\n2. 打开维护门；\n3. 按照标准指引操作。'
    );
    const verification = String(data.verification || '接通电源，观察指示灯常亮且自检无报错。');
    const emergencyStop = String(
      data.emergencyStop || '若发现异响或焦糊味，立即按下急停按钮并联系驻场工程师。'
    );

    const markdown = `# 【SOP 操作说明】${title}

## 1. 操作目标与适用场景
${purpose}

## 2. 安全防范与准备工作
- **安全警示说明**：${safetyWarnings}
- **必备工具与备件**：${toolsRequired}

## 3. 标准操作流程步骤 (SOP)
${steps}

## 4. 复位自检与验收标准
${verification}

## 5. 紧急异常处置
${emergencyStop}`;

    return {
      markdown,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.manual
    };
  }

  if (templateType === 'faultCard') {
    if (customMarkdown) {
      return {
        markdown: customMarkdown,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.fault
      };
    }
    const faultCode = String(data.faultCode || 'ERR-000');
    const faultPhenomenon = String(data.faultPhenomenon || '设备运行异常报警');
    const possibleCauses = String(
      data.possibleCauses || '1. 传感器积灰；\n2. 机械部件堵塞；\n3. 线路接触不良。'
    );
    const troubleshootingSteps = String(
      data.troubleshootingSteps ||
        '步骤 1：排查电源指示；\n步骤 2：清洁光电传感器；\n步骤 3：重启复位系统。'
    );
    const spareParts = String(data.spareParts || '标准传感器模块、易损连接线缆');
    const escalationCondition = String(
      data.escalationCondition || '若完成 3 步排查后故障仍未消除，触发转人工并派单现场维修。'
    );

    const markdown = `# 【售后排障故障卡】${title}

## 1. 故障代码与现象
- **故障代码**：${faultCode}
- **故障现象**：${faultPhenomenon}

## 2. 常见诱因分析
${possibleCauses}

## 3. 标准排查与修复步骤
${troubleshootingSteps}

## 4. 涉及备件与型号
${spareParts}

## 5. 转人工与派单升级条件
${escalationCondition}`;

    return {
      markdown,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.fault
    };
  }

  // FAQ
  if (customMarkdown) {
    return {
      markdown: customMarkdown,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq
    };
  }
  const question = String(data.question || title);
  const similarQuestions = Array.isArray(data.similarQuestions)
    ? data.similarQuestions.join(' / ')
    : String(data.similarQuestions || '');
  const answer = String(data.answer || '请参考标准设备使用指引。');
  const detailedAnswer = String(data.detailedAnswer || '');

  const markdown = `# 【常见问答 FAQ】${title}

**标准提问**：${question}
${similarQuestions ? `**相似问法**：${similarQuestions}\n` : ''}
### 核心解答
${answer}
${detailedAnswer ? `\n### 详细原理解析与指引\n${detailedAnswer}` : ''}`;

  return {
    markdown,
    knowledgeType: CustomerServiceKnowledgeTypeEnum.faq
  };
};

/**
 * 4 大结构化模板录入知识接口。
 *
 * 接收产品主档、SOP 操作说明、FAQ 与售后故障卡 4 大模板的标准表单字段，
 * 自动渲染为高质量 Markdown 并生成 FastGPT 原生 collection 与治理草稿。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminKnowledgeCreateStructuredResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeCreateStructuredBodySchema
  });

  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor
    ]
  });

  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: [body.datasetId],
    mode: 'write'
  });

  const dataset = await MongoDataset.findOne({
    _id: body.datasetId,
    teamId,
    deleteTime: null
  }).lean();
  if (!dataset) {
    throw new UserError('Dataset not found');
  }

  const { markdown, knowledgeType } = formatStructuredTemplateToMarkdown(
    body.title,
    body.templateType,
    body.templateData
  );

  const result = await mongoSessionRun(async (session) => {
    const collection = await createCollectionAndInsertData({
      dataset,
      rawText: markdown,
      createCollectionParams: {
        teamId,
        tmbId,
        datasetId: body.datasetId,
        name: body.title,
        type: DatasetCollectionTypeEnum.virtual
      },
      session
    });

    const knowledge = await createCustomerServiceKnowledgeDraft({
      teamId,
      tmbId,
      datasetId: body.datasetId,
      collectionId: collection.collectionId,
      title: body.title,
      sourceName: `结构化模板录入 (${body.templateType})`,
      knowledgeType,
      audienceLevel: body.audienceLevel,
      modelIds: body.modelIds,
      hardwareVersionIds: body.hardwareVersionIds,
      softwareVersionIds: body.softwareVersionIds,
      structuredData: {
        templateType: body.templateType,
        ...body.templateData
      },
      session
    });

    return {
      id: String(knowledge._id),
      collectionId: collection.collectionId
    };
  });

  return CustomerServiceAdminKnowledgeCreateStructuredResponseSchema.parse(result);
}

export default NextAPI(handler);
