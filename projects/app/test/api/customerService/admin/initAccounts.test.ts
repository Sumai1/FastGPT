import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authAdmin: vi.fn(),
  initAccounts: vi.fn(),
  sessionRun: vi.fn((fn: (session: any) => Promise<any>) => fn({}))
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceAdmin: mocks.authAdmin
}));
vi.mock('@fastgpt/service/common/mongo/sessionRun', () => ({
  mongoSessionRun: mocks.sessionRun
}));
vi.mock('@/service/mongo', () => ({
  initCustomerServiceAccounts: mocks.initAccounts
}));

import { default as handler } from '@/pages/api/customer-service/admin/init-accounts';

describe('init customer service accounts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authAdmin.mockResolvedValue({
      teamId: '68ad85a7463006c963799a01',
      tmbId: '68ad85a7463006c963799a02'
    });
  });

  it('runs initialization session and returns created account summaries', async () => {
    const req = {
      body: {},
      query: {}
    } as unknown as NextApiRequest;

    const res = await (handler as any)(req);

    expect(mocks.authAdmin).toHaveBeenCalledWith(req);
    expect(mocks.sessionRun).toHaveBeenCalled();
    expect(mocks.initAccounts).toHaveBeenCalledWith(
      expect.anything(),
      '68ad85a7463006c963799a01',
      '68ad85a7463006c963799a02'
    );
    expect(res.success).toBe(true);
    expect(res.accounts).toHaveLength(2);
    expect(res.accounts[0].username).toBe('editor');
    expect(res.accounts[1].username).toBe('reviewer');
  });
});
