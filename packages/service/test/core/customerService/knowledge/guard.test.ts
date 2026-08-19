import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import {
  assertCustomerServiceCollectionsMutable,
  getCustomerServiceGovernedCollectionIds
} from '@fastgpt/service/core/customerService/knowledge/guard';
import { MongoCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/schema';

const id = () => new Types.ObjectId();

describe('customer service knowledge native dataset guard', () => {
  beforeAll(async () => {
    await MongoCustomerServiceKnowledge.syncIndexes();
  });

  it('locks pending, published and offline knowledge by collection and dataset', async () => {
    const teamId = id();
    const tmbId = id();
    const protectedStatuses = [
      CustomerServiceKnowledgeStatusEnum.pending,
      CustomerServiceKnowledgeStatusEnum.published,
      CustomerServiceKnowledgeStatusEnum.offline
    ];
    const protectedItems = await MongoCustomerServiceKnowledge.create(
      protectedStatuses.map((status) => ({
        teamId,
        datasetId: id(),
        collectionId: id(),
        title: `${status} knowledge`,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
        audienceLevel: CustomerServiceAudienceEnum.public,
        status,
        version: 1,
        versionGroupId: id(),
        tmbId,
        updateTmbId: tmbId
      }))
    );

    for (const item of protectedItems) {
      await expect(
        assertCustomerServiceCollectionsMutable({
          teamId: String(teamId),
          collectionIds: [String(item.collectionId)]
        })
      ).rejects.toThrow('immutable');
    }

    await expect(
      assertCustomerServiceCollectionsMutable({
        teamId: String(teamId),
        collectionIds: [],
        datasetIds: [String(protectedItems[0].datasetId)]
      })
    ).rejects.toThrow('immutable');
  });

  it('allows draft/rejected edits and never crosses team boundaries', async () => {
    const teamId = id();
    const otherTeamId = id();
    const tmbId = id();
    const draft = await MongoCustomerServiceKnowledge.create({
      teamId,
      datasetId: id(),
      collectionId: id(),
      title: 'draft',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: CustomerServiceAudienceEnum.public,
      status: CustomerServiceKnowledgeStatusEnum.draft,
      version: 1,
      versionGroupId: id(),
      tmbId,
      updateTmbId: tmbId
    });
    const rejected = await MongoCustomerServiceKnowledge.create({
      teamId,
      datasetId: id(),
      collectionId: id(),
      title: 'rejected',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: CustomerServiceAudienceEnum.public,
      status: CustomerServiceKnowledgeStatusEnum.rejected,
      version: 1,
      versionGroupId: id(),
      tmbId,
      updateTmbId: tmbId
    });

    await expect(
      assertCustomerServiceCollectionsMutable({
        teamId: String(teamId),
        collectionIds: [String(draft.collectionId), String(rejected.collectionId)]
      })
    ).resolves.toBeUndefined();
    await expect(
      assertCustomerServiceCollectionsMutable({
        teamId: String(otherTeamId),
        collectionIds: [String(draft.collectionId)],
        datasetIds: [String(draft.datasetId)]
      })
    ).resolves.toBeUndefined();
  });

  it('returns every governed collection so ordinary recall can deny it by default', async () => {
    const teamId = id();
    const tmbId = id();
    const datasetId = id();
    const items = await MongoCustomerServiceKnowledge.create(
      [
        CustomerServiceKnowledgeStatusEnum.draft,
        CustomerServiceKnowledgeStatusEnum.pending,
        CustomerServiceKnowledgeStatusEnum.published
      ].map((status) => ({
        teamId,
        datasetId,
        collectionId: id(),
        title: status,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
        audienceLevel: CustomerServiceAudienceEnum.public,
        status,
        version: 1,
        versionGroupId: id(),
        tmbId,
        updateTmbId: tmbId
      }))
    );

    const collectionIds = await getCustomerServiceGovernedCollectionIds({
      teamId: String(teamId),
      datasetIds: [String(datasetId)]
    });
    const expectedUnpublishedIds = items
      .filter((item) => item.status !== CustomerServiceKnowledgeStatusEnum.published)
      .map((item) => String(item.collectionId));
    expect(new Set(collectionIds)).toEqual(new Set(expectedUnpublishedIds));
  });
});
