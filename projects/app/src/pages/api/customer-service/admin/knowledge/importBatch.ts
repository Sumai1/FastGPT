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
  CustomerServiceAdminKnowledgeImportBatchBodySchema,
  CustomerServiceAdminKnowledgeImportBatchResponseSchema,
  type CustomerServiceAdminKnowledgeImportBatchResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { createCollectionAndInsertData } from '@fastgpt/service/core/dataset/collection/controller';
import { createCustomerServiceKnowledgeDraft } from '@fastgpt/service/core/customerService/knowledge/service';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { UserError } from '@fastgpt/global/common/error/utils';

/**
 * 批量 FAQ 问答与多相似问扩展导入 API。
 *
 * 将多条标准问、多相似问同义词、核心答案与详细说明批量入库为 FastGPT 知识集合，
 * 并原子化登记对应治理范围的 FAQ 知识草稿。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminKnowledgeImportBatchResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeImportBatchBodySchema
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

  // 格式化为多 QA 组合文档
  const rawText = body.items
    .map((item, index) => {
      const simText =
        item.similarQuestions && item.similarQuestions.length > 0
          ? `\n相似问法：${item.similarQuestions.join(' / ')}`
          : '';
      const tagText = item.categoryTag ? `\n分类：${item.categoryTag}` : '';
      const detailText = item.detailedAnswer ? `\n\n【详细排障说明】\n${item.detailedAnswer}` : '';

      return `### 问题 ${index + 1}：${item.question}${simText}${tagText}\n\n**解答**：\n${item.answer}${detailText}`;
    })
    .join('\n\n---\n\n');

  const fullText = `# 【FAQ 知识库批量导入】${body.title}\n\n${rawText}`;

  const result = await mongoSessionRun(async (session) => {
    const collection = await createCollectionAndInsertData({
      dataset,
      rawText: fullText,
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
      sourceName: `FAQ 批量导入 (${body.items.length} 条)`,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: body.audienceLevel,
      modelIds: body.modelIds,
      hardwareVersionIds: body.hardwareVersionIds,
      softwareVersionIds: body.softwareVersionIds,
      structuredData: {
        batchCount: body.items.length,
        items: body.items
      },
      session
    });

    return {
      id: String(knowledge._id),
      collectionId: collection.collectionId,
      importedCount: body.items.length
    };
  });

  return CustomerServiceAdminKnowledgeImportBatchResponseSchema.parse(result);
}

export default NextAPI(handler);
