import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import {
  MongoCustomerServiceMemberRole,
  MongoCustomerServiceMemberRoleAudit
} from '@fastgpt/service/core/customerService/memberRole/schema';
import {
  assertCustomerServiceMemberRole,
  setCustomerServiceMemberRole
} from '@fastgpt/service/core/customerService/memberRole/service';

const id = () => new Types.ObjectId();

describe('customer service member roles', () => {
  beforeAll(async () => {
    await Promise.all([
      MongoCustomerServiceMemberRole.syncIndexes(),
      MongoCustomerServiceMemberRoleAudit.syncIndexes()
    ]);
  });

  it('keeps only one current role and records each change', async () => {
    const teamId = String(id());
    const tmbId = String(id());
    const operatorTmbId = String(id());
    await setCustomerServiceMemberRole({
      teamId,
      tmbId,
      operatorTmbId,
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      status: CustomerServiceResourceStatusEnum.active,
      reason: '负责资料编辑'
    });
    await assertCustomerServiceMemberRole({
      teamId,
      tmbId,
      requiredRole: CustomerServiceMemberRoleEnum.knowledgeEditor
    });

    await setCustomerServiceMemberRole({
      teamId,
      tmbId,
      operatorTmbId,
      role: CustomerServiceMemberRoleEnum.knowledgeReviewer,
      status: CustomerServiceResourceStatusEnum.active,
      reason: '调整为审核岗位'
    });
    await expect(
      assertCustomerServiceMemberRole({
        teamId,
        tmbId,
        requiredRole: CustomerServiceMemberRoleEnum.knowledgeEditor
      })
    ).rejects.toThrow('Customer service role permission denied');
    await assertCustomerServiceMemberRole({
      teamId,
      tmbId,
      requiredRole: CustomerServiceMemberRoleEnum.knowledgeReviewer
    });
    expect(await MongoCustomerServiceMemberRole.countDocuments({ teamId, tmbId })).toBe(1);
    expect(await MongoCustomerServiceMemberRoleAudit.countDocuments({ teamId, tmbId })).toBe(2);
  });

  it('allows owner fallback only for the administrator role', async () => {
    const params = { teamId: String(id()), tmbId: String(id()), isTeamOwner: true };
    await assertCustomerServiceMemberRole({
      ...params,
      requiredRole: CustomerServiceMemberRoleEnum.customerServiceAdmin
    });
    await expect(
      assertCustomerServiceMemberRole({
        ...params,
        requiredRole: CustomerServiceMemberRoleEnum.knowledgeReviewer
      })
    ).rejects.toThrow('Customer service role permission denied');
  });

  it('stores and updates allowed product categories and models', async () => {
    const teamId = String(id());
    const tmbId = String(id());
    const operatorTmbId = String(id());
    const categoryId = String(id());
    const modelId = String(id());

    await setCustomerServiceMemberRole({
      teamId,
      tmbId,
      operatorTmbId,
      role: CustomerServiceMemberRoleEnum.knowledgeEditor,
      allowedCategoryIds: [categoryId],
      allowedModelIds: [modelId],
      status: CustomerServiceResourceStatusEnum.active,
      reason: '分配限定产品线'
    });

    const stored = await MongoCustomerServiceMemberRole.findOne({ teamId, tmbId }).lean();
    expect(stored?.allowedCategoryIds?.map(String)).toEqual([categoryId]);
    expect(stored?.allowedModelIds?.map(String)).toEqual([modelId]);
  });
});
