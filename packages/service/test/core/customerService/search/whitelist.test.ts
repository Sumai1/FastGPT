import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/schema';
import { MongoCustomerServiceProductModel } from '@fastgpt/service/core/customerService/product/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import { getCustomerServiceCollectionIds } from '@fastgpt/service/core/customerService/search/whitelist';

const id = () => new Types.ObjectId();

describe('customer service collection whitelist', () => {
  beforeAll(async () => {
    await Promise.all([
      MongoCustomerServiceKnowledge.syncIndexes(),
      MongoCustomerServiceProject.syncIndexes(),
      MongoCustomerServiceProductModel.syncIndexes()
    ]);
  });

  it('clamps audience and intersects product/version/effective scopes', async () => {
    const teamId = id();
    const tmbId = id();
    const datasetId = id();
    const model = await MongoCustomerServiceProductModel.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      seriesId: id(),
      modelCode: `MODEL_${String(id())}`,
      name: 'Bound model',
      status: CustomerServiceProductStatusEnum.active,
      datasetIds: [datasetId]
    });
    const modelId = model._id;
    const otherModelId = id();
    const hardwareVersionId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: id(),
      projectCode: `WHITELIST_${String(id())}`,
      name: 'Whitelist project',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [modelId],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: 'human' },
      ruleConfig: {}
    });
    const publicCollectionId = id();
    const dealerCollectionId = id();
    const internalCollectionId = id();
    const wrongModelCollectionId = id();
    const expiredCollectionId = id();
    const unboundCollectionId = id();
    const common = {
      teamId,
      datasetId,
      sourceName: '',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.manual,
      hardwareVersionIds: [hardwareVersionId],
      softwareVersionIds: [],
      status: CustomerServiceKnowledgeStatusEnum.published,
      version: 1,
      reviewReason: '',
      tmbId,
      updateTmbId: tmbId
    };
    await MongoCustomerServiceKnowledge.create([
      {
        ...common,
        collectionId: publicCollectionId,
        title: 'public',
        audienceLevel: CustomerServiceAudienceEnum.public,
        modelIds: [modelId],
        versionGroupId: id()
      },
      {
        ...common,
        collectionId: dealerCollectionId,
        title: 'dealer',
        audienceLevel: CustomerServiceAudienceEnum.dealer,
        modelIds: [modelId],
        versionGroupId: id()
      },
      {
        ...common,
        collectionId: internalCollectionId,
        title: 'internal',
        audienceLevel: CustomerServiceAudienceEnum.internal,
        modelIds: [modelId],
        versionGroupId: id()
      },
      {
        ...common,
        collectionId: wrongModelCollectionId,
        title: 'wrong model',
        audienceLevel: CustomerServiceAudienceEnum.public,
        modelIds: [otherModelId],
        versionGroupId: id()
      },
      {
        ...common,
        collectionId: expiredCollectionId,
        title: 'expired',
        audienceLevel: CustomerServiceAudienceEnum.public,
        modelIds: [modelId],
        effectiveTo: new Date('2026-01-01T00:00:00.000Z'),
        versionGroupId: id()
      },
      {
        ...common,
        datasetId: id(),
        collectionId: unboundCollectionId,
        title: 'unbound dataset',
        audienceLevel: CustomerServiceAudienceEnum.public,
        modelIds: [modelId],
        versionGroupId: id()
      }
    ]);

    const collectionIds = await getCustomerServiceCollectionIds({
      teamId: String(teamId),
      projectId: String(project._id),
      maxAudience: CustomerServiceAudienceEnum.dealer,
      requestAudience: CustomerServiceAudienceEnum.internal,
      modelId: String(modelId),
      hardwareVersionId: String(hardwareVersionId),
      now: new Date('2026-08-11T00:00:00.000Z')
    });

    expect(new Set(collectionIds)).toEqual(
      new Set([String(publicCollectionId), String(dealerCollectionId)])
    );
    expect(collectionIds).not.toContain(String(internalCollectionId));
    expect(collectionIds).not.toContain(String(wrongModelCollectionId));
    expect(collectionIds).not.toContain(String(expiredCollectionId));
    expect(collectionIds).not.toContain(String(unboundCollectionId));
  });

  it('rejects a model outside the project instead of falling back to broad search', async () => {
    const teamId = id();
    const tmbId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: id(),
      projectCode: `REJECT_${String(id())}`,
      name: 'Reject project',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [id()],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: 'human' },
      ruleConfig: {}
    });

    await expect(
      getCustomerServiceCollectionIds({
        teamId: String(teamId),
        projectId: String(project._id),
        maxAudience: CustomerServiceAudienceEnum.public,
        modelId: String(id())
      })
    ).rejects.toThrow('Product model is not available in this project');
  });

  it('returns an empty whitelist for an unconfigured project model scope', async () => {
    const teamId = id();
    const tmbId = id();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: id(),
      projectCode: `EMPTY_SCOPE_${String(id())}`,
      name: 'Empty scope project',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [],
      defaultAudience: CustomerServiceAudienceEnum.public,
      humanContact: { name: 'human' },
      ruleConfig: {}
    });
    await MongoCustomerServiceKnowledge.create({
      teamId,
      datasetId: id(),
      collectionId: id(),
      title: 'team-wide generic knowledge',
      sourceName: '',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.manual,
      audienceLevel: CustomerServiceAudienceEnum.public,
      modelIds: [],
      hardwareVersionIds: [],
      softwareVersionIds: [],
      status: CustomerServiceKnowledgeStatusEnum.published,
      version: 1,
      versionGroupId: id(),
      reviewReason: '',
      tmbId,
      updateTmbId: tmbId
    });

    await expect(
      getCustomerServiceCollectionIds({
        teamId: String(teamId),
        projectId: String(project._id),
        maxAudience: CustomerServiceAudienceEnum.public
      })
    ).resolves.toEqual([]);
  });
});
