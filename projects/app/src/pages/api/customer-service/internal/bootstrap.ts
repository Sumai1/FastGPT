import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { listCustomerServiceInternalProjects } from '@/service/customerService/internalAuth';
import { formatCustomerServiceProductCatalog } from '@/service/customerService/format';
import {
  CustomerServiceInternalBootstrapQuerySchema,
  CustomerServiceInternalBootstrapResponseSchema,
  type CustomerServiceInternalBootstrapResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listActiveProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 初始化站内客服项目和产品选择器。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceInternalBootstrapResponse> {
  const { projectId } = parseApiInput({
    req,
    querySchema: CustomerServiceInternalBootstrapQuerySchema
  }).query;
  const { auth, projects } = await listCustomerServiceInternalProjects(req);
  const selectedProject = projectId
    ? projects.find((item) => String(item._id) === projectId)
    : projects[0];
  if (projectId && !selectedProject) {
    throw new UserError('Customer service project permission denied');
  }

  const catalog = selectedProject
    ? formatCustomerServiceProductCatalog(
        await listActiveProductCatalog({
          teamId: auth.teamId,
          modelIds: selectedProject.modelIds.map(String)
        })
      )
    : { categories: [], series: [], models: [], versions: [] };

  return CustomerServiceInternalBootstrapResponseSchema.parse({
    projects: projects.map((item) => ({
      id: String(item._id),
      name: item.name,
      welcomeText: item.welcomeText,
      recommendedQuestions: item.recommendedQuestions,
      humanContact: item.humanContact
    })),
    selectedProjectId: selectedProject ? String(selectedProject._id) : undefined,
    catalog
  });
}

export default NextAPI(handler);
