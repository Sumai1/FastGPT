import type { NextApiRequest, NextApiResponse } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@fastgpt/service/common/response');

const mocks = vi.hoisted(() => ({
  authCert: vi.fn(),
  countDocuments: vi.fn(),
  find: vi.fn()
}));

vi.mock('@fastgpt/service/support/permission/auth/common', () => ({
  authCert: mocks.authCert
}));

vi.mock('@fastgpt/service/support/user/team/teamMemberSchema', () => ({
  MongoTeamMember: {
    countDocuments: mocks.countDocuments,
    find: mocks.find,
    updateOne: vi.fn()
  }
}));

vi.mock('@fastgpt/service/support/user/team/teamSchema', () => ({
  MongoTeam: {
    find: vi.fn()
  }
}));

vi.mock('@fastgpt/service/support/user/schema', () => ({
  MongoUser: {
    updateOne: vi.fn()
  }
}));

import { handleProApiFallback } from '@/service/support/user/team/proApiFallback';

describe('proApiFallback for open source community mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCert.mockResolvedValue({
      userId: '68ad85a7463006c963799a01',
      teamId: '68ad85a7463006c963799a02',
      tmbId: '68ad85a7463006c963799a03'
    });
  });

  it('handles member count request when commercial URL is unconfigured', async () => {
    mocks.countDocuments.mockResolvedValue(5);

    const req = {
      method: 'GET',
      headers: {},
      query: {}
    } as unknown as NextApiRequest;

    let resData: any = null;
    const jsonFn = vi.fn((d) => {
      resData = d;
    });
    const res = {
      status: vi.fn().mockReturnValue({
        json: jsonFn
      }),
      json: jsonFn
    } as unknown as NextApiResponse;

    const handled = await handleProApiFallback(req, res, [
      'support',
      'user',
      'team',
      'member',
      'count'
    ]);

    expect(handled).toBe(true);
    expect(resData?.data?.count).toBe(5);
  });
});
