import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminProductCreateBodySchema,
  CustomerServiceAdminProductCreateResponseSchema,
  type CustomerServiceAdminProductCreateResponse
} from '@fastgpt/global/openapi/customerService/api';
import {
  createCustomerServiceProductCategory,
  createCustomerServiceProductModel,
  createCustomerServiceProductSeries,
  createCustomerServiceProductVersion
} from '@fastgpt/service/core/customerService/product/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 创建产品树资源，型号绑定知识库时同步执行原生 dataset 写权限校验。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminProductCreateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminProductCreateBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);

  const resource = await (async () => {
    if (body.resourceType === 'category') {
      return createCustomerServiceProductCategory({ teamId, tmbId, ...body });
    }
    if (body.resourceType === 'series') {
      return createCustomerServiceProductSeries({ teamId, tmbId, ...body });
    }
    if (body.resourceType === 'model') {
      await authCustomerServiceDatasets({
        tmbId,
        isRoot,
        datasetIds: body.datasetIds,
        mode: 'write'
      });
      return createCustomerServiceProductModel({ teamId, tmbId, ...body });
    }
    return createCustomerServiceProductVersion({
      teamId,
      tmbId,
      ...body,
      effectiveFrom: body.effectiveFrom ?? undefined,
      effectiveTo: body.effectiveTo ?? undefined
    });
  })();

  return CustomerServiceAdminProductCreateResponseSchema.parse({ id: String(resource._id) });
}

export default NextAPI(handler);
