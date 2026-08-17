import { describe, expect, it } from 'vitest';
import { getFakeUsers } from '@test/datas/users';
import { Call } from '@test/utils/request';
import handler from '@/pages/api/customer-service/admin/health';
import { setCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceAdminHealthResponse } from '@fastgpt/global/openapi/customerService/api';

describe('customer service health API', () => {
  it('allows a customer-service role to inspect safe runtime readiness fields', async () => {
    const { owner, members } = await getFakeUsers(1);
    const reviewer = members[0];
    await setCustomerServiceMemberRole({
      teamId: String(owner.teamId),
      tmbId: String(reviewer.tmbId),
      role: CustomerServiceMemberRoleEnum.knowledgeReviewer,
      reason: '配置健康检查测试岗位',
      operatorTmbId: String(owner.tmbId)
    });

    const response = await Call<
      Record<string, never>,
      Record<string, never>,
      CustomerServiceAdminHealthResponse
    >(handler, { auth: reviewer });

    expect(response.code).toBe(200);
    expect(response.data).toEqual(
      expect.objectContaining({
        status: expect.stringMatching(/^(ok|degraded)$/),
        mongoConnected: true,
        llmModelCount: expect.any(Number),
        embeddingModelCount: expect.any(Number),
        messages: expect.any(Array),
        checkedAt: expect.any(Date)
      })
    );
    expect(response.data).not.toHaveProperty('url');
    expect(response.data).not.toHaveProperty('key');
  });
});
