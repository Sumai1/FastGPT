import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminKeyBindBodySchema,
  CustomerServiceAdminKeyBindResponseSchema,
  type CustomerServiceAdminKeyBindResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findCustomerServiceProjectById } from '@fastgpt/service/core/customerService/project/entity';
import { bindCustomerServiceOpenApiKey } from '@fastgpt/service/core/customerService/project/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';
import { authOpenApiKeyCrud } from '@fastgpt/service/support/permission/auth/openapi';

/** 将现有 OpenAPI Key 绑定客服项目，并保留原 Key 的额度、有效期和所属团队约束。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKeyBindResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKeyBindBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  const project = await findCustomerServiceProjectById({ teamId, projectId: body.projectId });
  if (!project) throw new UserError('Customer service project not found');
  await authCustomerServiceAppManage({
    tmbId,
    appId: String(project.appId),
    isRoot
  });
  await authOpenApiKeyCrud({
    req,
    authToken: true,
    id: body.openApiKeyId
  });
  const binding = await bindCustomerServiceOpenApiKey({ teamId, tmbId, ...body });
  return CustomerServiceAdminKeyBindResponseSchema.parse({ id: String(binding._id) });
}

export default NextAPI(handler);
