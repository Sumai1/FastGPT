import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authPublicProject: vi.fn(),
  saveHandoffSnapshot: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/publicAuth', () => ({
  authCustomerServicePublicProject: mocks.authPublicProject
}));
vi.mock('@fastgpt/service/core/customerService/request/service', () => ({
  saveCustomerServiceHandoffSnapshot: mocks.saveHandoffSnapshot
}));

import { handler } from '@/pages/api/customer-service/public/handoff';

describe('customer service public handoff API', () => {
  const publicId = 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8';
  const projectId = '68ad85a7463006c963799a01';
  const teamId = '68ad85a7463006c963799a02';
  const openApiKeyId = '68ad85a7463006c963799a03';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authPublicProject.mockResolvedValue({
      teamId,
      projectId,
      binding: { openApiKeyId }
    });
    mocks.saveHandoffSnapshot.mockResolvedValue({ _id: 'request-1' });
  });

  it('saves troubleshooting checklist snapshot via parseApiInput', async () => {
    const req = {
      body: {
        publicId,
        sessionId: 'visitor-001',
        productModelName: 'DT-2026A',
        hardwareVersionName: 'V2',
        softwareVersionName: 'V3.1',
        faultCode: 'E-1002',
        completedSteps: ['重启设备', '检查网线'],
        summaryText: '红灯常亮无法打印'
      }
    } as unknown as NextApiRequest;

    const result = await handler(req);
    expect(result).toBeUndefined();
    expect(mocks.authPublicProject).toHaveBeenCalledWith({ publicId });
    expect(mocks.saveHandoffSnapshot).toHaveBeenCalledWith({
      teamId,
      projectId,
      openApiKeyId,
      sessionId: 'visitor-001',
      requestId: undefined,
      handoffSnapshot: {
        productModelName: 'DT-2026A',
        hardwareVersionName: 'V2',
        softwareVersionName: 'V3.1',
        faultCode: 'E-1002',
        completedSteps: ['重启设备', '检查网线'],
        summaryText: '红灯常亮无法打印'
      }
    });
  });
});
