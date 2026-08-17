import type { ClientSession } from '../../../common/mongo';
import type { AppSchemaType } from '@fastgpt/global/core/app/type';
import type { StoreNodeItemType } from '@fastgpt/global/core/workflow/type/node';
import type { StoreEdgeItemType } from '@fastgpt/global/core/workflow/type/edge';
import type { AppChatConfigType } from '@fastgpt/global/core/app/type';
import type { AppResourceRefsType } from '@fastgpt/global/core/app/type';
import { getNextTimeByCronStringAndTimezone } from '@fastgpt/global/common/string/time';
import { UserError } from '@fastgpt/global/common/error/utils';
import { MongoApp } from '../schema';
import { MongoAppVersion } from './schema';
import { Types } from '../../../common/mongo';

/**
 * 在同一事务内创建 App 版本并同步工作台编辑态。调用前必须完成节点格式、权限和资源引用校验。
 * 该 helper 不自行开启事务，便于普通发布和业务同步复用同一个原子写入边界。
 * 业务同步可传入读取时的 `expectedAppUpdateTime`；条件不匹配时不会覆盖并发编辑。
 */
export const publishAppVersionSnapshot = async ({
  app,
  tmbId,
  nodes,
  edges,
  chatConfig,
  resourceRefs,
  isPublish,
  versionName,
  expectedAppUpdateTime,
  session
}: {
  app: AppSchemaType;
  tmbId: string;
  nodes: StoreNodeItemType[];
  edges: StoreEdgeItemType[];
  chatConfig?: AppChatConfigType;
  resourceRefs: AppResourceRefsType;
  isPublish?: boolean;
  versionName?: string;
  expectedAppUpdateTime?: Date;
  session: ClientSession;
}) => {
  // Allocate the version id before the conditional App update so a stale CAS
  // can fail without inserting an orphan version document. The surrounding
  // transaction still protects the update and insert from partial failure.
  const versionId = new Types.ObjectId();
  const setUpdate = {
    modules: nodes,
    edges,
    chatConfig,
    updateTime: new Date(),
    version: 'v2' as const,
    ...(isPublish && { resourceRefs }),
    ...(isPublish && chatConfig?.scheduledTriggerConfig?.cronString
      ? {
          scheduledTriggerConfig: chatConfig.scheduledTriggerConfig,
          scheduledTriggerNextTime: getNextTimeByCronStringAndTimezone(
            chatConfig.scheduledTriggerConfig
          )
        }
      : {}),
    'pluginData.nodeVersion': versionId
  };
  const result = await MongoApp.updateOne(
    {
      _id: app._id,
      teamId: app.teamId,
      deleteTime: null,
      ...(expectedAppUpdateTime && { updateTime: expectedAppUpdateTime })
    },
    {
      $set: setUpdate,
      ...(isPublish && !chatConfig?.scheduledTriggerConfig?.cronString
        ? { $unset: { scheduledTriggerConfig: '', scheduledTriggerNextTime: '' } }
        : {})
    },
    { session }
  );

  // A managed workflow passes the version it read before editing. If another
  // writer changed the App meanwhile, abort before creating the version.
  if (result.matchedCount !== 1) {
    throw new UserError(
      expectedAppUpdateTime
        ? 'App workflow changed while publishing, please retry'
        : 'App workflow no longer exists, please refresh and retry'
    );
  }

  const [version] = await MongoAppVersion.create(
    [
      {
        _id: versionId,
        appId: app._id,
        nodes,
        edges,
        chatConfig,
        isPublish,
        versionName,
        tmbId,
        resourceRefs
      }
    ],
    { session, ordered: true }
  );

  return { version, result };
};
