import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { deleteChatResourcesBySource } from '../../chat/delete';
import { MongoCustomerServiceProject } from '../project/schema';
import { MongoCustomerServiceRequest } from './schema';

/**
 * 按客服项目保留天数清理整段过期会话。只有某个 internalChatId 的最后一次请求也早于截止时间
 * 才删除，避免把仍在使用的长会话截断；标准 chat、chat item、节点引用和 S3 文件走现有删除器。
 */
export const cleanupCustomerServiceExpiredSessions = async ({
  now = new Date(),
  batchSize = 200
}: {
  now?: Date;
  batchSize?: number;
} = {}) => {
  const projects = await MongoCustomerServiceProject.find({
    sessionRetentionDays: { $gt: 0 }
  })
    .select('_id appId sessionRetentionDays')
    .lean();
  let deletedSessions = 0;

  for (const project of projects) {
    const cutoff = new Date(
      now.getTime() - (project.sessionRetentionDays || 0) * 24 * 60 * 60 * 1000
    );
    const expired = await MongoCustomerServiceRequest.aggregate<{ _id: string }>([
      { $match: { projectId: project._id } },
      { $group: { _id: '$internalChatId', lastUpdateTime: { $max: '$updateTime' } } },
      { $match: { lastUpdateTime: { $lt: cutoff } } },
      { $limit: batchSize }
    ]);
    const chatIds = expired.map((item) => item._id);
    if (chatIds.length === 0) continue;

    await deleteChatResourcesBySource({
      sourceType: ChatSourceTypeEnum.app,
      sourceId: String(project.appId),
      chatIds
    });
    await MongoCustomerServiceRequest.deleteMany({
      projectId: project._id,
      internalChatId: { $in: chatIds }
    });
    deletedSessions += chatIds.length;
  }

  return { deletedSessions };
};
