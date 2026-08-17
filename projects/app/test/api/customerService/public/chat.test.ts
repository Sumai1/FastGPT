import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@fastgpt/service/common/response');

const mocks = vi.hoisted(() => ({
  chatHandler: vi.fn(),
  authPublicProject: vi.fn(),
  buildProxyBody: vi.fn(({ body }: { body: Record<string, unknown> }) => ({
    ...body,
    audience: 'public',
    externalUserId: 'public:test-session'
  })),
  setPublicProject: vi.fn(),
  clearPublicProject: vi.fn()
}));

vi.mock('@/pages/api/customer-service/v1/chat', () => ({ handler: mocks.chatHandler }));
vi.mock('@/service/customerService/publicAuth', () => ({
  authCustomerServicePublicProject: mocks.authPublicProject,
  buildCustomerServicePublicProxyBody: mocks.buildProxyBody
}));
vi.mock('@/service/customerService/context', () => ({
  setCustomerServicePublicProxyProject: mocks.setPublicProject,
  clearCustomerServicePublicProxyProject: mocks.clearPublicProject
}));

import { handler } from '@/pages/api/customer-service/public/chat';

let delegatedBody: Record<string, unknown> | undefined;
let startProcessing: (() => void) | undefined;

const internalResponse = {
  requestId: 'public-route-request',
  sessionId: 'public-route-session',
  messageId: 'public-route-message',
  status: 'answered',
  answer: '请按用户手册检查设备。',
  audience: 'public',
  resolvedProduct: {
    modelId: '68ad85a7463006c963799a01',
    modelCode: 'DT-2026A',
    hardwareVersionId: null,
    hardwareVersionCode: null,
    softwareVersionId: null,
    softwareVersionCode: null
  },
  candidates: [],
  citations: [
    {
      id: 'private-chunk-route',
      datasetId: '68ad85a7463006c963799a02',
      collectionId: '68ad85a7463006c963799a03',
      sourceName: '用户手册.pdf',
      q: '如何检查设备？',
      a: '先断电，再检查连接线。',
      score: 0.9
    }
  ]
};

const createRequest = ({ stream }: { stream: boolean }) =>
  ({
    body: {
      publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
      requestId: 'browser-request',
      sessionId: 'browser-session',
      message: '设备怎么检查？',
      stream
    },
    query: {},
    headers: { authorization: 'Bearer original-key' }
  }) as unknown as NextApiRequest;

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
    end
  };

  return { res: res as unknown as NextApiResponse, chunks, headers, end };
};

describe('customer service public chat API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delegatedBody = undefined;
    startProcessing = undefined;
    mocks.authPublicProject.mockResolvedValue({
      projectId: '68ad85a7463006c963799a04',
      openApiKey: { apiKey: 'server-only-key' }
    });
    mocks.setPublicProject.mockImplementation(({ onProcessing }: { onProcessing?: () => void }) => {
      startProcessing = onProcessing;
    });
    mocks.chatHandler.mockImplementation(async (req: NextApiRequest) => {
      // handler 会在返回前恢复公开请求，这里在 v1 边界即时快照代理入参。
      delegatedBody = { ...req.body };
      startProcessing?.();
      return internalResponse;
    });
  });

  it('returns a redacted JSON response and restores the caller request', async () => {
    const req = createRequest({ stream: false });
    const originalBody = req.body;
    const res = {} as NextApiResponse;

    const response = await handler(req, res);

    expect(mocks.chatHandler).toHaveBeenCalledOnce();
    expect(delegatedBody).toEqual(expect.objectContaining({ stream: false, audience: 'public' }));
    expect(response?.citations).toEqual([
      {
        title: '用户手册.pdf',
        summary: '先断电，再检查连接线。',
        score: 0.9
      }
    ]);
    expect(JSON.stringify(response)).not.toMatch(/datasetId|collectionId|private-chunk-route/);
    expect(JSON.stringify(response)).not.toContain('68ad85a7463006c963799a01');
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer original-key');
    expect(mocks.setPublicProject).toHaveBeenCalledWith(
      expect.objectContaining({
        req,
        projectId: '68ad85a7463006c963799a04',
        onProcessing: expect.any(Function)
      })
    );
    expect(mocks.clearPublicProject).toHaveBeenCalledWith(req);
  });

  it('forces the delegated call to non-stream and emits a redacted SSE result', async () => {
    const req = createRequest({ stream: true });
    const { res, chunks, headers } = createSseResponse();

    const response = await handler(req, res);

    expect(response).toBeUndefined();
    expect(delegatedBody?.stream).toBe(false);
    expect(headers['Content-Type']).toBe('text/event-stream;charset=utf-8');
    const raw = chunks.join('');
    expect(raw).toContain('event: customerServiceStatus');
    expect(raw).toContain('event: customerService');
    expect(raw).not.toMatch(/datasetId|collectionId|private-chunk-route/);
    expect(raw).not.toContain('68ad85a7463006c963799a01');
  });

  it('opens the SSE stream before the delegated chat result resolves', async () => {
    let resolveChat: ((response: typeof internalResponse) => void) | undefined;
    mocks.chatHandler.mockImplementation(async (req: NextApiRequest) => {
      delegatedBody = { ...req.body };
      startProcessing?.();
      return new Promise<typeof internalResponse>((resolve) => {
        resolveChat = resolve;
      });
    });
    const req = createRequest({ stream: true });
    const { res, chunks, end } = createSseResponse();

    const responsePromise = handler(req, res);
    await vi.waitFor(() => {
      expect(chunks.join('')).toContain('event: customerServiceStatus');
    });

    expect(delegatedBody?.stream).toBe(false);
    expect(end).not.toHaveBeenCalled();
    expect(chunks.join('')).not.toContain('event: answer');

    resolveChat?.(internalResponse);
    await responsePromise;

    expect(chunks.join('')).toContain('event: customerService');
    expect(end).toHaveBeenCalledOnce();
  });
});
