import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceStopHandler } from '@/pages/api/customer-service/v1/stop';
import {
  authCustomerServiceInternalProject,
  hashCustomerServiceInternalRequestId
} from '@/service/customerService/internalAuth';
import {
  clearCustomerServiceInternalProxyProject,
  setCustomerServiceInternalProxyProject
} from '@/service/customerService/context';
import {
  CustomerServiceInternalStopBodySchema,
  type CustomerServiceStopResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 站内停止代理；复用登录成员权限并仅在服务端注入客服专用 Key。 */
export async function handler(req: NextApiRequest): Promise<CustomerServiceStopResponse> {
  const { projectId, requestId, sessionId } = parseApiInput({
    req,
    bodySchema: CustomerServiceInternalStopBodySchema
  }).body;
  const { auth, openApiKey } = await authCustomerServiceInternalProject({ req, projectId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;

  try {
    req.body = {
      requestId: hashCustomerServiceInternalRequestId({
        tmbId: auth.tmbId,
        requestId
      }),
      sessionId
    };
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServiceInternalProxyProject({ req, projectId });
    return await customerServiceStopHandler(req);
  } finally {
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServiceInternalProxyProject(req);
  }
}

export default NextAPI(handler);
