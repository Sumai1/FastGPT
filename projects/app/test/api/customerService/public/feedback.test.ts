import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  feedbackHandler: vi.fn(),
  authPublicProject: vi.fn(),
  setPublicProject: vi.fn(),
  clearPublicProject: vi.fn()
}));

vi.mock('@/pages/api/customer-service/v1/feedback', () => ({
  handler: mocks.feedbackHandler
}));
vi.mock('@/service/customerService/publicAuth', () => ({
  authCustomerServicePublicProject: mocks.authPublicProject
}));
vi.mock('@/service/customerService/context', () => ({
  setCustomerServicePublicProxyProject: mocks.setPublicProject,
  clearCustomerServicePublicProxyProject: mocks.clearPublicProject
}));

import { handler } from '@/pages/api/customer-service/public/feedback';

const publicId = 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8';
const projectId = '68ad85a7463006c963799a01';
const createRequest = () =>
  ({
    body: {
      publicId,
      projectId: '68ad85a7463006c963799a09',
      audience: 'internal',
      sessionId: 'visitor-session',
      messageId: 'response-message',
      type: 'unresolved',
      content: '仍未解决'
    },
    query: {},
    headers: { authorization: 'Bearer browser-controlled-key' }
  }) as unknown as NextApiRequest;

describe('customer service public feedback API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authPublicProject.mockResolvedValue({
      projectId,
      openApiKey: { apiKey: 'server-only-key' }
    });
    mocks.feedbackHandler.mockResolvedValue(undefined);
  });

  it('delegates only allowlisted feedback fields and restores the request', async () => {
    const req = createRequest();
    const originalBody = req.body;
    let delegatedBody: unknown;
    let delegatedAuthorization: string | undefined;
    mocks.feedbackHandler.mockImplementationOnce(async (delegatedReq: NextApiRequest) => {
      delegatedBody = { ...delegatedReq.body };
      delegatedAuthorization = delegatedReq.headers.authorization;
    });

    await handler(req);

    expect(mocks.authPublicProject).toHaveBeenCalledWith({ publicId });
    expect(delegatedBody).toEqual({
      sessionId: 'visitor-session',
      messageId: 'response-message',
      type: 'unresolved',
      content: '仍未解决'
    });
    expect(delegatedAuthorization).toBe('Bearer server-only-key');
    expect(mocks.setPublicProject).toHaveBeenCalledWith({ req, projectId });
    expect(mocks.clearPublicProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });

  it('clears trusted proxy state when the delegated handler fails', async () => {
    const req = createRequest();
    const originalBody = req.body;
    mocks.feedbackHandler.mockRejectedValueOnce(new Error('feedback failed'));

    await expect(handler(req)).rejects.toThrow('feedback failed');

    expect(mocks.clearPublicProject).toHaveBeenCalledWith(req);
    expect(req.body).toBe(originalBody);
    expect(req.headers.authorization).toBe('Bearer browser-controlled-key');
  });
});
