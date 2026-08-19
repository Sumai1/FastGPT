import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import {
  CustomerServiceAdminMeResponseSchema,
  type CustomerServiceAdminMeResponse
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { findCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/entity';

/** 返回当前成员实际生效的客服岗位；团队 owner 按管理员兜底，普通无角色成员不赋予管理权限。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminMeResponse> {
  const auth = await authUserPer({ req, authToken: true, per: ReadPermissionVal });
  const isTeamOwner = auth.isRoot || auth.permission.isOwner || auth.permission.hasManagePer;
  const binding = await findCustomerServiceMemberRole({ teamId: auth.teamId, tmbId: auth.tmbId });

  const role = isTeamOwner
    ? CustomerServiceMemberRoleEnum.customerServiceAdmin
    : (binding?.role ?? null);

  const isAdmin = isTeamOwner || role === CustomerServiceMemberRoleEnum.customerServiceAdmin;
  const isReviewer = isAdmin || role === CustomerServiceMemberRoleEnum.knowledgeReviewer;
  const isEditor = isAdmin || role === CustomerServiceMemberRoleEnum.knowledgeEditor;

  return CustomerServiceAdminMeResponseSchema.parse({
    role,
    isTeamOwner,
    capabilities: {
      manageProjects: isAdmin,
      editKnowledge: isEditor,
      reviewKnowledge: isReviewer,
      viewOperations: isAdmin,
      manageRoles: isAdmin
    }
  });
}

export default NextAPI(handler);
