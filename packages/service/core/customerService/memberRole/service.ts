import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceMemberRoleAuditActionEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import type { ClientSession } from '../../../common/mongo';
import { mongoSessionRun } from '../../../common/mongo/sessionRun';
import {
  createCustomerServiceMemberRoleAudit,
  findCustomerServiceMemberRole,
  upsertCustomerServiceMemberRole
} from './entity';

/** 设置成员唯一客服岗位；单岗位模型使编辑和审核无法同时生效，支持限定管理的产品范围。 */
export const setCustomerServiceMemberRole = ({
  teamId,
  tmbId,
  role,
  allowedCategoryIds = [],
  allowedModelIds = [],
  status = CustomerServiceResourceStatusEnum.active,
  reason,
  operatorTmbId,
  session
}: {
  teamId: string;
  tmbId: string;
  role: CustomerServiceMemberRoleEnum;
  allowedCategoryIds?: string[];
  allowedModelIds?: string[];
  status?: CustomerServiceResourceStatusEnum;
  reason: string;
  operatorTmbId: string;
  session?: ClientSession;
}) => {
  if (!reason.trim()) {
    throw new UserError('Member role change reason is required');
  }

  const changeRole = async (activeSession: ClientSession) => {
    const previous = await findCustomerServiceMemberRole({
      teamId,
      tmbId,
      session: activeSession
    });
    const binding = await upsertCustomerServiceMemberRole({
      teamId,
      tmbId,
      role,
      allowedCategoryIds,
      allowedModelIds,
      status,
      reason: reason.trim(),
      operatorTmbId,
      session: activeSession
    });
    await createCustomerServiceMemberRoleAudit({
      teamId,
      tmbId,
      action:
        status === CustomerServiceResourceStatusEnum.active
          ? CustomerServiceMemberRoleAuditActionEnum.set
          : CustomerServiceMemberRoleAuditActionEnum.disable,
      fromRole: previous?.role,
      toRole: role,
      fromStatus: previous?.status,
      toStatus: status,
      reason: reason.trim(),
      operatorTmbId,
      session: activeSession
    });
    return binding;
  };

  return session ? changeRole(session) : mongoSessionRun(changeRole);
};

/** 校验客服业务岗位；团队 owner 只在管理员岗位检查中作为兜底。 */
export const assertCustomerServiceMemberRole = async ({
  teamId,
  tmbId,
  requiredRole,
  isTeamOwner = false
}: {
  teamId: string;
  tmbId: string;
  requiredRole: CustomerServiceMemberRoleEnum;
  isTeamOwner?: boolean;
}) => {
  if (isTeamOwner && requiredRole === CustomerServiceMemberRoleEnum.customerServiceAdmin) return;

  const binding = await findCustomerServiceMemberRole({ teamId, tmbId });
  if (
    binding?.status !== CustomerServiceResourceStatusEnum.active ||
    binding.role !== requiredRole
  ) {
    throw new UserError('Customer service role permission denied');
  }
};

/** 校验成员至少具备一个给定客服岗位；团队 owner 可作为客服管理员参与匹配。 */
export const assertAnyCustomerServiceMemberRole = async ({
  teamId,
  tmbId,
  requiredRoles,
  isTeamOwner = false
}: {
  teamId: string;
  tmbId: string;
  requiredRoles: CustomerServiceMemberRoleEnum[];
  isTeamOwner?: boolean;
}) => {
  if (isTeamOwner && requiredRoles.includes(CustomerServiceMemberRoleEnum.customerServiceAdmin)) {
    return;
  }

  const binding = await findCustomerServiceMemberRole({ teamId, tmbId });
  if (
    binding?.status !== CustomerServiceResourceStatusEnum.active ||
    !requiredRoles.includes(binding.role)
  ) {
    throw new UserError('Customer service role permission denied');
  }
};
