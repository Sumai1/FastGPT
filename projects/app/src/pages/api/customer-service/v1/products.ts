import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceExternalRequest } from '@/service/customerService/externalAuth';
import { formatCustomerServiceProductCatalog } from '@/service/customerService/format';
import {
  CustomerServiceProductsResponseSchema,
  type CustomerServiceProductsResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listActiveProductCatalog } from '@fastgpt/service/core/customerService/product/entity';

/** 返回当前客服 Key 绑定项目可选的启用产品树。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceProductsResponse> {
  const { teamId, project } = await authCustomerServiceExternalRequest(req);
  const catalog = formatCustomerServiceProductCatalog(
    await listActiveProductCatalog({
      teamId,
      modelIds: project.modelIds.map(String)
    })
  );
  const seriesIds = new Set(catalog.models.map((item) => item.seriesId));
  const filteredSeries = catalog.series.filter((item) => seriesIds.has(item.id));
  const categoryIds = new Set(filteredSeries.map((item) => item.categoryId));

  return CustomerServiceProductsResponseSchema.parse({
    ...catalog,
    categories: catalog.categories.filter((item) => categoryIds.has(item.id)),
    series: filteredSeries,
    projectId: String(project._id),
    projectName: project.name,
    welcomeText: project.welcomeText,
    recommendedQuestions: project.recommendedQuestions
  });
}

export default NextAPI(handler);
