import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceFeedbackHandler } from '@/pages/api/customer-service/v1/feedback';
import { authCustomerServiceInternalProject } from '@/service/customerService/internalAuth';
import {
  clearCustomerServiceInternalProxyProject,
  setCustomerServiceInternalProxyProject
} from '@/service/customerService/context';
import { CustomerServiceInternalFeedbackBodySchema } from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 站内客服反馈代理；复用外部反馈归属校验且不向浏览器暴露 Key。 */
async function handler(req: NextApiRequest) {
  const { projectId, ...body } = parseApiInput({
    req,
    bodySchema: CustomerServiceInternalFeedbackBodySchema
  }).body;
  const { openApiKey } = await authCustomerServiceInternalProject({ req, projectId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;
  try {
    req.body = body;
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServiceInternalProxyProject({ req, projectId });
    return await customerServiceFeedbackHandler(req);
  } finally {
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServiceInternalProxyProject(req);
  }
}

export default NextAPI(handler);
