import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import { syncManagedCustomerServiceWorkflowDatasets } from '@/service/customerService/managedProject';
import {
  CustomerServiceAdminProjectSyncWorkflowBodySchema,
  CustomerServiceAdminProjectSyncWorkflowResponseSchema,
  type CustomerServiceAdminProjectSyncWorkflowResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { findCustomerServiceProjectById } from '@fastgpt/service/core/customerService/project/entity';
import { UserError } from '@fastgpt/global/common/error/utils';
import { listProductModelsByIds } from '@fastgpt/service/core/customerService/product/entity';

/** 管理员手动重试产品知识库到托管客服工作流的同步。 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminProjectSyncWorkflowResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminProjectSyncWorkflowBodySchema
  });
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  const project = await findCustomerServiceProjectById({ teamId, projectId: body.projectId });
  if (!project) throw new UserError('Customer service project not found');
  await authCustomerServiceAppManage({ tmbId, appId: String(project.appId), isRoot });
  const models = await listProductModelsByIds({
    teamId,
    ids: project.modelIds.map(String)
  });
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: Array.from(new Set(models.flatMap((model) => model.datasetIds.map(String)))),
    mode: 'manage'
  });

  return CustomerServiceAdminProjectSyncWorkflowResponseSchema.parse(
    await syncManagedCustomerServiceWorkflowDatasets({
      teamId,
      tmbId,
      projectId: body.projectId
    })
  );
}

export default NextAPI(handler);
