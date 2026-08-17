import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceDatasetIds
} from '@/service/customerService/adminAuth';
import { formatCustomerServiceProductCatalog } from '@/service/customerService/format';
import {
  CustomerServiceAdminProductListResponseSchema,
  type CustomerServiceAdminProductListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';

/** 获取当前团队客服产品目录。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminProductListResponse> {
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: Object.values(CustomerServiceMemberRoleEnum)
  });
  const catalog = await listProductCatalog({ teamId });
  const readableDatasetIds = new Set(
    await filterCustomerServiceDatasetIds({
      datasetIds: catalog[2].flatMap((model) => model.datasetIds.map(String)),
      tmbId,
      isRoot
    })
  );
  const filteredModels = catalog[2].map((model) => ({
    ...model,
    datasetIds: model.datasetIds.filter((datasetId) => readableDatasetIds.has(String(datasetId)))
  }));
  return CustomerServiceAdminProductListResponseSchema.parse(
    formatCustomerServiceProductCatalog([catalog[0], catalog[1], filteredModels, catalog[3]])
  );
}

export default NextAPI(handler);
