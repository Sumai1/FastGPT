import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceChatHandler } from '@/pages/api/customer-service/v1/chat';
import {
  authCustomerServiceInternalProject,
  hashCustomerServiceInternalRequestId
} from '@/service/customerService/internalAuth';
import {
  clearCustomerServiceInternalProxyProject,
  setCustomerServiceInternalProxyProject
} from '@/service/customerService/context';
import { CustomerServiceInternalChatBodySchema } from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/** 站内客服服务端代理；Key 只写入当前内存请求头，不返回浏览器。 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { projectId, ...body } = parseApiInput({
    req,
    bodySchema: CustomerServiceInternalChatBodySchema
  }).body;
  const { auth, openApiKey } = await authCustomerServiceInternalProject({ req, projectId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;
  try {
    req.body = {
      ...body,
      externalUserId: `internal:${auth.tmbId}`,
      ...(body.requestId && {
        requestId: hashCustomerServiceInternalRequestId({
          tmbId: auth.tmbId,
          requestId: body.requestId
        })
      })
    };
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServiceInternalProxyProject({ req, projectId });
    return await customerServiceChatHandler(req, res);
  } finally {
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServiceInternalProxyProject(req);
  }
}

export default NextAPI(handler);

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: '10mb'
  }
};
