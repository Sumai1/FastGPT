import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceRoles } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminHealthResponseSchema,
  type CustomerServiceAdminHealthResponse
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { connectionMongo } from '@fastgpt/service/common/mongo';

/** 汇总客服运行所需的 Mongo、LLM 和向量模型状态，不暴露模型地址或密钥。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminHealthResponse> {
  await authCustomerServiceRoles({ req, roles: Object.values(CustomerServiceMemberRoleEnum) });
  const mongoConnected = connectionMongo.connection.readyState === 1;
  const llmModelCount = global.llmModelMap?.size ?? 0;
  const embeddingModelCount = global.embeddingModelMap?.size ?? 0;
  const messages = [
    ...(!mongoConnected ? ['MongoDB 未连接'] : []),
    ...(llmModelCount === 0 ? ['没有可用的对话模型'] : []),
    ...(embeddingModelCount === 0 ? ['没有可用的向量模型'] : [])
  ];

  return CustomerServiceAdminHealthResponseSchema.parse({
    status: messages.length === 0 ? 'ok' : 'degraded',
    mongoConnected,
    llmModelCount,
    embeddingModelCount,
    messages,
    checkedAt: new Date()
  });
}

export default NextAPI(handler);
