import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoCustomerServiceRequest } from '@fastgpt/service/core/customerService/request/schema';
import {
  acquireCustomerServiceRequest,
  completeCustomerServiceRequest,
  countConsecutiveCustomerServiceLowConfidence,
  failCustomerServiceRequest,
  findProcessingCustomerServiceRequest,
  setCustomerServiceRequestUnresolved
} from '@fastgpt/service/core/customerService/request/service';
import { findCompletedCustomerServiceRequestByMessage } from '@fastgpt/service/core/customerService/request/service';

const id = () => String(new Types.ObjectId());

describe('customer service request idempotency', () => {
  beforeAll(async () => {
    await MongoCustomerServiceRequest.syncIndexes();
  });

  it('replays a completed request instead of acquiring the same key twice', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'idempotent-request',
      externalSessionId: 'external-session',
      internalChatId: 'internal-session',
      responseChatItemId: 'response-item',
      audience: CustomerServiceAudienceEnum.public
    };
    const first = await acquireCustomerServiceRequest(base);
    expect(first.acquired).toBe(true);
    await completeCustomerServiceRequest({
      id: String(first.item._id),
      resultStatus: CustomerServiceChatStatusEnum.clarificationRequired,
      serverAnswer: '请补充型号'
    });

    const second = await acquireCustomerServiceRequest(base);
    expect(second.acquired).toBe(false);
    expect(second.item.serverAnswer).toBe('请补充型号');
  });

  it('persists a redacted customer question for operation views without chat log timing', async () => {
    const acquired = await acquireCustomerServiceRequest({
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'question-record',
      question: '设备 E01 报错，联系电话 13800138000',
      externalSessionId: 'question-session',
      internalChatId: 'question-internal-session',
      responseChatItemId: 'question-message',
      audience: CustomerServiceAudienceEnum.public
    });

    expect(acquired.item.question).toBe('设备 E01 报错，联系电话 [PHONE]');
  });

  it('redacts fixed answers, safety warnings and failure details in the request projection', async () => {
    const acquired = await acquireCustomerServiceRequest({
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'redacted-result-record',
      externalSessionId: 'redacted-result-session',
      internalChatId: 'redacted-result-internal',
      responseChatItemId: 'redacted-result-message',
      audience: CustomerServiceAudienceEnum.public
    });
    await completeCustomerServiceRequest({
      id: String(acquired.item._id),
      resultStatus: CustomerServiceChatStatusEnum.humanRequired,
      serverAnswer: '请联系 service@example.com',
      safetyWarning: '紧急联系人 13800138000'
    });
    await failCustomerServiceRequest({
      id: String(acquired.item._id),
      error: new Error('上游 Key fastgpt-secret_12345678 调用失败')
    });

    const stored = await MongoCustomerServiceRequest.findById(acquired.item._id).lean();
    expect(stored).toEqual(
      expect.objectContaining({
        serverAnswer: '请联系 [EMAIL]',
        safetyWarning: '紧急联系人 [PHONE]',
        errorMessage: '上游 Key [API_KEY] 调用失败'
      })
    );
  });

  it('rejects a concurrent duplicate while the first request is processing', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'processing-request',
      externalSessionId: 'external-session',
      internalChatId: 'internal-session',
      responseChatItemId: 'response-item',
      audience: CustomerServiceAudienceEnum.public
    };
    await acquireCustomerServiceRequest(base);
    await expect(acquireCustomerServiceRequest(base)).rejects.toThrow(
      'Customer service request is processing'
    );
    await expect(
      acquireCustomerServiceRequest({ ...base, externalSessionId: 'different-session' })
    ).rejects.toThrow('Customer service request idempotency context conflicts');
  });

  it('locates a processing request only inside the exact stop identity', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'stop-request',
      externalSessionId: 'stop-session',
      internalChatId: 'stop-internal-session',
      responseChatItemId: 'stop-response-item',
      audience: CustomerServiceAudienceEnum.public
    };
    const acquired = await acquireCustomerServiceRequest(base);

    await expect(
      findProcessingCustomerServiceRequest({
        teamId: base.teamId,
        projectId: base.projectId,
        openApiKeyId: base.openApiKeyId,
        requestId: base.requestId,
        sessionId: base.externalSessionId
      })
    ).resolves.toEqual(expect.objectContaining({ internalChatId: base.internalChatId }));
    await expect(
      findProcessingCustomerServiceRequest({
        teamId: base.teamId,
        projectId: base.projectId,
        openApiKeyId: base.openApiKeyId,
        requestId: base.requestId,
        sessionId: 'another-session'
      })
    ).resolves.toBeNull();
    await expect(
      findProcessingCustomerServiceRequest({
        teamId: base.teamId,
        projectId: base.projectId,
        openApiKeyId: id(),
        requestId: base.requestId,
        sessionId: base.externalSessionId
      })
    ).resolves.toBeNull();

    await completeCustomerServiceRequest({
      id: String(acquired.item._id),
      resultStatus: CustomerServiceChatStatusEnum.answered
    });
    await expect(
      findProcessingCustomerServiceRequest({
        teamId: base.teamId,
        projectId: base.projectId,
        openApiKeyId: base.openApiKeyId,
        requestId: base.requestId,
        sessionId: base.externalSessionId
      })
    ).resolves.toBeNull();
  });

  it('reclaims a stale processing request for the same idempotency context', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'stale-processing-request',
      externalSessionId: 'external-session',
      internalChatId: 'internal-session',
      responseChatItemId: 'response-item',
      audience: CustomerServiceAudienceEnum.public
    };
    const first = await acquireCustomerServiceRequest(base);
    await MongoCustomerServiceRequest.updateOne(
      { _id: first.item._id },
      { $set: { updateTime: new Date(Date.now() - 60_000) } }
    );

    const retried = await acquireCustomerServiceRequest({ ...base, processingStaleMs: 1_000 });
    expect(retried.acquired).toBe(true);
  });

  it('allows retry after a failed generation', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'failed-request',
      externalSessionId: 'external-session',
      internalChatId: 'internal-session',
      responseChatItemId: 'response-item',
      audience: CustomerServiceAudienceEnum.public
    };
    const first = await acquireCustomerServiceRequest(base);
    await completeCustomerServiceRequest({
      id: String(first.item._id),
      resultStatus: CustomerServiceChatStatusEnum.humanRequired,
      serverAnswer: 'stale answer',
      lowConfidence: true,
      citationCount: 3
    });
    await failCustomerServiceRequest({ id: String(first.item._id), error: new Error('failed') });
    const retry = await acquireCustomerServiceRequest(base);
    expect(retry.acquired).toBe(true);
    expect(retry.item.serverAnswer).toBeUndefined();
    expect(retry.item).toEqual(
      expect.objectContaining({ lowConfidence: false, citationCount: 0, candidateModelIds: [] })
    );
  });

  it('counts only consecutive low-confidence results in a session', async () => {
    const teamId = id();
    const projectId = id();
    const internalChatId = 'low-confidence-session';
    const createCompleted = async (requestId: string, lowConfidence: boolean) => {
      const acquired = await acquireCustomerServiceRequest({
        teamId,
        projectId,
        openApiKeyId: id(),
        requestId,
        externalSessionId: internalChatId,
        internalChatId,
        responseChatItemId: requestId,
        audience: CustomerServiceAudienceEnum.public
      });
      await completeCustomerServiceRequest({
        id: String(acquired.item._id),
        resultStatus: lowConfidence
          ? CustomerServiceChatStatusEnum.clarificationRequired
          : CustomerServiceChatStatusEnum.answered,
        lowConfidence
      });
    };

    await createCompleted('normal', false);
    await createCompleted('low-1', true);
    await createCompleted('low-2', true);
    expect(
      await countConsecutiveCustomerServiceLowConfidence({
        teamId,
        projectId,
        internalChatId,
        limit: 5
      })
    ).toBe(2);
  });

  it('marks a completed request unresolved idempotently', async () => {
    const acquired = await acquireCustomerServiceRequest({
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'unresolved-request',
      externalSessionId: 'unresolved-session',
      internalChatId: 'unresolved-internal-session',
      responseChatItemId: 'unresolved-message',
      audience: CustomerServiceAudienceEnum.public
    });
    await completeCustomerServiceRequest({
      id: String(acquired.item._id),
      resultStatus: CustomerServiceChatStatusEnum.answered
    });

    const first = await setCustomerServiceRequestUnresolved({
      id: String(acquired.item._id),
      unresolved: true
    });
    const second = await setCustomerServiceRequestUnresolved({
      id: String(acquired.item._id),
      unresolved: true
    });
    expect(first?.unresolved).toBe(true);
    expect(second?.unresolved).toBe(true);
  });

  it('allows feedback ownership checks for clarification and human responses', async () => {
    const base = {
      teamId: id(),
      projectId: id(),
      openApiKeyId: id(),
      requestId: 'clarification-feedback',
      question: '设备报错了',
      externalSessionId: 'feedback-session',
      internalChatId: 'feedback-internal',
      responseChatItemId: 'feedback-message',
      audience: CustomerServiceAudienceEnum.public
    };
    const acquired = await acquireCustomerServiceRequest(base);
    await completeCustomerServiceRequest({
      id: String(acquired.item._id),
      resultStatus: CustomerServiceChatStatusEnum.clarificationRequired,
      serverAnswer: '请补充设备型号'
    });

    expect(
      await findCompletedCustomerServiceRequestByMessage({
        teamId: base.teamId,
        projectId: base.projectId,
        openApiKeyId: base.openApiKeyId,
        externalSessionId: base.externalSessionId,
        responseChatItemId: base.responseChatItemId
      })
    ).toEqual(expect.objectContaining({ resultStatus: 'clarification_required' }));
  });
});
