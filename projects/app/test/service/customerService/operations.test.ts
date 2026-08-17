import { describe, expect, it } from 'vitest';
import { Types } from '@fastgpt/service/common/mongo';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceRequestStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { MongoCustomerServiceProductModel } from '@fastgpt/service/core/customerService/product/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import { MongoCustomerServiceRequest } from '@fastgpt/service/core/customerService/request/schema';
import {
  listCustomerServiceFrequentQuestions,
  listCustomerServiceOperations
} from '@/service/customerService/operations';

describe('listCustomerServiceOperations', () => {
  it('filters operation records by product series and answer status', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const seriesId = new Types.ObjectId();
    const otherSeriesId = new Types.ObjectId();
    const [model, otherModel] = await MongoCustomerServiceProductModel.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId,
        modelCode: 'MODEL-A',
        name: '型号 A',
        status: CustomerServiceProductStatusEnum.active
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId: otherSeriesId,
        modelCode: 'MODEL-B',
        name: '型号 B',
        status: CustomerServiceProductStatusEnum.active
      }
    ]);
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: new Types.ObjectId(),
      projectCode: `OPS-${new Types.ObjectId()}`,
      name: '运营筛选客服',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [model._id, otherModel._id]
    });
    await MongoCustomerServiceRequest.create([
      {
        teamId,
        projectId: project._id,
        openApiKeyId: new Types.ObjectId(),
        requestId: 'series-match',
        question: '型号 A 无法启动',
        externalSessionId: 'external-a',
        internalChatId: 'internal-a',
        responseChatItemId: 'response-a',
        status: CustomerServiceRequestStatusEnum.completed,
        resultStatus: CustomerServiceChatStatusEnum.clarificationRequired,
        audience: CustomerServiceAudienceEnum.public,
        modelId: model._id
      },
      {
        teamId,
        projectId: project._id,
        openApiKeyId: new Types.ObjectId(),
        requestId: 'series-other',
        question: '型号 B 使用方法',
        externalSessionId: 'external-b',
        internalChatId: 'internal-b',
        responseChatItemId: 'response-b',
        status: CustomerServiceRequestStatusEnum.completed,
        resultStatus: CustomerServiceChatStatusEnum.answered,
        audience: CustomerServiceAudienceEnum.public,
        modelId: otherModel._id
      }
    ]);

    const result = await listCustomerServiceOperations({
      teamId: String(teamId),
      input: {
        pageNum: 1,
        pageSize: 20,
        seriesId: String(seriesId),
        resultStatus: CustomerServiceChatStatusEnum.clarificationRequired
      }
    });

    expect(result.total).toBe(1);
    expect(result.list).toEqual([
      expect.objectContaining({ question: '型号 A 无法启动', modelName: '型号 A' })
    ]);
  });
});

