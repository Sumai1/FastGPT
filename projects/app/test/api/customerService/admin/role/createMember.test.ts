import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';

const mocks = vi.hoisted(() => ({
  authAdmin: vi.fn(),
  setRole: vi.fn(),
  sessionRun: vi.fn((fn: (session: any) => Promise<any>) => fn({})),
  userFindOne: vi.fn(),
  userCreate: vi.fn(),
  tmbFindOne: vi.fn(),
  tmbCreate: vi.fn()
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
vi.mock('@fastgpt/service/core/customerService/memberRole/service', () => ({
  setCustomerServiceMemberRole: mocks.setRole
}));
vi.mock('@fastgpt/service/support/user/schema', () => ({
  MongoUser: {
    findOne: () => ({ session: mocks.userFindOne }),
    create: mocks.userCreate,
    updateOne: vi.fn()
  }
}));
vi.mock('@fastgpt/service/support/user/team/teamMemberSchema', () => ({
  MongoTeamMember: {
    findOne: () => ({ session: mocks.tmbFindOne }),
    create: mocks.tmbCreate,
    updateOne: vi.fn()
  }
}));

import { default as handler } from '@/pages/api/customer-service/admin/role/create-member';

describe('create customer service member API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authAdmin.mockResolvedValue({
      teamId: '68ad85a7463006c963799a01',
      tmbId: '68ad85a7463006c963799a02'
    });
  });

  it('creates user and team member, then assigns customer service role', async () => {
    mocks.userFindOne.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue([{ _id: '68ad85a7463006c963799a10', username: 'editor1' }]);
    mocks.tmbFindOne.mockResolvedValue(null);
    mocks.tmbCreate.mockResolvedValue([{ _id: '68ad85a7463006c963799a20', name: '采编员李明' }]);
    mocks.setRole.mockResolvedValue(undefined);

    const req = {
      body: {
        username: 'editor1',
        name: '采编员李明',
        password: '1234',
        role: CustomerServiceMemberRoleEnum.knowledgeEditor,
        allowedCategoryIds: ['68ad85a7463006c963799a05'],
        allowedModelIds: [],
        reason: '新成员入职'
      },
      query: {}
    } as unknown as NextApiRequest;

    const res = await (handler as any)(req);

    expect(mocks.authAdmin).toHaveBeenCalledWith(req);
    expect(mocks.userCreate).toHaveBeenCalled();
    expect(mocks.tmbCreate).toHaveBeenCalled();
    expect(mocks.setRole).toHaveBeenCalledWith({
      teamId: '68ad85a7463006c963799a01',
      tmbId: '68ad85a7463006c963799a20',
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      status: 'active',
      allowedCategoryIds: ['68ad85a7463006c963799a05'],
      allowedModelIds: [],
      reason: '新成员入职',
      operatorTmbId: '68ad85a7463006c963799a02'
    });
    expect(res.username).toBe('editor1');
    expect(res.role).toBe(CustomerServiceMemberRoleEnum.knowledgeEditor);
  });
});
