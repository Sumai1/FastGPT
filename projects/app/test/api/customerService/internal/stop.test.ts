import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  stopHandler: vi.fn(),
  authInternalProject: vi.fn(),
  hashRequestId: vi.fn(),
  setInternalProject: vi.fn(),
  clearInternalProject: vi.fn()
}));

vi.mock('@/pages/api/customer-service/v1/stop', () => ({ handler: mocks.stopHandler }));
vi.mock('@/service/customerService/internalAuth', () => ({
  authCustomerServiceInternalProject: mocks.authInternalProject,
  hashCustomerServiceInternalRequestId: mocks.hashRequestId
}));
vi.mock('@/service/customerService/context', () => ({
  setCustomerServiceInternalProxyProject: mocks.setInternalProject,
  clearCustomerServiceInternalProxyProject: mocks.clearInternalProject
}));

import { handler } from '@/pages/api/customer-service/internal/stop';

const projectId = '68ad85a7463006c963799a01';
const createRequest = () =>
  ({
    body: {
      projectId,
      requestId: 'browser-request',
      sessionId: 'browser-session',
      audience: 'internal'
    },
    query: {},
    headers: { authorization: 'Bearer browser-controlled-key' }
  }) as unknown as NextApiRequest;

describe('customer service internal stop API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authInternalProject.mockResolvedValue({
      auth: { tmbId: '68ad85a7463006c963799a02' },
      openApiKey: { apiKey: 'server-only-key' }
    });
    mocks.hashRequestId.mockReturnValue('hashed-internal-request');
    mocks.stopHandler.mockResolvedValue({ stopped: true });
  });

  it('binds the request identity to the authenticated member and injects only the server key', async () => {
    const req = createRequest();
    const originalBody = req.body;
    let delegatedBody: unknown;
    let delegatedAuthorization: string | undefined;
    mocks.stopHandler.mockImplementationOnce(async (delegatedReq: NextApiRequest) => {
      delegatedBody = { ...delegatedReq.body };
      delegatedAuthorization = delegatedReq.headers.authorization;
      return { stopped: true };
    });

    await expect(handler(req)).resolves.toEqual({ stopped: true });

    expect(mocks.authInternalProject).toHaveBeenCalledWith({ req, projectId });
    expect(mocks.hashRequestId).toHaveBeenCalledWith({
      tmbId: '68ad85a7463006c963799a02',
      requestId: 'browser-request'
    });
    expect(delegatedBody).toEqual({
      requestId: 'hashed-internal-request',
      sessionId: 'browser-session'
    });
    expect(delegatedAuthorization).toBe('Bearer server-only-key');
    expect(mocks.setInternalProject).toHaveBeenCalledWith({ req, projectId });
    expect(mocks.clearInternalProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });

  it('restores request state and clears trusted context when stopping fails', async () => {
    const req = createRequest();
    const originalBody = req.body;
    mocks.stopHandler.mockRejectedValueOnce(new Error('stop failed'));

    await expect(handler(req)).rejects.toThrow('stop failed');

    expect(mocks.clearInternalProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });
});
