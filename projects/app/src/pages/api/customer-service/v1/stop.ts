import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceExternalRequest } from '@/service/customerService/externalAuth';
import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import {
  CustomerServiceStopBodySchema,
  CustomerServiceStopResponseSchema,
  type CustomerServiceStopResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { findProcessingCustomerServiceRequest } from '@fastgpt/service/core/customerService/request/service';
import {
  setAgentRuntimeStop,
  waitForWorkflowComplete
} from '@fastgpt/service/core/workflow/dispatch/workflowStatus';

/** 停止当前 Key、项目和访客会话下仍在执行的客服工作流。 */
export async function handler(req: NextApiRequest): Promise<CustomerServiceStopResponse> {
  const body = parseApiInput({ req, bodySchema: CustomerServiceStopBodySchema }).body;
  const { teamId, project, binding, app } = await authCustomerServiceExternalRequest(req);
  const request = await findProcessingCustomerServiceRequest({
    teamId,
    projectId: String(project._id),
    openApiKeyId: String(binding.openApiKeyId),
    requestId: body.requestId,
    sessionId: body.sessionId
  });
  if (!request) throw new UserError('Customer service request is not processing');

  const stopTarget = {
    sourceType: ChatSourceTypeEnum.app,
    sourceId: String(app._id),
    chatId: request.internalChatId
  } as const;
  await setAgentRuntimeStop(stopTarget);

  // 等待旧生成退出，避免客户端立即复用 requestId 时与旧工作流并行运行。
  await waitForWorkflowComplete({
    ...stopTarget,
    timeout: 5000
  });

  return CustomerServiceStopResponseSchema.parse({ stopped: true });
}

export default NextAPI(handler);
