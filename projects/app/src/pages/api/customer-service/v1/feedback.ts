import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceExternalRequest } from '@/service/customerService/externalAuth';
import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import {
  CustomerServiceFeedbackBodySchema,
  CustomerServiceFeedbackResponseSchema,
  type CustomerServiceFeedbackResponse
} from '@fastgpt/global/openapi/customerService/api';
import { updateChatUserFeedback } from '@fastgpt/service/core/chat/feedback';
import { findCompletedCustomerServiceRequestByMessage } from '@fastgpt/service/core/customerService/request/service';
import { setCustomerServiceRequestUnresolved } from '@fastgpt/service/core/customerService/request/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';
import { redactCustomerServiceSensitiveText } from '@fastgpt/service/core/customerService/privacy';
import { CustomerServiceChatStatusEnum } from '@fastgpt/global/core/customerService/constants';

/** 提交客服消息反馈，并复用 FastGPT 原有消息、会话和 App 日志统计。 */
export async function handler(req: NextApiRequest): Promise<CustomerServiceFeedbackResponse> {
  const body = parseApiInput({ req, bodySchema: CustomerServiceFeedbackBodySchema }).body;
  const { teamId, project, binding, app } = await authCustomerServiceExternalRequest(req);
  const request = await findCompletedCustomerServiceRequestByMessage({
    teamId,
    projectId: String(project._id),
    openApiKeyId: String(binding.openApiKeyId),
    externalSessionId: body.sessionId,
    responseChatItemId: body.messageId
  });
  if (!request) throw new UserError('Customer service chat message not found');

  const feedbackContent = redactCustomerServiceSensitiveText(body.content);
  // 只有模型生成的 answered 消息存在原生 AI chat item；服务端追问/人工卡片只记录客服请求状态。
  if (request.resultStatus === CustomerServiceChatStatusEnum.answered) {
    await updateChatUserFeedback({
      teamId,
      sourceType: ChatSourceTypeEnum.app,
      sourceId: String(app._id),
      chatId: request.internalChatId,
      dataId: body.messageId,
      ...(body.type === 'good'
        ? {
            userGoodFeedback: feedbackContent || 'good',
            userBadFeedback: undefined
          }
        : {
            userBadFeedback: feedbackContent || (body.type === 'unresolved' ? 'unresolved' : 'bad'),
            userGoodFeedback: undefined
          })
    });
  }
  await setCustomerServiceRequestUnresolved({
    id: String(request._id),
    unresolved: body.type === 'unresolved'
  });
  return CustomerServiceFeedbackResponseSchema.parse(undefined);
}

export default NextAPI(handler);
