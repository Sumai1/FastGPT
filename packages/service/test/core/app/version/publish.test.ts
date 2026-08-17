import { describe, expect, it } from 'vitest';
import { Types } from '@fastgpt/service/common/mongo';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoAppVersion } from '@fastgpt/service/core/app/version/schema';
import { publishAppVersionSnapshot } from '@fastgpt/service/core/app/version/publish';
import { customerServiceStandardAppTemplate } from '@fastgpt/global/core/customerService/workflowTemplate';

describe('publishAppVersionSnapshot', () => {
  it('atomically creates a published version and updates the app editing snapshot', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const app = await MongoApp.create({
      teamId,
      tmbId,
      name: '客服发布测试',
      modules: [],
      edges: []
    });
    const { nodes, edges, chatConfig } = customerServiceStandardAppTemplate.workflow;

    await mongoSessionRun(async (session) => {
      const { result } = await publishAppVersionSnapshot({
        app,
        tmbId: String(tmbId),
        nodes,
        edges,
        chatConfig,
        resourceRefs: { skillIds: [] },
        isPublish: true,
        versionName: '客服知识同步测试',
        session
      });
      expect(result.matchedCount).toBe(1);
    });

    const [storedApp, version] = await Promise.all([
      MongoApp.findById(app._id).lean(),
      MongoAppVersion.findOne({ appId: app._id, isPublish: true }).lean()
    ]);
    expect(storedApp?.modules).toHaveLength(nodes.length);
    expect(storedApp?.pluginData?.nodeVersion).toBe(String(version?._id));
    expect(version).toMatchObject({ versionName: '客服知识同步测试', isPublish: true });
  });

  it('aborts the version insert when the expected editing timestamp is stale', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const app = await MongoApp.create({
      teamId,
      tmbId,
      name: '客服 CAS 回滚测试',
      modules: [],
      edges: []
    });
    const staleUpdateTime = app.updateTime;
    const concurrentModules = [{ nodeId: 'concurrent-edit' }];
    await MongoApp.updateOne(
      { _id: app._id },
      {
        $set: {
          modules: concurrentModules,
          updateTime: new Date(staleUpdateTime.getTime() + 1000)
        }
      }
    );
    const { nodes, edges, chatConfig } = customerServiceStandardAppTemplate.workflow;

    await expect(
      mongoSessionRun(async (session) =>
        publishAppVersionSnapshot({
          app,
          tmbId: String(tmbId),
          nodes,
          edges,
          chatConfig,
          resourceRefs: { skillIds: [] },
          isPublish: true,
          versionName: '不应提交的版本',
          expectedAppUpdateTime: staleUpdateTime,
          session
        })
      )
    ).rejects.toThrow('App workflow changed while publishing');

    const [storedApp, versionCount] = await Promise.all([
      MongoApp.findById(app._id).lean(),
      MongoAppVersion.countDocuments({ appId: app._id })
    ]);
    expect(storedApp?.modules).toEqual(concurrentModules);
    expect(versionCount).toBe(0);
  });
});
