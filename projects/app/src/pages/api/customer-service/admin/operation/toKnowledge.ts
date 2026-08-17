import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAppLogs,
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { findCustomerServiceOperationById } from '@/service/customerService/operations';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import {
  CustomerServiceAdminOperationToKnowledgeBodySchema,
  CustomerServiceAdminOperationToKnowledgeResponseSchema,
  type CustomerServiceAdminOperationToKnowledgeResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { createCollectionAndInsertData } from '@fastgpt/service/core/dataset/collection/controller';
import { createCustomerServiceKnowledgeDraft } from '@fastgpt/service/core/customerService/knowledge/service';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { UserError } from '@fastgpt/global/common/error/utils';
import { findCustomerServiceProjectById } from '@fastgpt/service/core/customerService/project/entity';
import { redactCustomerServiceSensitiveText } from '@fastgpt/service/core/customerService/privacy';

/** 将一条未解决客服问题写入原生文本 collection，并在同一事务登记治理草稿。 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminOperationToKnowledgeResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminOperationToKnowledgeBodySchema
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
  const [requestRecord, dataset] = await Promise.all([
    findCustomerServiceOperationById({ teamId, id: body.requestRecordId }),
    MongoDataset.findOne({ _id: body.datasetId, teamId, deleteTime: null }).lean()
  ]);
  if (!requestRecord) throw new UserError('Customer service request not found');
  if (!dataset) throw new UserError('Dataset not found');
  const sourceProject = await findCustomerServiceProjectById({
    teamId,
    projectId: String(requestRecord.projectId)
  });
  if (!sourceProject) throw new UserError('Customer service project not found');
  await authCustomerServiceAppLogs({
    tmbId,
    appId: String(sourceProject.appId),
    isRoot
  });
  const title = redactCustomerServiceSensitiveText(body.title);
  const answer = redactCustomerServiceSensitiveText(body.answer);

  const knowledge = await mongoSessionRun(async (session) => {
    const collection = await createCollectionAndInsertData({
      dataset,
      rawText: `问题：${title}\n\n参考答案：${answer}`,
      createCollectionParams: {
        teamId,
        tmbId,
        datasetId: body.datasetId,
        name: title,
        type: DatasetCollectionTypeEnum.virtual
      },
      session
    });
    return createCustomerServiceKnowledgeDraft({
      teamId,
      tmbId,
      datasetId: body.datasetId,
      collectionId: collection.collectionId,
      title,
      sourceName: '客服未解决问题',
      sourceRequestRecordId: String(requestRecord._id),
      sourceSessionId: requestRecord.externalSessionId,
      knowledgeType: body.knowledgeType,
      audienceLevel: body.audienceLevel,
      modelIds:
        body.modelIds.length > 0
          ? body.modelIds
          : requestRecord.modelId
            ? [String(requestRecord.modelId)]
            : [],
      session
    });
  });

  return CustomerServiceAdminOperationToKnowledgeResponseSchema.parse({
    id: String(knowledge._id)
  });
}

export default NextAPI(handler);