describe('listCustomerServiceFrequentQuestions', () => {
  it('aggregates only readable recent questions and redacts the latest sample', async () => {
    const now = new Date('2026-08-16T12:00:00.000Z');
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const seriesId = new Types.ObjectId();
    const otherSeriesId = new Types.ObjectId();
    const [model, otherModel] = await MongoCustomerServiceProductModel.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId,
        modelCode: 'FREQUENT-A',
        name: '高频型号 A',
        status: CustomerServiceProductStatusEnum.active
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId: otherSeriesId,
        modelCode: 'FREQUENT-B',
        name: '高频型号 B',
        status: CustomerServiceProductStatusEnum.active
      }
    ]);
    const [readableProject, hiddenProject] = await MongoCustomerServiceProject.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        appId: new Types.ObjectId(),
        projectCode: `FREQUENT-READABLE-${new Types.ObjectId()}`,
        name: '可读客服',
        status: CustomerServiceProjectStatusEnum.active,
        modelIds: [model._id]
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        appId: new Types.ObjectId(),
        projectCode: `FREQUENT-HIDDEN-${new Types.ObjectId()}`,
        name: '无权客服',
        status: CustomerServiceProjectStatusEnum.active,
        modelIds: [model._id]
      }
    ]);
    const createRequest = ({
      projectId = readableProject._id,
      modelId = model._id,
      requestId,
      question,
      answer,
      createTime,
      resultStatus = CustomerServiceChatStatusEnum.answered,
      unresolved = false
    }: {
      projectId?: Types.ObjectId;
      modelId?: Types.ObjectId;
      requestId: string;
      question: string;
      answer: string;
      createTime: Date;
      resultStatus?: (typeof CustomerServiceChatStatusEnum)[keyof typeof CustomerServiceChatStatusEnum];
      unresolved?: boolean;
    }) => ({
      teamId,
      projectId,
      openApiKeyId: new Types.ObjectId(),
      requestId,
      question,
      serverAnswer: answer,
      externalSessionId: `external-${requestId}`,
      internalChatId: `internal-${requestId}`,
      responseChatItemId: `response-${requestId}`,
      status: CustomerServiceRequestStatusEnum.completed,
      resultStatus,
      audience: CustomerServiceAudienceEnum.public,
      modelId,
      unresolved,
      createTime,
      updateTime: createTime
    });

    const newest = await MongoCustomerServiceRequest.create(
      createRequest({
        requestId: 'frequent-newest',
        question: ' E01 联系 13800138000 ',
        answer: '请发邮件到 service@example.com',
        createTime: new Date('2026-08-15T12:00:00.000Z'),
        resultStatus: CustomerServiceChatStatusEnum.humanRequired,
        unresolved: true
      })
    );
    await MongoCustomerServiceRequest.create([
      createRequest({
        requestId: 'frequent-second',
        question: 'e01 联系 13800138000',
        answer: '请联系人工客服',
        createTime: new Date('2026-08-14T12:00:00.000Z'),
        resultStatus: CustomerServiceChatStatusEnum.clarificationRequired,
        unresolved: true
      }),
      createRequest({
        requestId: 'frequent-third',
        question: 'E01 联系 13800138000',
        answer: '检查接线',
        createTime: new Date('2026-08-13T12:00:00.000Z')
      }),
      createRequest({
        requestId: 'frequent-old',
        question: 'E01 联系 13800138000',
        answer: '过期样例',
        createTime: new Date('2026-06-01T12:00:00.000Z')
      }),
      createRequest({
        projectId: hiddenProject._id,
        requestId: 'frequent-hidden-1',
        question: 'E01 联系 13800138000',
        answer: '不可见样例',
        createTime: new Date('2026-08-15T10:00:00.000Z')
      }),
      createRequest({
        projectId: hiddenProject._id,
        requestId: 'frequent-hidden-2',
        question: 'e01 联系 13800138000',
        answer: '不可见样例',
        createTime: new Date('2026-08-14T10:00:00.000Z')
      }),
      createRequest({
        modelId: otherModel._id,
        requestId: 'frequent-other-model-1',
        question: '另外一个高频问题',
        answer: '其他型号',
        createTime: new Date('2026-08-15T09:00:00.000Z')
      }),
      createRequest({
        modelId: otherModel._id,
        requestId: 'frequent-other-model-2',
        question: '另外一个高频问题',
        answer: '其他型号',
        createTime: new Date('2026-08-14T09:00:00.000Z')
      })
    ]);

    const result = await listCustomerServiceFrequentQuestions({
      teamId: String(teamId),
      projectIds: [String(readableProject._id)],
      input: {
        limit: 10,
        minimumCount: 2,
        seriesId: String(seriesId),
        startTime: new Date('2026-07-16T00:00:00.000Z'),
        endTime: now
      }
    });

    expect(result.list).toEqual([
      {
        requestRecordId: String(newest._id),
        projectId: String(readableProject._id),
        projectName: '可读客服',
        modelId: String(model._id),
        modelName: '高频型号 A',
        question: ' E01 联系 [PHONE] ',
        answer: '请发邮件到 [EMAIL]',
        count: 3,
        unresolvedCount: 2,
        clarificationRequiredCount: 1,
        humanRequiredCount: 1,
        latestTime: new Date('2026-08-15T12:00:00.000Z')
      }
    ]);
  });

  it('fails closed when no readable project exists', async () => {
    const result = await listCustomerServiceFrequentQuestions({
      teamId: String(new Types.ObjectId()),
      projectIds: [],
      input: { limit: 10, minimumCount: 2 }
    });

    expect(result).toEqual({ list: [] });
  });
});
