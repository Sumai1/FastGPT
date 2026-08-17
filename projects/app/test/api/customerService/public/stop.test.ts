import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  stopHandler: vi.fn(),
  authPublicProject: vi.fn(),
  hashRequestId: vi.fn(),
  setPublicProject: vi.fn(),
  clearPublicProject: vi.fn()
}));

vi.mock('@/pages/api/customer-service/v1/stop', () => ({ handler: mocks.stopHandler }));
vi.mock('@/service/customerService/publicAuth', () => ({
  authCustomerServicePublicProject: mocks.authPublicProject,
  hashCustomerServicePublicRequestId: mocks.hashRequestId
}));
vi.mock('@/service/customerService/context', () => ({
  setCustomerServicePublicProxyProject: mocks.setPublicProject,
  clearCustomerServicePublicProxyProject: mocks.clearPublicProject
}));

import { handler } from '@/pages/api/customer-service/public/stop';

const publicId = 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8';
const projectId = '68ad85a7463006c963799a01';
const createRequest = () =>
  ({
    body: {
      publicId,
      requestId: 'browser-request',
      sessionId: 'browser-session',
      projectId: 'browser-controlled-project',
      audience: 'internal'
    },
    query: {},
    headers: { authorization: 'Bearer browser-controlled-key' }
  }) as unknown as NextApiRequest;

describe('customer service public stop API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authPublicProject.mockResolvedValue({
      projectId,
      openApiKey: { apiKey: 'server-only-key' }
    });
    mocks.hashRequestId.mockReturnValue('hashed-public-request');
    mocks.stopHandler.mockResolvedValue({ stopped: true });
  });

  it('delegates only the hashed visitor identity with the server-side key', async () => {
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

    expect(mocks.authPublicProject).toHaveBeenCalledWith({ publicId });
    expect(mocks.hashRequestId).toHaveBeenCalledWith({
      sessionId: 'browser-session',
      requestId: 'browser-request'
    });
    expect(delegatedBody).toEqual({
      requestId: 'hashed-public-request',
      sessionId: 'browser-session'
    });
    expect(delegatedAuthorization).toBe('Bearer server-only-key');
    expect(mocks.setPublicProject).toHaveBeenCalledWith({ req, projectId });
    expect(mocks.clearPublicProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });

  it('restores request state and clears trusted context when stopping fails', async () => {
    const req = createRequest();
    const originalBody = req.body;
    mocks.stopHandler.mockRejectedValueOnce(new Error('stop failed'));

    await expect(handler(req)).rejects.toThrow('stop failed');

    expect(mocks.clearPublicProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });
});
