import { authChatTargetCrud } from '@/service/support/permission/auth/chat';
import { NextAPI } from '@/service/middleware/entry';
import { type ApiRequestProps } from '@fastgpt/next/type';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import {
  UpdateUserFeedbackBodySchema,
  UpdateUserFeedbackResponseSchema,
  type UpdateUserFeedbackResponseType
} from '@fastgpt/global/openapi/core/chat/feedback/api';
import { updateChatUserFeedback } from '@fastgpt/service/core/chat/feedback';

async function handler(req: ApiRequestProps): Promise<UpdateUserFeedbackResponseType> {
  const {
    sourceType,
    sourceId,
    chatId,
    dataId,
    userBadFeedback,
    userGoodFeedback,
    outLinkAuthData
  } = parseApiInput({
    req,
    bodySchema: UpdateUserFeedbackBodySchema
  }).body;

  const authRes = await authChatTargetCrud({
    req,
    authToken: true,
    authApiKey: true,
    sourceType,
    sourceId,
    chatId,
    outLinkAuthData
  });
  const resolvedSourceId = authRes.sourceId;
  await updateChatUserFeedback({
    teamId: authRes.teamId,
    sourceType,
    sourceId: resolvedSourceId,
    chatId,
    dataId,
    userBadFeedback,
    userGoodFeedback
  });

  return UpdateUserFeedbackResponseSchema.parse(undefined);
}

export default NextAPI(handler);
