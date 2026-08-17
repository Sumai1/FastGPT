import type { NextApiResponse } from 'next';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@fastgpt/service/common/response');

import {
  CUSTOMER_SERVICE_STATUS_EVENT,
  createCustomerServicePublicChatStream,
  formatCustomerServicePublicChatResponse,
  writeCustomerServicePublicChatResponse
} from '@/service/customerService/publicResponse';

const internalResponse = {
  requestId: 'request-public-1',
  sessionId: 'session-public-1',
  messageId: 'message-public-1',
  status: 'answered',
  answer: '请先关闭设备电源，再检查连接线。',
  audience: 'public',
  resolvedProduct: {
    modelId: '68ad85a7463006c963799a09',
    modelCode: 'DT-2026A',
    hardwareVersionId: '68ad85a7463006c963799a24',
    hardwareVersionCode: 'V2',
    softwareVersionId: '68ad85a7463006c963799a25',
    softwareVersionCode: 'V3.1'
  },
  candidates: [
    {
      id: '68ad85a7463006c963799a31',
      seriesId: '68ad85a7463006c963799a32',
      modelCode: 'DT-2026B',
      name: 'DT-2026B 拍照机',
      aliases: ['桌面新款'],
      description: '候选机型',
      status: 'active',
      discontinuedAt: null,
      datasetIds: ['68ad85a7463006c963799a33'],
      sortOrder: 0
    }
  ],
  citations: [
    {
      id: 'private-chunk-id',
      datasetId: '68ad85a7463006c963799a41',
      collectionId: '68ad85a7463006c963799a42',
      sourceName: '设备用户手册.pdf',
      q: '如何排查连接故障？',
      a: '关闭电源后检查连接线。',
      score: 0.87
    }
  ]
};

const createSseResponse = () => {
  const chunks: string[] = [];
  const headers: Record<string, string> = {};
  const listeners: Record<string, Array<() => void>> = {};
  const end = vi.fn(() => {
    res.writableEnded = true;
  });
  const res = {
    statusCode: 0,
    headersSent: false,
    writableEnded: false,
    destroyed: false,
    setHeader: (key: string, value: string) => {
      headers[key] = value;
    },
    flushHeaders: vi.fn(() => {
      res.headersSent = true;
    }),
    write: (value: string) => {
      chunks.push(value);
      return true;
    },
    once: vi.fn((event: string, listener: () => void) => {
      listeners[event] ??= [];
      listeners[event].push(listener);
      return res;
    }),
    on: vi.fn((event: string, listener: () => void) => {
      listeners[event] ??= [];
      listeners[event].push(listener);
      return res;
    }),
    end,
    emit(event: string) {
      listeners[event]?.forEach((listener) => listener());
    }
  };

  return { res: res as unknown as NextApiResponse, chunks, headers, end, emit: res.emit };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('formatCustomerServicePublicChatResponse', () => {
  it('projects internal chat data to business fields without resource identifiers', () => {
    const result = formatCustomerServicePublicChatResponse(internalResponse);

    expect(result).toEqual(
      expect.objectContaining({
        audience: 'public',
        resolvedProduct: {
          modelCode: 'DT-2026A',
          hardwareVersionCode: 'V2',
          softwareVersionCode: 'V3.1'
        },
        candidates: [
          {
            modelCode: 'DT-2026B',
            name: 'DT-2026B 拍照机',
            description: '候选机型'
          }
        ],
        citations: [
          {
            title: '设备用户手册.pdf',
            summary: '关闭电源后检查连接线。',
            score: 0.87
          }
        ]
      })
    );
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/datasetId|collectionId|private-chunk-id/);
    expect(serialized).not.toContain('68ad85a7463006c963799a09');
    expect(serialized).not.toContain('68ad85a7463006c963799a31');
  });

  it('forces the public audience even if an internal caller passes a broader value', () => {
    const result = formatCustomerServicePublicChatResponse({
      ...internalResponse,
      audience: 'internal'
    });

    expect(result.audience).toBe('public');
  });

  it('uses readable citation fallbacks without exposing the chunk id', () => {
    const result = formatCustomerServicePublicChatResponse({
      ...internalResponse,
      citations: [
        {
          ...internalResponse.citations[0],
          sourceName: ' ',
          q: '设备错误码 E01',
          a: ' '
        }
      ]
    });

    expect(result.citations).toEqual([
      { title: '设备错误码 E01', summary: '设备错误码 E01', score: 0.87 }
    ]);
  });
});

