import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceRoles } from '@/service/customerService/adminAuth';
import { formatCustomerServiceMemberRoleAudits } from '@/service/customerService/format';
import {
  CustomerServiceAdminRoleAuditListResponseSchema,
  type CustomerServiceAdminRoleAuditListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { listCustomerServiceMemberRoleAudits } from '@fastgpt/service/core/customerService/memberRole/entity';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

/** 获取团队客服岗位流转审计日志。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminRoleAuditListResponse> {
  const { teamId } = await authCustomerServiceRoles({
    req,
    roles: [CustomerServiceMemberRoleEnum.customerServiceAdmin]
  });
  const audits = await listCustomerServiceMemberRoleAudits({ teamId, limit: 100 });
  const tmbIds = Array.from(
    new Set(audits.flatMap((item) => [String(item.tmbId), String(item.operatorTmbId)]))
  );
  const members = await MongoTeamMember.find({
    teamId,
    _id: { $in: tmbIds }
  })
    .select('_id name avatar')
    .lean();
  const memberMap = new Map(
    members.map((member) => [String(member._id), { name: member.name, avatar: member.avatar }])
  );
  return CustomerServiceAdminRoleAuditListResponseSchema.parse(
    formatCustomerServiceMemberRoleAudits(audits, memberMap)
  );
}

export default NextAPI(handler);
