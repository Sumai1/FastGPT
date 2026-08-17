import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeUpdateBodySchema,
  CustomerServiceAdminKnowledgeUpdateResponseSchema,
  type CustomerServiceAdminKnowledgeUpdateResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findCustomerServiceKnowledgeById } from '@fastgpt/service/core/customerService/knowledge/entity';
import { updateCustomerServiceKnowledgeDraft } from '@fastgpt/service/core/customerService/knowledge/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 编辑治理草稿；业务岗位和原生 dataset 写权限均在服务端强制校验。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeUpdateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeUpdateBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor
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
    mode: 'write'
  });
  await updateCustomerServiceKnowledgeDraft({ teamId, tmbId, ...body });

  return CustomerServiceAdminKnowledgeUpdateResponseSchema.parse(undefined);
}

export default NextAPI(handler);
