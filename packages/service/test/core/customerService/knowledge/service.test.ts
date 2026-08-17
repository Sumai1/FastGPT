import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import {
  CollectionTrainingStatusEnum,
  DatasetCollectionTypeEnum,
  TrainingModeEnum
} from '@fastgpt/global/core/dataset/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import {
  getCustomerServiceKnowledgeTrainingStatusMap,
  createCustomerServiceKnowledgeDraft,
  publishCustomerServiceKnowledge,
  updateCustomerServiceKnowledgeDraft
} from '@fastgpt/service/core/customerService/knowledge/service';
import {
  MongoCustomerServiceKnowledge,
  MongoCustomerServiceKnowledgeAudit
} from '@fastgpt/service/core/customerService/knowledge/schema';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import { MongoDatasetTraining } from '@fastgpt/service/core/dataset/training/schema';

const id = () => new Types.ObjectId();

describe('customer service knowledge publishing', () => {
  beforeAll(async () => {
    await Promise.all([
      MongoCustomerServiceKnowledge.syncIndexes(),
      MongoCustomerServiceKnowledgeAudit.syncIndexes()
    ]);
  });

  it('turns an uploaded pending collection into a governed draft without leaving recovery metadata', async () => {
    const teamId = id();
    const datasetId = id();
    const tmbId = id();
    const collection = await MongoDatasetCollection.create({
      teamId,
      datasetId,
      tmbId,
      type: DatasetCollectionTypeEnum.file,
      name: '待登记资料.pdf',
      metadata: { customerServicePendingRegistration: true }
    });

    await createCustomerServiceKnowledgeDraft({
      teamId: String(teamId),
      tmbId: String(tmbId),
      datasetId: String(datasetId),
      collectionId: String(collection._id),
      title: collection.name,
      knowledgeType: CustomerServiceKnowledgeTypeEnum.manual,
      audienceLevel: CustomerServiceAudienceEnum.public
    });

    const storedCollection = await MongoDatasetCollection.findById(collection._id).lean();
    expect(storedCollection?.forbid).toBe(true);
    expect(storedCollection?.metadata?.customerServicePendingRegistration).toBeUndefined();
  });

  it('takes only the previous version group offline and leaves unrelated knowledge published', async () => {
    const teamId = id();
    const datasetId = id();
    const editorTmbId = id();
    const reviewerTmbId = id();
    const versionGroupId = id();
    const otherVersionGroupId = id();
    const [oldCollection, nextCollection, unrelatedCollection] =
      await MongoDatasetCollection.create([
        {
          teamId,
          datasetId,
          tmbId: editorTmbId,
          type: DatasetCollectionTypeEnum.file,
          name: 'old',
          forbid: false
        },
        {
          teamId,
          datasetId,
          tmbId: editorTmbId,
          type: DatasetCollectionTypeEnum.file,
          name: 'next',
          forbid: true
        },
        {
          teamId,
          datasetId,
          tmbId: editorTmbId,
          type: DatasetCollectionTypeEnum.file,
          name: 'unrelated',
          forbid: false
        }
      ]);
    const common = {
      teamId,
      datasetId,
      sourceName: '',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: CustomerServiceAudienceEnum.public,
      modelIds: [],
      hardwareVersionIds: [],
      softwareVersionIds: [],
      reviewReason: '',
      tmbId: editorTmbId,
      updateTmbId: editorTmbId
    };
    const [oldKnowledge, nextKnowledge, unrelatedKnowledge] =
      await MongoCustomerServiceKnowledge.create([
        {
          ...common,
          collectionId: oldCollection._id,
          title: 'FAQ v1',
          status: CustomerServiceKnowledgeStatusEnum.published,
          version: 1,
          versionGroupId
        },
        {
          ...common,
          collectionId: nextCollection._id,
          title: 'FAQ v2',
          status: CustomerServiceKnowledgeStatusEnum.pending,
          version: 2,
          versionGroupId,
          previousKnowledgeId: undefined,
          submitterTmbId: editorTmbId
        },
        {
          ...common,
          collectionId: unrelatedCollection._id,
          title: 'Other FAQ',
          status: CustomerServiceKnowledgeStatusEnum.published,
          version: 1,
          versionGroupId: otherVersionGroupId
        }
      ]);

    await publishCustomerServiceKnowledge({
      teamId: String(teamId),
      reviewerTmbId: String(reviewerTmbId),
      knowledgeId: String(nextKnowledge._id)
    });

    const [oldAfter, nextAfter, unrelatedAfter, oldCollectionAfter, nextCollectionAfter] =
      await Promise.all([
        MongoCustomerServiceKnowledge.findById(oldKnowledge._id).lean(),
        MongoCustomerServiceKnowledge.findById(nextKnowledge._id).lean(),
        MongoCustomerServiceKnowledge.findById(unrelatedKnowledge._id).lean(),
        MongoDatasetCollection.findById(oldCollection._id).lean(),
        MongoDatasetCollection.findById(nextCollection._id).lean()
      ]);
    expect(oldAfter?.status).toBe(CustomerServiceKnowledgeStatusEnum.offline);
    expect(String(oldAfter?.supersededBy)).toBe(String(nextKnowledge._id));
    expect(oldAfter?.supersededAt).toBeInstanceOf(Date);
    expect(nextAfter?.status).toBe(CustomerServiceKnowledgeStatusEnum.published);
    expect(unrelatedAfter?.status).toBe(CustomerServiceKnowledgeStatusEnum.published);
    expect(oldCollectionAfter?.forbid).toBe(true);
    expect(nextCollectionAfter?.forbid).toBe(false);
  });

  it('updates only editable governance records and validates the effective range', async () => {
    const teamId = id();
    const datasetId = id();
    const editorTmbId = id();
    const common = {
      teamId,
      datasetId,
      sourceName: '',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: CustomerServiceAudienceEnum.public,
      modelIds: [],
      hardwareVersionIds: [],
      softwareVersionIds: [],
      reviewReason: '',
      version: 1,
      tmbId: editorTmbId,
      updateTmbId: editorTmbId
    };
    const [draft, pending] = await MongoCustomerServiceKnowledge.create([
      {
        ...common,
        collectionId: id(),
        title: 'Draft',
        status: CustomerServiceKnowledgeStatusEnum.draft,
        versionGroupId: id(),
        effectiveTo: new Date('2026-08-31T00:00:00.000Z')
      },
      {
        ...common,
        collectionId: id(),
        title: 'Pending',
        status: CustomerServiceKnowledgeStatusEnum.pending,
        versionGroupId: id()
      }
    ]);

    await expect(
      updateCustomerServiceKnowledgeDraft({
        teamId: String(teamId),
        tmbId: String(editorTmbId),
        knowledgeId: String(draft._id),
        effectiveFrom: new Date('2026-09-01T00:00:00.000Z')
      })
    ).rejects.toThrow('Knowledge effective time range is invalid');
    await expect(
      updateCustomerServiceKnowledgeDraft({
        teamId: String(teamId),
        tmbId: String(editorTmbId),
        knowledgeId: String(draft._id),
        modelIds: [String(id())]
      })
    ).rejects.toThrow('Customer service knowledge product scope is invalid');

    const updated = await updateCustomerServiceKnowledgeDraft({
      teamId: String(teamId),
      tmbId: String(editorTmbId),
      knowledgeId: String(draft._id),
      title: 'Updated draft',
      audienceLevel: CustomerServiceAudienceEnum.dealer
    });
    expect(updated.title).toBe('Updated draft');
    expect(updated.audienceLevel).toBe(CustomerServiceAudienceEnum.dealer);
    expect(
      await MongoCustomerServiceKnowledgeAudit.exists({
        knowledgeId: draft._id,
        action: 'update'
      })
    ).toBeTruthy();

    await expect(
      updateCustomerServiceKnowledgeDraft({
        teamId: String(teamId),
        tmbId: String(editorTmbId),
        knowledgeId: String(pending._id),
        title: 'Should not update'
      })
    ).rejects.toThrow('Knowledge status has changed, please refresh');
  });

  it('reuses native dataset training records for ready, running and final-error states', async () => {
    const teamId = id();
    const tmbId = id();
    const datasetId = id();
    const readyCollectionId = id();
    const runningCollectionId = id();
    const errorCollectionId = id();
    await Promise.all([
      MongoDatasetData.create({
        teamId,
        tmbId,
        datasetId,
        collectionId: readyCollectionId,
        q: 'ready content'
      }),
      MongoDatasetTraining.create({
        teamId,
        tmbId,
        datasetId,
        collectionId: runningCollectionId,
        billId: 'running-bill',
        mode: TrainingModeEnum.parse,
        retryCount: 3,
        lockTime: new Date()
      }),
      MongoDatasetTraining.create({
        teamId,
        tmbId,
        datasetId,
        collectionId: errorCollectionId,
        billId: 'error-bill',
        mode: TrainingModeEnum.chunk,
        retryCount: 0,
        errorMsg: '向量生成失败'
      })
    ]);

    const statusMap = await getCustomerServiceKnowledgeTrainingStatusMap({
      teamId: String(teamId),
      items: [
        { collectionId: readyCollectionId },
        { collectionId: runningCollectionId },
        { collectionId: errorCollectionId }
      ]
    });

    expect(statusMap.get(String(readyCollectionId))).toEqual(
      expect.objectContaining({ trainingStatus: CollectionTrainingStatusEnum.ready, dataAmount: 1 })
    );
    expect(statusMap.get(String(runningCollectionId))).toEqual(
      expect.objectContaining({
        trainingStatus: CollectionTrainingStatusEnum.running,
        trainingAmount: 1
      })
    );
    expect(statusMap.get(String(errorCollectionId))).toEqual(
      expect.objectContaining({
        trainingStatus: CollectionTrainingStatusEnum.error,
        trainingError: '向量生成失败'
      })
    );
  });
});
