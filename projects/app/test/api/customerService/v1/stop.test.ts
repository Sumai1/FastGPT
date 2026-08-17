import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authExternalRequest: vi.fn(),
  findProcessingRequest: vi.fn(),
  setRuntimeStop: vi.fn(),
  waitForWorkflowComplete: vi.fn()
}));

vi.mock('@/service/customerService/externalAuth', () => ({
  authCustomerServiceExternalRequest: mocks.authExternalRequest
}));
vi.mock('@fastgpt/service/core/customerService/request/service', () => ({
  findProcessingCustomerServiceRequest: mocks.findProcessingRequest
}));
vi.mock('@fastgpt/service/core/workflow/dispatch/workflowStatus', () => ({
  setAgentRuntimeStop: mocks.setRuntimeStop,
  waitForWorkflowComplete: mocks.waitForWorkflowComplete
}));

import { handler } from '@/pages/api/customer-service/v1/stop';

const createRequest = () =>
  ({
    body: { requestId: 'stop-request', sessionId: 'stop-session' },
    query: {},
    headers: { authorization: 'Bearer customer-service-key' }
  }) as unknown as NextApiRequest;

describe('customer service v1 stop API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authExternalRequest.mockResolvedValue({
      teamId: '68ad85a7463006c963799a01',
      project: { _id: '68ad85a7463006c963799a02' },
      binding: { openApiKeyId: '68ad85a7463006c963799a03' },
      app: { _id: '68ad85a7463006c963799a04' }
    });
    mocks.findProcessingRequest.mockResolvedValue({
      _id: '68ad85a7463006c963799a05',
      internalChatId: 'internal-chat-id'
    });
    mocks.setRuntimeStop.mockResolvedValue(undefined);
    mocks.waitForWorkflowComplete.mockResolvedValue(undefined);
  });

  it('stops only the processing request owned by the authenticated project and key', async () => {
    await expect(handler(createRequest())).resolves.toEqual({ stopped: true });

    expect(mocks.findProcessingRequest).toHaveBeenCalledWith({
      teamId: '68ad85a7463006c963799a01',
      projectId: '68ad85a7463006c963799a02',
      openApiKeyId: '68ad85a7463006c963799a03',
      requestId: 'stop-request',
      sessionId: 'stop-session'
    });
    expect(mocks.setRuntimeStop).toHaveBeenCalledWith({
      sourceType: 'app',
      sourceId: '68ad85a7463006c963799a04',
      chatId: 'internal-chat-id'
    });
    expect(mocks.waitForWorkflowComplete).toHaveBeenCalledWith({
      sourceType: 'app',
      sourceId: '68ad85a7463006c963799a04',
      chatId: 'internal-chat-id',
      timeout: 5000
    });
  });

  it('does not create a broad stop marker when the exact request is no longer processing', async () => {
    mocks.findProcessingRequest.mockResolvedValueOnce(null);

    await expect(handler(createRequest())).rejects.toThrow(
      'Customer service request is not processing'
    );
    expect(mocks.setRuntimeStop).not.toHaveBeenCalled();
    expect(mocks.waitForWorkflowComplete).not.toHaveBeenCalled();
  });
});
