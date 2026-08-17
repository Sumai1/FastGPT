import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as customerServiceChatHandler } from '@/pages/api/customer-service/v1/chat';
import {
  authCustomerServicePublicProject,
  buildCustomerServicePublicProxyBody
} from '@/service/customerService/publicAuth';
import {
  clearCustomerServicePublicProxyProject,
  setCustomerServicePublicProxyProject
} from '@/service/customerService/context';
import {
  createCustomerServicePublicChatStream,
  writeCustomerServicePublicChatResponse
} from '@/service/customerService/publicResponse';
import {
  CustomerServicePublicChatBodySchema,
  type CustomerServicePublicChatResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/**
 * 正式客户聊天同源代理。底层 v1 handler 只生成非流式内部结果，公开边界随后统一脱敏并按原请求
 * 输出 JSON 或 SSE，浏览器因此不会收到 dataset、collection、chunk 或产品 ObjectId。
 */
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<CustomerServicePublicChatResponse | void> {
  const { publicId, ...body } = parseApiInput({
    req,
    bodySchema: CustomerServicePublicChatBodySchema
  }).body;
  const stream = body.stream;
  const { projectId, openApiKey } = await authCustomerServicePublicProject({ publicId });
  const originalBody = req.body;
  const originalAuthorization = req.headers.authorization;
  let streamResponse: ReturnType<typeof createCustomerServicePublicChatStream> | undefined;

  const startStreamResponse = () => {
    if (!stream || streamResponse) return;
    streamResponse = createCustomerServicePublicChatStream({ res });
  };

  try {
    // v1 本身会在 SSE 末尾写入完整内部响应，因此公开代理必须先强制取得非流式结果。
    req.body = { ...buildCustomerServicePublicProxyBody({ body }), stream: false };
    req.headers.authorization = `Bearer ${openApiKey.apiKey}`;
    setCustomerServicePublicProxyProject({
      req,
      projectId,
      onProcessing: startStreamResponse
    });
    const response = await customerServiceChatHandler(req, res);
    if (!response) return;
    if (!stream) return writeCustomerServicePublicChatResponse({ res, response, stream: false });

    startStreamResponse();
    streamResponse?.finish(response);
  } catch (error) {
    if (!streamResponse) throw error;
    streamResponse.fail(error);
  } finally {
    streamResponse?.cleanup();
    req.body = originalBody;
    req.headers.authorization = originalAuthorization;
    clearCustomerServicePublicProxyProject(req);
  }
}

export default NextAPI(handler);

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: '10mb'
  }
};
