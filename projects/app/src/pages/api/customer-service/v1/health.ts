import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceExternalRequest } from '@/service/customerService/externalAuth';
import {
  CustomerServiceHealthResponseSchema,
  type CustomerServiceHealthResponse
} from '@fastgpt/global/openapi/customerService/api';

/** 校验客服 Key、项目和 App 是否可用。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceHealthResponse> {
  const { project, app } = await authCustomerServiceExternalRequest(req);
  return CustomerServiceHealthResponseSchema.parse({
    status: 'ok',
    projectId: String(project._id),
    appId: String(app._id),
    systemVersion: global.systemVersion || 'unknown',
    timestamp: new Date()
  });
}

export default NextAPI(handler);