describe('writeCustomerServicePublicChatResponse', () => {
  it('writes only the public projection in the final SSE event', () => {
    const { res, chunks, headers, end } = createSseResponse();

    const result = writeCustomerServicePublicChatResponse({
      res,
      response: internalResponse,
      stream: true
    });

    expect(result).toBeUndefined();
    expect(headers['Content-Type']).toBe('text/event-stream;charset=utf-8');
    expect(end).toHaveBeenCalledOnce();
    const raw = chunks.join('');
    expect(raw).toContain(`event: ${CUSTOMER_SERVICE_STATUS_EVENT}`);
    expect(raw).toContain('event: answer');
    expect(raw).toContain('event: customerService');
    expect(raw).not.toMatch(/datasetId|collectionId|private-chunk-id/);
    expect(raw).not.toContain('68ad85a7463006c963799a09');

    const publicEvent = raw.match(/event: customerService\ndata: ([^\n]+)\n\n/)?.[1];
    expect(publicEvent).toBeDefined();
    expect(JSON.parse(publicEvent ?? '{}').citations).toEqual([
      {
        title: '设备用户手册.pdf',
        summary: '关闭电源后检查连接线。',
        score: 0.87
      }
    ]);
  });

  it('returns the same safe projection for non-stream responses', () => {
    const res = {} as NextApiResponse;
    const result = writeCustomerServicePublicChatResponse({
      res,
      response: internalResponse,
      stream: false
    });

    expect(result?.citations[0]).toEqual({
      title: '设备用户手册.pdf',
      summary: '关闭电源后检查连接线。',
      score: 0.87
    });
  });

  it('writes processing heartbeats until the response closes and then clears the timer', async () => {
    vi.useFakeTimers();
    const { res, chunks, emit } = createSseResponse();
    const stream = createCustomerServicePublicChatStream({
      res,
      heartbeatIntervalMs: 1_000
    });

    expect(chunks.join('')).toContain(`event: ${CUSTOMER_SERVICE_STATUS_EVENT}`);
    const initialChunkCount = chunks.length;
    await vi.advanceTimersByTimeAsync(1_000);
    expect(chunks.length).toBeGreaterThan(initialChunkCount);

    const heartbeatChunkCount = chunks.length;
    emit('close');
    await vi.advanceTimersByTimeAsync(2_000);
    expect(chunks).toHaveLength(heartbeatChunkCount);

    stream.cleanup();
  });

  it('stops heartbeats after the final safe response is written', async () => {
    vi.useFakeTimers();
    const { res, chunks, end } = createSseResponse();
    const stream = createCustomerServicePublicChatStream({
      res,
      heartbeatIntervalMs: 1_000
    });

    await vi.advanceTimersByTimeAsync(1_000);
    stream.finish(internalResponse);
    const completedChunkCount = chunks.length;
    await vi.advanceTimersByTimeAsync(2_000);

    expect(chunks).toHaveLength(completedChunkCount);
    expect(end).toHaveBeenCalledOnce();
    expect(chunks.join('')).not.toMatch(/datasetId|collectionId|private-chunk-id/);
  });

  it('writes an SSE error and stops heartbeats when generation fails', async () => {
    vi.useFakeTimers();
    const { res, chunks, end } = createSseResponse();
    const stream = createCustomerServicePublicChatStream({
      res,
      heartbeatIntervalMs: 1_000
    });

    stream.fail(new Error('generation failed'));
    const failedChunkCount = chunks.length;
    await vi.advanceTimersByTimeAsync(2_000);

    expect(chunks).toHaveLength(failedChunkCount);
    expect(chunks.join('')).toContain('event: error');
    expect(end).toHaveBeenCalledOnce();
  });
});
