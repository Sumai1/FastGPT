import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminProductUpdateBodySchema,
  CustomerServiceAdminProductUpdateResponseSchema,
  type CustomerServiceAdminProductUpdateResponse
} from '@fastgpt/global/openapi/customerService/api';
import { updateCustomerServiceProductResource } from '@fastgpt/service/core/customerService/product/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 更新产品树资源；资源类型参与限定，避免跨集合误更新同名 ID。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminProductUpdateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminProductUpdateBodySchema
  }).body;
  const { teamId, tmbId } = await authCustomerServiceAdmin(req);
  const updated = await updateCustomerServiceProductResource({
    teamId,
    tmbId,
    ...body
  });
  if (!updated) throw new UserError('Customer service product resource not found');

  return CustomerServiceAdminProductUpdateResponseSchema.parse(undefined);
}

export default NextAPI(handler);
