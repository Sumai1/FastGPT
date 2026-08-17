import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminBindDatasetsBodySchema,
  CustomerServiceAdminBindDatasetsResponseSchema,
  type CustomerServiceAdminBindDatasetsResponse
} from '@fastgpt/global/openapi/customerService/api';
import { bindCustomerServiceModelDatasets } from '@fastgpt/service/core/customerService/product/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';
import { listCustomerServiceProjectsByModelId } from '@fastgpt/service/core/customerService/project/entity';
import { syncManagedCustomerServiceWorkflowDatasets } from '@/service/customerService/managedProject';
import { listProductModelsByIds } from '@fastgpt/service/core/customerService/product/entity';

/** 替换型号与现有知识库的引用绑定，不复制知识数据。 */
export async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminBindDatasetsResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminBindDatasetsBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: body.datasetIds,
    // Changing a model's retrieval scope is a governance operation, not a
    // content edit. Require native Dataset Manage permission before any
    // reference is changed.
    mode: 'manage'
  });
  const projects = await listCustomerServiceProjectsByModelId({ teamId, modelId: body.modelId });
  const existingModels = await listProductModelsByIds({
    teamId,
    ids: Array.from(new Set(projects.flatMap((project) => project.modelIds.map(String))))
  });
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: Array.from(
      new Set(existingModels.flatMap((model) => model.datasetIds.map(String)))
    ),
    mode: 'manage'
  });

  // Preflight every referenced App before mutating the model. The previous
  // implementation discovered App permission failures only inside the
  // post-write sync task, leaving an unauthorized binding in place.
  await Promise.all(
    projects.map((project) =>
      authCustomerServiceAppManage({
        tmbId,
        appId: String(project.appId),
        isRoot
      })
    )
  );

  const model = await bindCustomerServiceModelDatasets({ teamId, tmbId, ...body });
  if (!model) throw new UserError('Customer service product model not found');

  const syncResults = await Promise.allSettled(
    projects.map(async (project) => {
      return syncManagedCustomerServiceWorkflowDatasets({
        teamId,
        tmbId,
        projectId: String(project._id)
      });
    })
  );

  return CustomerServiceAdminBindDatasetsResponseSchema.parse({
    syncedProjects: syncResults.filter((result) => result.status === 'fulfilled').length,
    failedProjects: syncResults.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            {
              projectId: String(projects[index]._id),
              name: projects[index].name,
              message: result.reason instanceof Error ? result.reason.message : '工作流同步失败'
            }
          ]
        : []
    )
  });
}

export default NextAPI(handler);
