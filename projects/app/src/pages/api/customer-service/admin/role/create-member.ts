import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminRoleCreateMemberBodySchema,
  CustomerServiceAdminRoleCreateMemberResponseSchema,
  type CustomerServiceAdminRoleCreateMemberResponse
} from '@fastgpt/global/openapi/customerService/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { hashStr } from '@fastgpt/global/common/string/tools';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { TeamMemberStatusEnum } from '@fastgpt/global/support/user/team/constant';
import { CustomerServiceResourceStatusEnum } from '@fastgpt/global/core/customerService/constants';
import { setCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';

/** 创建客服真实系统账号并加入团队，随后分配客服岗位与权限。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminRoleCreateMemberResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminRoleCreateMemberBodySchema
  }).body;
  const { teamId, tmbId: operatorTmbId } = await authCustomerServiceAdmin(req);

  let userId: string = '';
  let memberTmbId: string = '';

  await mongoSessionRun(async (session) => {
    // 1. 查找或创建 MongoUser
    let user = await MongoUser.findOne({ username: body.username }).session(session);
    if (!user) {
      const [newUser] = await MongoUser.create(
        [
          {
            username: body.username,
            password: hashStr(body.password)
          }
        ],
        { session }
      );
      user = newUser;
    } else {
      // 若已存在，更新密码以确保可登录
      await MongoUser.updateOne(
        { _id: user._id },
        { password: hashStr(body.password) },
        { session }
      );
    }
    userId = String(user._id);

    // 2. 查找或创建团队成员
    let tmb = await MongoTeamMember.findOne({
      teamId,
      userId: user._id
    }).session(session);

    if (!tmb) {
      const [newTmb] = await MongoTeamMember.create(
        [
          {
            teamId,
            userId: user._id,
            name: body.name,
            status: TeamMemberStatusEnum.active,
            createTime: new Date()
          }
        ],
        { session }
      );
      tmb = newTmb;
    } else {
      await MongoTeamMember.updateOne(
        { _id: tmb._id },
        { name: body.name, status: TeamMemberStatusEnum.active },
        { session }
      );
    }
    memberTmbId = String(tmb._id);

    if (!user.lastLoginTmbId) {
      await MongoUser.updateOne({ _id: user._id }, { lastLoginTmbId: tmb._id }, { session });
    }
  });

  // 3. 分配客服岗位与范围
  await setCustomerServiceMemberRole({
    teamId,
    tmbId: memberTmbId,
    role: body.role,
    status: CustomerServiceResourceStatusEnum.active,
    allowedCategoryIds: body.allowedCategoryIds || [],
    allowedModelIds: body.allowedModelIds || [],
    reason: body.reason,
    operatorTmbId
  });

  return CustomerServiceAdminRoleCreateMemberResponseSchema.parse({
    tmbId: memberTmbId,
    userId,
    username: body.username,
    name: body.name,
    role: body.role
  });
}

export default NextAPI(handler);
