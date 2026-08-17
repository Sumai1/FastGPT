import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeOfflineBodySchema,
  CustomerServiceAdminKnowledgeOfflineResponseSchema,
  type CustomerServiceAdminKnowledgeOfflineResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findCustomerServiceKnowledgeById } from '@fastgpt/service/core/customerService/knowledge/entity';
import { offlineCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 下架已发布知识，并确保原 collection 立即退出召回范围。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeOfflineResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeOfflineBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeReviewer
    ]
  });
  const knowledge = await findCustomerServiceKnowledgeById({
    teamId,
    knowledgeId: body.knowledgeId
  });
  if (!knowledge) throw new UserError('Customer service knowledge not found');
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: [String(knowledge.datasetId)],
    mode: 'manage'
  });
  await offlineCustomerServiceKnowledge({
    teamId,
    operatorTmbId: tmbId,
    ...body
  });
  return CustomerServiceAdminKnowledgeOfflineResponseSchema.parse(undefined);
}

export default NextAPI(handler);
