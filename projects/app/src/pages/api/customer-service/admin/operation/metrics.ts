import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceAppIds
} from '@/service/customerService/adminAuth';
import { aggregateCustomerServiceOperationMetrics } from '@/service/customerService/operations';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminOperationMetricsBodySchema,
  CustomerServiceAdminOperationMetricsResponseSchema,
  type CustomerServiceAdminOperationMetricsResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { listCustomerServiceProjects } from '@fastgpt/service/core/customerService/project/entity';

/**
 * 运营大盘与效能指标聚合 API。
 *
 * 汇总当前团队客服会话的 Token/积分消耗、平均响应耗时、问题解决率、转人工率及转人工原因归因。
 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminOperationMetricsResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminOperationMetricsBodySchema
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

  return CustomerServiceAdminOperationMetricsResponseSchema.parse(
    await aggregateCustomerServiceOperationMetrics({
      teamId,
      input: body,
      projectIds: readableProjectIds
    })
  );
}

export default NextAPI(handler);
