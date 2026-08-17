import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceStopHandler } from '@/pages/api/customer-service/v1/stop';
import {
  authCustomerServicePublicProject,
  hashCustomerServicePublicRequestId
} from '@/service/customerService/publicAuth';
import {
  clearCustomerServicePublicProxyProject,
  setCustomerServicePublicProxyProject
} from '@/service/customerService/context';
import {
  CustomerServicePublicStopBodySchema,
  type CustomerServiceStopResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 正式客户停止代理；服务端完成请求 ID 映射和 Key 注入，浏览器不接触专用 Key。 */
export async function handler(req: NextApiRequest): Promise<CustomerServiceStopResponse> {
  const { publicId, requestId, sessionId } = parseApiInput({
    req,
    bodySchema: CustomerServicePublicStopBodySchema
  }).body;
  const { projectId, openApiKey } = await authCustomerServicePublicProject({ publicId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;

  try {
    req.body = {
      requestId: hashCustomerServicePublicRequestId({ sessionId, requestId }),
      sessionId
    };
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServicePublicProxyProject({ req, projectId });
    return await customerServiceStopHandler(req);
  } finally {
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServicePublicProxyProject(req);
  }
}

export default NextAPI(handler);
