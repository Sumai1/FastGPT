import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeCreateBodySchema,
  CustomerServiceAdminKnowledgeCreateResponseSchema,
  type CustomerServiceAdminKnowledgeCreateResponse
} from '@fastgpt/global/openapi/customerService/api';
import { createCustomerServiceKnowledgeDraft } from '@fastgpt/service/core/customerService/knowledge/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 为现有 collection 建立引用式治理草稿，并沿用 dataset 原生写权限。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeCreateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeCreateBodySchema
  }).body;
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
  const knowledge = await createCustomerServiceKnowledgeDraft({
    teamId,
    tmbId,
    ...body,
    effectiveFrom: body.effectiveFrom ?? undefined,
    effectiveTo: body.effectiveTo ?? undefined
  });
  return CustomerServiceAdminKnowledgeCreateResponseSchema.parse({
    id: String(knowledge._id)
  });
}

export default NextAPI(handler);
