import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  resolveApiUrl,
  fetchPublicBootstrap,
  sendPublicChatMessageStream,
  stopPublicChatMessage,
  submitPublicFeedback
} from '../../src/services/api';
import { mockPublicBootstrap, mockChatResponseAnswered } from '../mocks/mockData';

describe('Tier 3 Integration: SSE Stream Parsing, Stop & Feedback APIs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('T3-SSE-01: resolveApiUrl correctly prefixes custom apiHost', () => {
    expect(resolveApiUrl('/api/chat')).toBe('/api/chat');
    expect(resolveApiUrl('/api/chat', 'https://gateway.example.com')).toBe(
      'https://gateway.example.com/api/chat'
    );
    expect(resolveApiUrl('/api/chat', 'https://gateway.example.com/')).toBe(
      'https://gateway.example.com/api/chat'
    );
  });

  it('T3-SSE-02: fetchPublicBootstrap loads configuration and catalog data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ code: 200, data: mockPublicBootstrap })
    } as Response);

    const res = await fetchPublicBootstrap({
      publicId: 'DEMO_DEVICE_SUPPORT',
      apiHost: 'https://gateway.example.com'
    });

    expect(res.project.name).toBe('无人自助设备智能服务门户');
    expect(res.catalog.models.length).toBe(4);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://gateway.example.com/api/customer-service/public/bootstrap?publicId=DEMO_DEVICE_SUPPORT',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('T3-SSE-03: sendPublicChatMessageStream handles answer deltas, status and customerService final event', async () => {
    const ssePayload = [
      'event: customerServiceStatus\ndata: {"status":"processing"}\n\n',
      'event: answer\ndata: {"choices":[{"delta":{"content":"相纸卡阻"}}]}\n\n',
      'event: answer\ndata: {"choices":[{"delta":{"content":"排障方案"}}]}\n\n',
      `event: customerService\ndata: ${JSON.stringify(mockChatResponseAnswered)}\n\n`,
      'data: [DONE]\n\n'
    ].join('');

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(ssePayload));
        controller.close();
      }
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream
    } as Response);

    const statusUpdates: string[] = [];
    const answerDeltas: string[] = [];

    const finalResult = await sendPublicChatMessageStream({
      publicId: 'DEMO_DEVICE_SUPPORT',
      requestId: 'req-test-1',
      sessionId: 'session-test-1',
      message: '拍照机卡纸',
      productModel: 'PHOTO-DT2026',
      onStatus: (st) => statusUpdates.push(st),
      onAnswerDelta: (d) => answerDeltas.push(d)
    });

    expect(statusUpdates).toContain('processing');
    expect(answerDeltas).toEqual(['相纸卡阻', '排障方案']);
    expect(finalResult.messageId).toBe('msg-test-001');
    expect(finalResult.citations?.length).toBe(4);
  });

  it('T3-SSE-04: stopPublicChatMessage sends abort signal to server', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ stopped: true })
    } as Response);

    await stopPublicChatMessage({
      publicId: 'DEMO_DEVICE_SUPPORT',
      requestId: 'req-stop-1',
      sessionId: 'session-stop-1'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customer-service/public/stop',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          publicId: 'DEMO_DEVICE_SUPPORT',
          requestId: 'req-stop-1',
          sessionId: 'session-stop-1'
        })
      })
    );
  });

  it('T3-SSE-05: submitPublicFeedback sends feedback payload', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    } as Response);

    await submitPublicFeedback({
      publicId: 'DEMO_DEVICE_SUPPORT',
      sessionId: 'session-feedback-1',
      messageId: 'msg-feedback-1',
      type: 'unresolved',
      content: '步骤不清晰'
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/customer-service/public/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          publicId: 'DEMO_DEVICE_SUPPORT',
          sessionId: 'session-feedback-1',
          messageId: 'msg-feedback-1',
          type: 'unresolved',
          content: '步骤不清晰'
        })
      })
    );
  });
});
