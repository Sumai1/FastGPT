import { ChatRoleEnum, ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import { mongoSessionRun } from '../../common/mongo/sessionRun';
import { MongoAppChatLog } from '../app/logs/chatLogsSchema';
import { MongoChatItem } from './chatItemSchema';
import { updateChatFeedbackCount } from './controller';
import { buildChatSourceQuery } from './source';

/**
 * 更新 AI 消息反馈及会话/App 日志冗余统计。调用方必须先完成聊天归属鉴权；本函数仍以完整
 * source/chat/dataId 条件更新，避免反馈落到同 ID 的其他会话。
 */
export const updateChatUserFeedback = async ({
  teamId,
  sourceType,
  sourceId,
  chatId,
  dataId,
  userBadFeedback,
  userGoodFeedback
}: {
  teamId: string;
  sourceType: ChatSourceTypeEnum;
  sourceId: string;
  chatId: string;
  dataId: string;
  userBadFeedback?: string | null;
  userGoodFeedback?: string | null;
}) => {
  const chatSourceQuery = buildChatSourceQuery({ sourceType, sourceId });
  const chatItem = await MongoChatItem.findOne({
    ...chatSourceQuery,
    chatId,
    dataId,
    obj: ChatRoleEnum.AI
  })
    .select('obj userGoodFeedback userBadFeedback')
    .lean();
  if (!chatItem || chatItem.obj !== ChatRoleEnum.AI) {
    throw new UserError('Chat item not found');
  }

  await mongoSessionRun(async (session) => {
    await MongoChatItem.updateOne(
      { ...chatSourceQuery, chatId, dataId, obj: ChatRoleEnum.AI },
      {
        $unset: {
          ...(userBadFeedback === undefined && { userBadFeedback: '' }),
          ...(userGoodFeedback === undefined && { userGoodFeedback: '' })
        },
        $set: {
          ...(userBadFeedback !== undefined && { userBadFeedback }),
          ...(userGoodFeedback !== undefined && { userGoodFeedback })
        }
      },
      { session }
    );

    await updateChatFeedbackCount({ sourceType, sourceId, chatId, session });

    if (sourceType === ChatSourceTypeEnum.app) {
      const goodFeedbackDelta = (() => {
        if (!userGoodFeedback && chatItem.userGoodFeedback) return -1;
        if (userGoodFeedback && !chatItem.userGoodFeedback) return 1;
        return 0;
      })();
      const badFeedbackDelta = (() => {
        if (!userBadFeedback && chatItem.userBadFeedback) return -1;
        if (userBadFeedback && !chatItem.userBadFeedback) return 1;
        return 0;
      })();

      await MongoAppChatLog.findOneAndUpdate(
        { teamId, appId: sourceId, chatId },
        {
          $inc: {
            goodFeedbackCount: goodFeedbackDelta,
            badFeedbackCount: badFeedbackDelta
          }
        },
        { sort: { createTime: -1 }, session }
      );
    }
  });
};
