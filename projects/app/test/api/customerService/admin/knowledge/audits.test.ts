import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authRoles: vi.fn(),
  listAudits: vi.fn(),
  findMembers: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceRoles: mocks.authRoles
}));
vi.mock('@fastgpt/service/core/customerService/knowledge/entity', () => ({
  listCustomerServiceKnowledgeAudits: mocks.listAudits
}));
vi.mock('@fastgpt/service/support/user/team/teamMemberSchema', () => ({
  MongoTeamMember: {
    find: () => ({
      select: () => ({
        lean: mocks.findMembers
      })
    })
  }
}));

import { default as handler } from '@/pages/api/customer-service/admin/knowledge/audits';

describe('customer service knowledge audits API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authRoles.mockResolvedValue({
      teamId: '68ad85a7463006c963799a01',
      tmbId: '68ad85a7463006c963799a02'
    });
  });

  it('queries audits by knowledgeId and populates operator info', async () => {
    const knowledgeId = '68ad85a7463006c963799a15';
    const operatorTmbId = '68ad85a7463006c963799a02';
    mocks.listAudits.mockResolvedValue([
      {
        _id: '68ad85a7463006c963799a99',
        knowledgeId,
        versionGroupId: '68ad85a7463006c963799a11',
        version: 1,
        diffSummary: '初始版本创建',
        action: 'create',
        toStatus: 'draft',
        reason: '',
        operatorTmbId,
        createTime: new Date('2026-08-11T00:00:00.000Z')
      }
    ]);
    mocks.findMembers.mockResolvedValue([
      {
        _id: operatorTmbId,
        name: '张三',
        avatar: '/avatar.png'
      }
    ]);

    const req = {
      query: { knowledgeId }
    } as unknown as NextApiRequest;

    const result = await handler(req);
    expect(result).toHaveLength(1);
    expect(result[0].operatorName).toBe('张三');
    expect(result[0].operatorAvatar).toBe('/avatar.png');
    expect(result[0].diffSummary).toBe('初始版本创建');
  });
});
