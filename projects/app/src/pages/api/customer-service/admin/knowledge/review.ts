import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceDatasets,
  authCustomerServiceRoles
} from '@/service/customerService/adminAuth';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeReviewBodySchema,
  CustomerServiceAdminKnowledgeReviewResponseSchema,
  type CustomerServiceAdminKnowledgeReviewResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findCustomerServiceKnowledgeById } from '@fastgpt/service/core/customerService/knowledge/entity';
import {
  publishCustomerServiceKnowledge,
  rejectCustomerServiceKnowledge
} from '@fastgpt/service/core/customerService/knowledge/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 审核知识；审核岗位与 dataset 管理权限缺一不可，业务层继续强制禁止自审。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeReviewResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeReviewBodySchema
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

  if (body.action === 'publish') {
    await publishCustomerServiceKnowledge({
      teamId,
      reviewerTmbId: tmbId,
      knowledgeId: body.knowledgeId
    });
  } else {
    await rejectCustomerServiceKnowledge({
      teamId,
      reviewerTmbId: tmbId,
      knowledgeId: body.knowledgeId,
      reason: body.reason
    });
  }
  return CustomerServiceAdminKnowledgeReviewResponseSchema.parse(undefined);
}

export default NextAPI(handler);
