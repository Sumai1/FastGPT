import {
  CustomerServiceChatResponseSchema,
  CustomerServicePublicChatResponseSchema,
  type CustomerServicePublicChatResponse
} from '@fastgpt/global/openapi/customerService/api';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { workflowSseEvent } from '@fastgpt/global/core/workflow/runtime/sse';
import { CustomerServiceAudienceEnum } from '@fastgpt/global/core/customerService/constants';
import { getSseErrorResponse } from '@fastgpt/service/common/response';
import { createSseStreamContext, type SseStreamWriter } from '@fastgpt/service/common/response/sse';
import type { NextApiResponse } from 'next';

export const CUSTOMER_SERVICE_STATUS_EVENT = 'customerServiceStatus';
const processingStatusData = JSON.stringify({ status: 'processing' });

/**
 * 将内部客服响应投影为正式客户可见的业务响应。
 *
 * v1 客服链路需要完整的 dataset/collection/chunk 标识来完成引用审计和幂等回放，
 * 但这些字段不能跨越正式客户边界。这里先按内部 schema 解码，再显式挑选产品编码、
 * 引用标题/摘要/分数等字段，最后由公开 schema 再解析一次，确保以后新增内部字段
 * 不会意外透传到公开 API。
 */
export const formatCustomerServicePublicChatResponse = (
  response: unknown
): CustomerServicePublicChatResponse => {
  const internal = CustomerServiceChatResponseSchema.parse(response);

  return CustomerServicePublicChatResponseSchema.parse({
    requestId: internal.requestId,
    sessionId: internal.sessionId,
    messageId: internal.messageId,
    status: internal.status,
    answer: internal.answer,
    audience: CustomerServiceAudienceEnum.public,
    resolvedProduct: {
      modelCode: internal.resolvedProduct.modelCode ?? undefined,
      hardwareVersionCode: internal.resolvedProduct.hardwareVersionCode ?? undefined,
      softwareVersionCode: internal.resolvedProduct.softwareVersionCode ?? undefined
    },
    candidates: internal.candidates.map((candidate) => ({
      modelCode: candidate.modelCode,
      name: candidate.name,
      description: candidate.description
    })),
    citations: internal.citations.map((citation) => ({
      // 某些全文引用没有 sourceName，使用问题文本作为稳定、可读的标题回退。
      title: citation.sourceName.trim() || citation.q.trim(),
      summary: citation.a.trim() || citation.q.trim(),
      score: citation.score ?? undefined
    })),
    ...(internal.safetyWarning !== undefined && { safetyWarning: internal.safetyWarning }),
    ...(internal.humanContact !== undefined && { humanContact: internal.humanContact })
  });
};

/** 将已完成可信判定的公开回答写入 SSE；调用前不得传入模型生成中的原始 token。 */
const writeCustomerServicePublicSseResult = ({
  write,
  response
}: {
  write: SseStreamWriter;
  response: CustomerServicePublicChatResponse;
}) => {
  const answerChunks = response.answer.match(/[\s\S]{1,80}/g) ?? [];
  answerChunks.forEach((chunk) => {
    const event = workflowSseEvent.answerDelta(chunk, response.messageId);
    write({ event: event.event, data: JSON.stringify(event.data) });
  });

  const stop = workflowSseEvent.answerStop();
  write({ event: stop.event, data: JSON.stringify(stop.data) });
  write({ event: 'customerService', data: JSON.stringify(response) });
  const done = workflowSseEvent.done(SseResponseEventEnum.answer);
  write({ event: done.event, data: done.data });
};

/**
 * 建立正式客服安全 SSE。等待检索和模型执行时只发送处理状态，完整可信判定通过后才允许
 * finish 写回答；响应完成、异常或客户端断开时都会停止心跳。
 */
export const createCustomerServicePublicChatStream = ({
  res,
  heartbeatIntervalMs = 10_000
}: {
  res: NextApiResponse;
  heartbeatIntervalMs?: number;
}) => {
  res.statusCode = 200;
  const streamContext = createSseStreamContext({
    res,
    heartbeat: {
      intervalMs: heartbeatIntervalMs,
      write: (write) => write({ event: CUSTOMER_SERVICE_STATUS_EVENT, data: processingStatusData })
    }
  });
  let settled = false;

  res.flushHeaders?.();
  streamContext.write({ event: CUSTOMER_SERVICE_STATUS_EVENT, data: processingStatusData });

  const cleanup = () => streamContext.cleanup();
  const end = () => {
    cleanup();
    if (!res.writableEnded && !res.destroyed) res.end();
  };

  return {
    /** 输出经过公开投影的最终回答并关闭连接。 */
    finish(response: unknown) {
      if (settled) return;
      const parsed = formatCustomerServicePublicChatResponse(response);
      settled = true;
      writeCustomerServicePublicSseResult({ write: streamContext.write, response: parsed });
      end();
    },
    /** 使用 FastGPT 统一 SSE 错误格式结束已建立的连接。 */
    fail(error: unknown) {
      if (settled) return;
      settled = true;
      const sseError = getSseErrorResponse(error);
      streamContext.write({ event: sseError.event, data: sseError.data });
      end();
    },
    cleanup
  };
};

/**
 * 在正式客户边界输出客服结果。底层 v1 链路始终以非流式模式生成完整内部结果，本函数先完成
 * 字段投影，再按调用方要求返回 JSON 或重新编码 SSE，避免内部引用标识进入任一公开事件。
 */
export const writeCustomerServicePublicChatResponse = ({
  res,
  response,
  stream
}: {
  res: NextApiResponse;
  response: unknown;
  stream: boolean;
}): CustomerServicePublicChatResponse | void => {
  const parsed = formatCustomerServicePublicChatResponse(response);
  if (!stream) return parsed;

  createCustomerServicePublicChatStream({ res }).finish(response);
};
