import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceAppIds
} from '@/service/customerService/adminAuth';
import { formatCustomerServiceProjects } from '@/service/customerService/format';
import {
  CustomerServiceAdminProjectListResponseSchema,
  type CustomerServiceAdminProjectListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listCustomerServiceKeyBindings } from '@fastgpt/service/core/customerService/project/entity';
import { listCustomerServiceProjectsWithPublicId } from '@fastgpt/service/core/customerService/project/service';
import {
  getManagedCustomerServiceDeliveryReadiness,
  getManagedCustomerServiceWorkflowReadiness
} from '@/service/customerService/managedProject';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';

/** 获取当前团队的客服项目和 Key 绑定。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminProjectListResponse> {
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: Object.values(CustomerServiceMemberRoleEnum)
  });
  const [allProjects, allKeyBindings] = await Promise.all([
    listCustomerServiceProjectsWithPublicId({ teamId }),
    listCustomerServiceKeyBindings({ teamId })
  ]);
  const readableAppIds = new Set(
    await filterCustomerServiceAppIds({
      appIds: allProjects.map((project) => String(project.appId)),
      tmbId,
      isRoot
    })
  );
  const projects = allProjects.filter((project) => readableAppIds.has(String(project.appId)));
  const keyBindings = allKeyBindings.filter((binding) =>
    projects.some((project) => String(project._id) === String(binding.projectId))
  );
  const ownedKeys = await MongoOpenApi.find({
    _id: { $in: keyBindings.map((item) => item.openApiKeyId) },
    teamId,
    tmbId
  })
    .select('_id')
    .lean();
  const readiness = await Promise.all(
    projects.map((project) =>
      getManagedCustomerServiceWorkflowReadiness({
        teamId,
        projectId: String(project._id)
      }).catch(() => ({
        status: 'error' as const,
        expectedDatasetCount: 0,
        workflowDatasetCount: 0,
        message: '工作流就绪检查失败，请手动重试',
        checkedAt: new Date()
      }))
    )
  );
  const deliveryReadiness = await Promise.all(
    projects.map((project, index) =>
      getManagedCustomerServiceDeliveryReadiness({
        teamId,
        projectId: String(project._id),
        workflowReadiness: readiness[index]
      }).catch(() => ({
        ready: false,
        checks: {
          projectActive: false,
          appExists: false,
          standardWorkflow: false,
          datasetScope: false,
          aiModel: false,
          publishedKnowledge: false,
          keyBinding: false
        },
        messages: ['客服就绪检查失败，请刷新后重试'],
        checkedAt: new Date()
      }))
    )
  );
  const formatted = formatCustomerServiceProjects({
    projects,
    keyBindings,
    visibleOpenApiKeyIds: new Set(ownedKeys.map((item) => String(item._id)))
  });
  return CustomerServiceAdminProjectListResponseSchema.parse({
    ...formatted,
    projects: formatted.projects.map((project, index) => ({
      ...project,
      workflowReadiness: readiness[index],
      deliveryReadiness: deliveryReadiness[index]
    }))
  });
}

export default NextAPI(handler);
