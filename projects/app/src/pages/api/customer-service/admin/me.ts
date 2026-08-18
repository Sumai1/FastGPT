import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceRoles } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminMeResponseSchema,
  type CustomerServiceAdminMeResponse
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { findCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/entity';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { initCustomerServiceAccounts } from '@/service/mongo';

/** 返回当前成员实际生效的客服岗位；团队 owner 按管理员兜底，不伪造岗位记录。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminMeResponse> {
  const auth = await authCustomerServiceRoles({
    req,
    roles: Object.values(CustomerServiceMemberRoleEnum)
  });
  const isTeamOwner = auth.isRoot || auth.permission.isOwner;

  if (isTeamOwner) {
    try {
      await mongoSessionRun(async (session) => {
        await initCustomerServiceAccounts(session, auth.teamId, auth.tmbId);
      });
    } catch {
      // silent fallback
    }
  }

  const binding = await findCustomerServiceMemberRole({ teamId: auth.teamId, tmbId: auth.tmbId });
  const role = isTeamOwner
    ? CustomerServiceMemberRoleEnum.customerServiceAdmin
    : (binding?.role ?? CustomerServiceMemberRoleEnum.knowledgeEditor);
  const isAdmin = role === CustomerServiceMemberRoleEnum.customerServiceAdmin;

  return CustomerServiceAdminMeResponseSchema.parse({
    role,
    isTeamOwner,
    capabilities: {
      manageProjects: isAdmin,
      editKnowledge: isAdmin || role === CustomerServiceMemberRoleEnum.knowledgeEditor,
      reviewKnowledge: isAdmin || role === CustomerServiceMemberRoleEnum.knowledgeReviewer,
      viewOperations: true,
      manageRoles: isAdmin
    }
  });
}

export default NextAPI(handler);
