import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeSubmitBodySchema,
  CustomerServiceAdminKnowledgeSubmitResponseSchema,
  type CustomerServiceAdminKnowledgeSubmitResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findCustomerServiceKnowledgeById } from '@fastgpt/service/core/customerService/knowledge/entity';
import { submitCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 提交知识审核；提交人需同时拥有客服编辑岗位和 dataset 写权限。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeSubmitResponse> {
  const { knowledgeId } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeSubmitBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor
    ]
  });
  const knowledge = await findCustomerServiceKnowledgeById({ teamId, knowledgeId });
  if (!knowledge) throw new UserError('Customer service knowledge not found');
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: [String(knowledge.datasetId)],
    mode: 'write'
  });
  await submitCustomerServiceKnowledge({ teamId, tmbId, knowledgeId });
  return CustomerServiceAdminKnowledgeSubmitResponseSchema.parse(undefined);
}

export default NextAPI(handler);
