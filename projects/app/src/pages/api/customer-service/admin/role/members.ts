import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminRoleMemberListResponseSchema,
  type CustomerServiceAdminRoleMemberListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listCustomerServiceMemberRoles } from '@fastgpt/service/core/customerService/memberRole/entity';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

/** 返回团队成员名称及当前客服岗位，供业务控制台直接配置职责。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminRoleMemberListResponse> {
  const { teamId } = await authCustomerServiceAdmin(req);
  const [members, roles] = await Promise.all([
    MongoTeamMember.find({ teamId }).select('_id name avatar role status').sort({ name: 1 }).lean(),
    listCustomerServiceMemberRoles({ teamId })
  ]);
  const roleMap = new Map(roles.map((item) => [String(item.tmbId), item]));

  return CustomerServiceAdminRoleMemberListResponseSchema.parse(
    members.map((member) => ({
      tmbId: String(member._id),
      name: member.name,
      avatar: member.avatar,
      teamRole: member.role || 'member',
      status: member.status || 'active',
      customerServiceRole: roleMap.get(String(member._id))?.role ?? null,
      customerServiceRoleStatus: roleMap.get(String(member._id))?.status ?? null
    }))
  );
}

export default NextAPI(handler);
