import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServicePublicProject } from '@/service/customerService/publicAuth';
import { formatCustomerServicePublicProductCatalog } from '@/service/customerService/format';
import {
  CustomerServicePublicBootstrapQuerySchema,
  CustomerServicePublicBootstrapResponseSchema,
  type CustomerServicePublicBootstrapResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listActiveProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 返回正式客户页面需要的单个项目配置和 public 产品树，不暴露项目 ID 或 Key。 */
export async function handler(
  req: NextApiRequest
): Promise<CustomerServicePublicBootstrapResponse> {
  const { publicId } = parseApiInput({
    req,
    querySchema: CustomerServicePublicBootstrapQuerySchema
  }).query;
  const { teamId, project } = await authCustomerServicePublicProject({ publicId });
  const catalog = formatCustomerServicePublicProductCatalog(
    await listActiveProductCatalog({
      teamId,
      modelIds: project.modelIds.map(String)
    })
  );

  return CustomerServicePublicBootstrapResponseSchema.parse({
    project: {
      publicId,
      name: project.name,
      welcomeText: project.welcomeText,
      recommendedQuestions: project.recommendedQuestions,
      humanContact: project.humanContact
    },
    catalog
  });
}

export default NextAPI(handler);
