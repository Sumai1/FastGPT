import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceFeedbackHandler } from '@/pages/api/customer-service/v1/feedback';
import { authCustomerServicePublicProject } from '@/service/customerService/publicAuth';
import {
  clearCustomerServicePublicProxyProject,
  setCustomerServicePublicProxyProject
} from '@/service/customerService/context';
import { CustomerServicePublicFeedbackBodySchema } from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 正式客户反馈代理；复用消息归属校验并支持独立的“问题未解决”标记。 */
export async function handler(req: NextApiRequest) {
  const { publicId, ...body } = parseApiInput({
    req,
    bodySchema: CustomerServicePublicFeedbackBodySchema
  }).body;
  const { projectId, openApiKey } = await authCustomerServicePublicProject({ publicId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;

  try {
    req.body = body;
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServicePublicProxyProject({ req, projectId });
    return await customerServiceFeedbackHandler(req);
  } finally {
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServicePublicProxyProject(req);
  }
}

export default NextAPI(handler);
