import { createHash } from 'node:crypto';
import { UserError } from '@fastgpt/global/common/error/utils';
import { CustomerServiceAudienceEnum } from '@fastgpt/global/core/customerService/constants';
import type { CustomerServicePublicChatBody } from '@fastgpt/global/openapi/customerService/api';
import {
  findActiveCustomerServiceKeyBindingByProjectId,
  findActiveCustomerServiceProjectByPublicId
} from '@fastgpt/service/core/customerService/project/entity';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';

/**
 * 解析正式客户页面的公开项目和服务端专用 Key。公开标识由服务端随机生成并由数据库保证
 * 全局唯一；实际访问范围仍由启用项目、Key binding、public 受众和知识白名单共同约束。
 */
export const authCustomerServicePublicProject = async ({ publicId }: { publicId: string }) => {
  const project = await findActiveCustomerServiceProjectByPublicId({ publicId });
  if (!project) throw new UserError('Customer service project is unavailable');

  const teamId = String(project.teamId);
  const projectId = String(project._id);
  const binding = await findActiveCustomerServiceKeyBindingByProjectId({ teamId, projectId });
  if (!binding) throw new UserError('Customer service project has no active API key');

  const openApiKey = await MongoOpenApi.findOne({
    _id: binding.openApiKeyId,
    teamId
  })
    .select('apiKey')
    .lean();
  if (!openApiKey) throw new UserError('Customer service API key is unavailable');

  return { teamId, projectId, project, binding, openApiKey };
};

/** 将浏览器幂等 ID 绑定到访客会话，聊天与停止代理必须使用完全相同的映射。 */
export const hashCustomerServicePublicRequestId = ({
  sessionId,
  requestId
}: {
  sessionId: string;
  requestId: string;
}) => createHash('sha256').update(`${sessionId}:${requestId}`).digest('hex').slice(0, 32);

/**
 * 构造公开代理转交给客服 OpenAPI 的可信请求体。公开入口强制 public；幂等 ID 同时绑定会话，
 * 避免不同访客偶然使用相同浏览器 requestId 时互相冲突。
 */
export const buildCustomerServicePublicProxyBody = ({
  body
}: {
  body: Omit<CustomerServicePublicChatBody, 'publicId'>;
}) => ({
  ...body,
  audience: CustomerServiceAudienceEnum.public,
  externalUserId: `public:${body.sessionId ?? 'new-session'}`,
  ...(body.requestId && {
    requestId: hashCustomerServicePublicRequestId({
      sessionId: body.sessionId ?? '',
      requestId: body.requestId
    })
  })
});
