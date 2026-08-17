import { describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { DatasetCollectionTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoDatasetData } from '@fastgpt/service/core/dataset/data/schema';
import {
  createCustomerServiceKnowledgeDraft,
  publishCustomerServiceKnowledge,
  submitCustomerServiceKnowledge
} from '@fastgpt/service/core/customerService/knowledge/service';
import { MongoCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/schema';
import { MongoCustomerServiceProductModel } from '@fastgpt/service/core/customerService/product/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import {
  acquireCustomerServiceRequest,
  completeCustomerServiceRequest,
  setCustomerServiceRequestUnresolved
} from '@fastgpt/service/core/customerService/request/service';
import { getCustomerServiceCollectionIds } from '@fastgpt/service/core/customerService/search/whitelist';
import { listCustomerServiceOperations } from '@/service/customerService/operations';

const id = () => new Types.ObjectId();

describe('customer service product closed loop', () => {
  it('publishes uploaded knowledge, records unresolved feedback and republishes an operation draft', async () => {
    const teamId = id();
    const datasetId = id();
    const editorTmbId = id();
    const reviewerTmbId = id();
    const openApiKeyId = id();
    const model = await MongoCustomerServiceProductModel.create({
      teamId,
      tmbId: editorTmbId,
      updateTmbId: editorTmbId,
      seriesId: id(),
      modelCode: `MODEL_${String(id())}`,
      name: '闭环测试型号',
      status: CustomerServiceProductStatusEnum.active,
      datasetIds: [datasetId]
    });
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId: editorTmbId,
      updateTmbId: editorTmbId,
      appId: id(),
      projectCode: `CLOSED-LOOP-${id()}`,
      name: '闭环验收客服',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [model._id]
    });
    const uploadedCollection = await MongoDatasetCollection.create({
      teamId,
      datasetId,
      tmbId: editorTmbId,
      type: DatasetCollectionTypeEnum.file,
      name: '已上传产品手册',
      forbid: true
    });
    await MongoDatasetData.create({
      teamId,
      datasetId,
      collectionId: uploadedCollection._id,
      tmbId: editorTmbId,
      q: '设备出现 E01 错误时先检查电源连接。'
    });

    const uploadedKnowledge = await createCustomerServiceKnowledgeDraft({
      teamId: String(teamId),
      tmbId: String(editorTmbId),
      datasetId: String(datasetId),
      collectionId: String(uploadedCollection._id),
      title: '产品故障手册',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.fault,
      audienceLevel: CustomerServiceAudienceEnum.public
    });
    await submitCustomerServiceKnowledge({
      teamId: String(teamId),
      tmbId: String(editorTmbId),
      knowledgeId: String(uploadedKnowledge._id)
    });
    await publishCustomerServiceKnowledge({
      teamId: String(teamId),
      reviewerTmbId: String(reviewerTmbId),
      knowledgeId: String(uploadedKnowledge._id)
    });

    expect(
      await getCustomerServiceCollectionIds({
        teamId: String(teamId),
        projectId: String(project._id),
        maxAudience: CustomerServiceAudienceEnum.public
      })
    ).toContain(String(uploadedCollection._id));

    const acquired = await acquireCustomerServiceRequest({
      teamId: String(teamId),
      projectId: String(project._id),
      openApiKeyId: String(openApiKeyId),
      requestId: 'closed-loop-question-1',
      question: 'E01 错误怎么处理？',
      externalSessionId: 'public-session-1',
      internalChatId: 'internal-session-1',
      responseChatItemId: 'answer-item-1',
      audience: CustomerServiceAudienceEnum.public
    });
    await completeCustomerServiceRequest({
      id: String(acquired.item._id),
      resultStatus: CustomerServiceChatStatusEnum.answered,
      serverAnswer: '请先检查电源连接。',
      citationCount: 1
    });
    await setCustomerServiceRequestUnresolved({ id: String(acquired.item._id), unresolved: true });

    const unresolved = await listCustomerServiceOperations({
      teamId: String(teamId),
      input: { pageNum: 1, pageSize: 20, feedback: 'unresolved' }
    });
    expect(unresolved.total).toBe(1);
    expect(unresolved.list[0]).toEqual(
      expect.objectContaining({
        question: 'E01 错误怎么处理？',
        answer: '请先检查电源连接。',
        feedback: 'unresolved'
      })
    );

    const operationCollection = await MongoDatasetCollection.create({
      teamId,
      datasetId,
      tmbId: editorTmbId,
      type: DatasetCollectionTypeEnum.virtual,
      name: '客服未解决问题补充说明',
      forbid: true
    });
    await MongoDatasetData.create({
      teamId,
      datasetId,
      collectionId: operationCollection._id,
      tmbId: editorTmbId,
      q: '问题：E01 错误怎么处理？\n参考答案：检查插座、电源线和电源模块。'
    });
    const operationDraft = await createCustomerServiceKnowledgeDraft({
      teamId: String(teamId),
      tmbId: String(editorTmbId),
      datasetId: String(datasetId),
      collectionId: String(operationCollection._id),
      title: 'E01 故障补充说明',
      sourceName: '客服未解决问题',
      sourceRequestRecordId: String(acquired.item._id),
      sourceSessionId: 'public-session-1',
      knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
      audienceLevel: CustomerServiceAudienceEnum.public
    });

    expect(
      await getCustomerServiceCollectionIds({
        teamId: String(teamId),
        projectId: String(project._id),
        maxAudience: CustomerServiceAudienceEnum.public
      })
    ).not.toContain(String(operationCollection._id));

    await submitCustomerServiceKnowledge({
      teamId: String(teamId),
      tmbId: String(editorTmbId),
      knowledgeId: String(operationDraft._id)
    });
    await publishCustomerServiceKnowledge({
      teamId: String(teamId),
      reviewerTmbId: String(reviewerTmbId),
      knowledgeId: String(operationDraft._id)
    });

    const storedDraft = await MongoCustomerServiceKnowledge.findById(operationDraft._id).lean();
    expect(storedDraft).toEqual(
      expect.objectContaining({
        status: CustomerServiceKnowledgeStatusEnum.published,
        sourceSessionId: 'public-session-1'
      })
    );
    expect(String(storedDraft?.sourceRequestRecordId)).toBe(String(acquired.item._id));
    expect(
      await getCustomerServiceCollectionIds({
        teamId: String(teamId),
        projectId: String(project._id),
        maxAudience: CustomerServiceAudienceEnum.public
      })
    ).toEqual(
      expect.arrayContaining([String(uploadedCollection._id), String(operationCollection._id)])
    );
  });
});
