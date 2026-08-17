import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminKeyUpdateBodySchema,
  CustomerServiceAdminKeyUpdateResponseSchema,
  type CustomerServiceAdminKeyUpdateResponse
} from '@fastgpt/global/openapi/customerService/api';
import {
  findCustomerServiceKeyBindingById,
  findCustomerServiceProjectById
} from '@fastgpt/service/core/customerService/project/entity';
import { updateCustomerServiceKeyBindingStatus } from '@fastgpt/service/core/customerService/project/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';
import { authOpenApiKeyCrud } from '@fastgpt/service/support/permission/auth/openapi';

/** 启停客服 Key 绑定，并叠加所属项目 App 管理权限。 */
export async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKeyUpdateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKeyUpdateBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  const binding = await findCustomerServiceKeyBindingById({
    teamId,
    bindingId: body.bindingId
  });
  if (!binding) throw new UserError('Customer service key binding not found');
  const project = await findCustomerServiceProjectById({
    teamId,
    projectId: String(binding.projectId)
  });
  if (!project) throw new UserError('Customer service project not found');
  await authCustomerServiceAppManage({ tmbId, appId: String(project.appId), isRoot });
  // A team/App administrator must not be able to operate a Key created by
  // another member. Keep the native OpenAPI Key ownership boundary in force
  // for both bind and subsequent status changes.
  await authOpenApiKeyCrud({
    req,
    authToken: true,
    id: String(binding.openApiKeyId)
  });
  const updated = await updateCustomerServiceKeyBindingStatus({ teamId, tmbId, ...body });
  if (!updated) throw new UserError('Customer service key binding not found');

  return CustomerServiceAdminKeyUpdateResponseSchema.parse(undefined);
}

export default NextAPI(handler);
