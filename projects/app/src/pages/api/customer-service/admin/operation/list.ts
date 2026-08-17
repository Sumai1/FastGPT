import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceAppIds
} from '@/service/customerService/adminAuth';
import { listCustomerServiceOperations } from '@/service/customerService/operations';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminOperationListBodySchema,
  CustomerServiceAdminOperationListResponseSchema,
  type CustomerServiceAdminOperationListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { listCustomerServiceProjects } from '@fastgpt/service/core/customerService/project/entity';

/** 获取当前团队的客服请求、回答、反馈、引用和用量汇总。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminOperationListResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminOperationListBodySchema
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
  return CustomerServiceAdminOperationListResponseSchema.parse(
    await listCustomerServiceOperations({
      teamId,
      input: body,
      projectIds: readableProjectIds
    })
  );
}

export default NextAPI(handler);
