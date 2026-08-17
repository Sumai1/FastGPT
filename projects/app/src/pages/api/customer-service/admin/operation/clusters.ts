import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceAppIds
} from '@/service/customerService/adminAuth';
import { aggregateCustomerServiceOperationClusters } from '@/service/customerService/operations';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminOperationClustersBodySchema,
  CustomerServiceAdminOperationClustersResponseSchema,
  type CustomerServiceAdminOperationClustersResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { listCustomerServiceProjects } from '@fastgpt/service/core/customerService/project/entity';

/**
 * Badcase 与未解决问题聚类分析 API。
 *
 * 提取点踩、未回答、低置信度以及转人工的客服请求，执行模式识别与模式主题聚类，
 * 输出聚类卡片与具有代表性的 Badcase 记录供一键转知识治理。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminOperationClustersResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminOperationClustersBodySchema
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

  return CustomerServiceAdminOperationClustersResponseSchema.parse(
    await aggregateCustomerServiceOperationClusters({
      teamId,
      input: body,
      projectIds: readableProjectIds
    })
  );
}

export default NextAPI(handler);
