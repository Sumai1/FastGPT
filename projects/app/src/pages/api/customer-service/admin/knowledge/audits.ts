import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceRoles } from '@/service/customerService/adminAuth';
import { formatCustomerServiceKnowledgeAudits } from '@/service/customerService/format';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeAuditListQuerySchema,
  CustomerServiceAdminKnowledgeAuditListResponseSchema,
  type CustomerServiceAdminKnowledgeAuditListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listCustomerServiceKnowledgeAudits } from '@fastgpt/service/core/customerService/knowledge/entity';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/**
 * 获取知识治理流转审计历史。
 * 支持按单个知识记录 ID 或整个版本组 ID 查询，包含操作人姓名、头像和审核批注。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminKnowledgeAuditListResponse> {
  const { query } = parseApiInput({
    req,
    querySchema: CustomerServiceAdminKnowledgeAuditListQuerySchema
  });
  const { teamId } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor,
      CustomerServiceMemberRoleEnum.knowledgeReviewer
    ]
  });

  const audits = await listCustomerServiceKnowledgeAudits({
    teamId,
    knowledgeId: query.knowledgeId,
    versionGroupId: query.versionGroupId
  });

  const operatorTmbIds = Array.from(new Set(audits.map((item) => String(item.operatorTmbId))));
  const members = await MongoTeamMember.find({
    teamId,
    _id: { $in: operatorTmbIds }
  })
    .select('_id name avatar')
    .lean();
  const memberMap = new Map(
    members.map((member) => [String(member._id), { name: member.name, avatar: member.avatar }])
  );

  return CustomerServiceAdminKnowledgeAuditListResponseSchema.parse(
    formatCustomerServiceKnowledgeAudits(audits, memberMap)
  );
}

export default NextAPI(handler);
