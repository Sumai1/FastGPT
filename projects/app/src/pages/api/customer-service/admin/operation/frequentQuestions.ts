import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceAppIds
} from '@/service/customerService/adminAuth';
import { listCustomerServiceFrequentQuestions } from '@/service/customerService/operations';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminFrequentQuestionListBodySchema,
  CustomerServiceAdminFrequentQuestionListResponseSchema,
  type CustomerServiceAdminFrequentQuestionListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { listCustomerServiceProjects } from '@fastgpt/service/core/customerService/project/entity';

/** 聚合当前成员有权读取日志的客服项目高频问题。 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminFrequentQuestionListResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminFrequentQuestionListBodySchema
  });
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor,
      CustomerServiceMemberRoleEnum.knowledgeReviewer
    ]
  });
  const projects = await listCustomerServiceProjects({ teamId });
  const readableAppIds = new Set(
    await filterCustomerServiceAppIds({
      appIds: projects.map((project) => String(project.appId)),
      tmbId,
      isRoot
    })
  );
  const readableProjectIds = projects
    .filter((project) => readableAppIds.has(String(project.appId)))
    .map((project) => String(project._id));

  return CustomerServiceAdminFrequentQuestionListResponseSchema.parse(
    await listCustomerServiceFrequentQuestions({
      teamId,
      input: body,
      projectIds: readableProjectIds
    })
  );
}

export default NextAPI(handler);
