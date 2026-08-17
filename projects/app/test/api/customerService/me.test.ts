import { describe, expect, it } from 'vitest';
import { getFakeUsers } from '@test/datas/users';
import { Call } from '@test/utils/request';
import handler from '@/pages/api/customer-service/admin/me';
import { setCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceAdminMeResponse } from '@fastgpt/global/openapi/customerService/api';

describe('customer service current member API', () => {
  it('returns editor capabilities without granting project or review management', async () => {
    const { owner, members } = await getFakeUsers(1);
    const editor = members[0];
    await setCustomerServiceMemberRole({
      teamId: String(owner.teamId),
      tmbId: String(editor.tmbId),
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      reason: '配置测试知识编辑岗位',
      operatorTmbId: String(owner.tmbId)
    });

    const response = await Call<
      Record<string, never>,
      Record<string, never>,
      CustomerServiceAdminMeResponse
    >(handler, { auth: editor });

    expect(response.code).toBe(200);
    expect(response.data).toEqual({
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      isTeamOwner: false,
      capabilities: {
        manageProjects: false,
        editKnowledge: true,
        reviewKnowledge: false,
        viewOperations: true,
        manageRoles: false
      }
    });
  });
});
