import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminProjectCreateBodySchema,
  CustomerServiceAdminProjectCreateResponseSchema,
  type CustomerServiceAdminProjectCreateResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findProductModelById } from '@fastgpt/service/core/customerService/product/entity';
import { createCustomerServiceProjectWithApp } from '@fastgpt/service/core/customerService/project/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 创建客服项目，只允许引用有管理权限的 App 和本团队产品型号。 */
export async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminProjectCreateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminProjectCreateBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  await authCustomerServiceAppManage({ tmbId, appId: body.appId, isRoot });
  const models = await Promise.all(body.modelIds.map((id) => findProductModelById({ teamId, id })));
  if (models.some((item) => !item)) {
    throw new UserError('Customer service product model not found');
  }
  // A project exposes every Dataset bound to its selected product models.
  // Require native Manage permission before creating the reference; checking
  // only the App would otherwise let an App admin widen a project to a
  // Dataset they cannot administer.
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds: models.flatMap((item) => item?.datasetIds.map(String) ?? []),
    mode: 'manage'
  });
  const project = await createCustomerServiceProjectWithApp({
    teamId,
    tmbId,
    ...body,
    sessionRetentionDays: body.sessionRetentionDays ?? undefined
  });
  return CustomerServiceAdminProjectCreateResponseSchema.parse({ id: String(project._id) });
}

export default NextAPI(handler);
