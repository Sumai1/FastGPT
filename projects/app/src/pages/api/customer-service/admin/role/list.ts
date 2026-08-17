import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import { formatCustomerServiceMemberRoles } from '@/service/customerService/format';
import {
  CustomerServiceAdminRoleListResponseSchema,
  type CustomerServiceAdminRoleListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listCustomerServiceMemberRoles } from '@fastgpt/service/core/customerService/memberRole/entity';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

/** 获取当前团队客服岗位绑定。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminRoleListResponse> {
  const { teamId } = await authCustomerServiceAdmin(req);
  const roles = await listCustomerServiceMemberRoles({ teamId });
  const members = await MongoTeamMember.find({
    teamId,
    _id: { $in: roles.map((item) => item.tmbId) }
  })
    .select('_id name avatar')
    .lean();
  const memberMap = new Map(
    members.map((member) => [String(member._id), { name: member.name, avatar: member.avatar }])
  );
  return CustomerServiceAdminRoleListResponseSchema.parse(
    formatCustomerServiceMemberRoles(roles, memberMap)
  );
}

export default NextAPI(handler);
