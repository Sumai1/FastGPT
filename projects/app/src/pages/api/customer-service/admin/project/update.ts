import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceAppManage,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminProjectUpdateBodySchema,
  CustomerServiceAdminProjectUpdateResponseSchema,
  type CustomerServiceAdminProjectUpdateResponse
} from '@fastgpt/global/openapi/customerService/api';
import { findProductModelById } from '@fastgpt/service/core/customerService/product/entity';
import { findCustomerServiceProjectById } from '@fastgpt/service/core/customerService/project/entity';
import { updateCustomerServiceProjectConfig } from '@fastgpt/service/core/customerService/project/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 更新客服项目配置，并重新校验原 App 及新增型号的资源权限和归属。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminProjectUpdateResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminProjectUpdateBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceAdmin(req);
  const project = await findCustomerServiceProjectById({ teamId, projectId: body.projectId });
  if (!project) throw new UserError('Customer service project not found');
  await authCustomerServiceAppManage({
    tmbId,
    appId: String(project.appId),
    isRoot
  });
  if (body.modelIds) {
    const models = await Promise.all(
      body.modelIds.map((id) => findProductModelById({ teamId, id }))
    );
    if (models.some((item) => !item)) {
      throw new UserError('Customer service product model not found');
    }
    await authCustomerServiceDatasets({
      tmbId,
      isRoot,
      datasetIds: Array.from(new Set(models.flatMap((item) => item?.datasetIds.map(String) ?? []))),
      mode: 'manage'
    });
  }
  const updated = await updateCustomerServiceProjectConfig({ teamId, tmbId, ...body });
  if (!updated) throw new UserError('Customer service project not found');
  return CustomerServiceAdminProjectUpdateResponseSchema.parse(undefined);
}

export default NextAPI(handler);
