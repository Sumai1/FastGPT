import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoResourcePermission } from '@fastgpt/service/support/permission/schema';
import { getResourceOwnedClbs, getClbsInfo } from '@fastgpt/service/support/permission/controller';
import { PerResourceTypeEnum } from '@fastgpt/global/support/permission/constant';
import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/schema';
import { setCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import {
  TeamMemberRoleEnum,
  TeamMemberStatusEnum
} from '@fastgpt/global/support/user/team/constant';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { TeamDefaultRoleVal } from '@fastgpt/global/support/permission/user/constant';
import type { TeamSchema } from '@fastgpt/global/support/user/team/type';

/**
 * 解析 body 辅助函数 (兼容 Next.js bodyParser: false)
 */
async function parseJsonBody(req: NextApiRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * 开源社区版环境下，在未配置 FastGPTProUrl (商业版服务) 时，
 * 自动提供原生团队与成员管理的本地 MongoDB 数据降级支持，避免前端弹窗“未配置商业版链接”。
 */
export async function handleProApiFallback(
  req: NextApiRequest,
  res: NextApiResponse,
  pathArray: string[]
): Promise<boolean> {
  const pathStr = pathArray.join('/');

  // 1. 获取团队成员数量 /support/user/team/member/count
  if (pathStr === 'support/user/team/member/count' && req.method === 'GET') {
    const { teamId } = await authCert({ req, authToken: true });
    const count = await MongoTeamMember.countDocuments({
      teamId,
      status: { $ne: TeamMemberStatusEnum.leave }
    });
    jsonRes(res, { data: { count } });
    return true;
  }

  // 2. 获取当前用户的团队列表 /support/user/team/list
  if (pathStr === 'support/user/team/list' && req.method === 'GET') {
    const { userId } = await authCert({ req, authToken: true });
    const statusQuery = (req.query.status as string) || TeamMemberStatusEnum.active;
    const members = await MongoTeamMember.find({
      userId,
      status: statusQuery
    })
      .populate<{ team: TeamSchema }>('team')
      .lean();

    const list = members.map((tmb) => ({
      userId: String(tmb.userId),
      teamId: String(tmb.teamId),
      teamAvatar: tmb.team?.avatar || '/icon/logo.svg',
      teamName: tmb.team?.name || 'My Team',
      memberName: tmb.name,
      avatar: tmb.avatar || '',
      balance: tmb.team?.balance ?? 0,
      tmbId: String(tmb._id),
      role: tmb.role || TeamMemberRoleEnum.owner,
      status: tmb.status,
      permission: new TeamPermission({
        role: TeamDefaultRoleVal,
        isOwner: tmb.role === TeamMemberRoleEnum.owner
      }),
      notificationAccount: tmb.team?.notificationAccount,
      openaiAccount: tmb.team?.openaiAccount,
      externalWorkflowVariables: tmb.team?.externalWorkflowVariables,
      isWecomTeam: !!tmb.team?.meta?.wecom
    }));
    jsonRes(res, { data: list });
    return true;
  }

  // 3. 分页查询团队成员列表 /support/user/team/member/list
  if (pathStr === 'support/user/team/member/list' && req.method === 'POST') {
    const { teamId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    const pageNum = Number(body.pageNum) || 1;
    const pageSize = Number(body.pageSize) || 20;
    const status = body.status;
    const searchKey = body.searchKey;

    const match: Record<string, any> = { teamId };
    if (status) {
      match.status = status;
    } else {
      match.status = { $ne: TeamMemberStatusEnum.leave };
    }
    if (searchKey) {
      match.name = { $regex: searchKey, $options: 'i' };
    }

    const [total, members] = await Promise.all([
      MongoTeamMember.countDocuments(match),
      MongoTeamMember.find(match)
        .sort({ createTime: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .populate<{ userId: { username: string; contact?: string } }>('userId', 'username contact')
        .lean()
    ]);

    // 联查系统角色权限
    const tmbIds = members.map((m) => m._id);
    const roles = await MongoCustomerServiceMemberRole.find({
      teamId,
      tmbId: { $in: tmbIds },
      status: CustomerServiceResourceStatusEnum.active
    }).lean();

    const roleMap = new Map<string, string>();
    for (const r of roles) {
      roleMap.set(String(r.tmbId), r.role);
    }

    const list = members.map((tmb) => {
      const csRole =
        roleMap.get(String(tmb._id)) ||
        (tmb.role === TeamMemberRoleEnum.owner
          ? CustomerServiceMemberRoleEnum.customerServiceAdmin
          : undefined);

      return {
        tmbId: String(tmb._id),
        userId: String(
          typeof tmb.userId === 'object' && tmb.userId ? (tmb.userId as any)._id : tmb.userId
        ),
        username: typeof tmb.userId === 'object' && tmb.userId ? (tmb.userId as any).username : '',
        memberName: tmb.name,
        avatar: tmb.avatar || '',
        role: tmb.role || TeamMemberRoleEnum.owner,
        csRole,
        status: tmb.status,
        createTime: tmb.createTime,
        permission: {
          hasManagePer:
            tmb.role === TeamMemberRoleEnum.owner ||
            csRole === CustomerServiceMemberRoleEnum.customerServiceAdmin,
          isOwner: tmb.role === TeamMemberRoleEnum.owner
        },
        orgs: []
      };
    });

    jsonRes(res, {
      data: {
        pageNum,
        pageSize,
        total,
        list
      }
    });
    return true;
  }

  // 4. 管理员修改成员姓名 /support/user/team/member/updateNameByManager
  if (pathStr === 'support/user/team/member/updateNameByManager' && req.method === 'PUT') {
    const { teamId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    await MongoTeamMember.updateOne({ _id: body.tmbId, teamId }, { name: body.name });
    jsonRes(res, { data: 'success' });
    return true;
  }

  // 4.1 管理员修改成员角色权限 /support/user/team/member/updateRole
  if (pathStr === 'support/user/team/member/updateRole' && req.method === 'PUT') {
    const { teamId, tmbId: operatorTmbId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    await setCustomerServiceMemberRole({
      teamId,
      tmbId: body.tmbId,
      role: body.role,
      reason: body.reason || '管理员在团队管理中调整角色权限',
      operatorTmbId
    });
    jsonRes(res, { data: 'success' });
    return true;
  }

  // 5. 移除成员 /support/user/team/member/delete
  if (pathStr === 'support/user/team/member/delete' && req.method === 'DELETE') {
    const { teamId } = await authCert({ req, authToken: true });
    const tmbId = req.query.tmbId as string;
    await MongoTeamMember.updateOne({ _id: tmbId, teamId }, { status: TeamMemberStatusEnum.leave });
    jsonRes(res, { data: 'success' });
    return true;
  }

  // 6. 恢复成员 /support/user/team/member/restore
  if (pathStr === 'support/user/team/member/restore' && req.method === 'POST') {
    const { teamId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    await MongoTeamMember.updateOne(
      { _id: body.tmbId, teamId },
      { status: TeamMemberStatusEnum.active }
    );
    jsonRes(res, { data: 'success' });
    return true;
  }

  // 7. 切换当前团队 /support/user/team/switch
  if (pathStr === 'support/user/team/switch' && req.method === 'PUT') {
    const { userId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    const tmb = await MongoTeamMember.findOne({
      userId,
      teamId: body.teamId,
      status: TeamMemberStatusEnum.active
    });
    if (!tmb) throw new Error('Member not found in target team');
    await MongoUser.updateOne({ _id: userId }, { lastLoginTmbId: tmb._id });
    jsonRes(res, { data: String(tmb._id) });
    return true;
  }

  // 7.1 获取知识库协同成员列表 /core/dataset/collaborator/list
  if (pathStr === 'core/dataset/collaborator/list' && req.method === 'GET') {
    const { teamId } = await authCert({ req, authToken: true });
    const datasetId = req.query.datasetId as string;
    const dataset = await MongoDataset.findOne({ _id: datasetId, teamId }).lean();
    if (!dataset) throw new Error('Dataset not found');

    const clbs = await getResourceOwnedClbs({
      resourceType: PerResourceTypeEnum.dataset,
      teamId,
      resourceId: datasetId
    });
    const clbsInfo = await getClbsInfo({
      clbs,
      teamId,
      ownerTmbId: String(dataset.tmbId)
    });

    let parentClbsInfo: any[] = [];
    if (dataset.inheritPermission && dataset.parentId) {
      const parentClbs = await getResourceOwnedClbs({
        resourceType: PerResourceTypeEnum.dataset,
        teamId,
        resourceId: dataset.parentId
      });
      parentClbsInfo = await getClbsInfo({
        clbs: parentClbs,
        teamId
      });
    }

    jsonRes(res, {
      data: {
        clbs: clbsInfo,
        parentClbs: parentClbsInfo
      }
    });
    return true;
  }

  // 7.2 更新知识库协同成员 /core/dataset/collaborator/update
  if (pathStr === 'core/dataset/collaborator/update' && req.method === 'POST') {
    const { teamId } = await authCert({ req, authToken: true });
    const body = await parseJsonBody(req);
    const { datasetId, collaborators = [] } = body;

    const dataset = await MongoDataset.findOne({ _id: datasetId, teamId }).lean();
    if (!dataset) throw new Error('Dataset not found');

    await Promise.all(
      collaborators.map(async (clb: any) => {
        const match: any = {
          resourceType: PerResourceTypeEnum.dataset,
          resourceId: datasetId,
          teamId
        };
        if (clb.tmbId) match.tmbId = clb.tmbId;
        if (clb.groupId) match.groupId = clb.groupId;
        if (clb.orgId) match.orgId = clb.orgId;

        await MongoResourcePermission.findOneAndUpdate(
          match,
          {
            ...match,
            permission: clb.permission
          },
          { upsert: true }
        );
      })
    );

    jsonRes(res, { data: 'success' });
    return true;
  }

  // 7.3 删除知识库协同成员 /core/dataset/collaborator/delete
  if (pathStr === 'core/dataset/collaborator/delete' && req.method === 'DELETE') {
    const { teamId } = await authCert({ req, authToken: true });
    const datasetId = req.query.datasetId as string;
    const tmbId = req.query.tmbId as string;
    const groupId = req.query.groupId as string;
    const orgId = req.query.orgId as string;

    const match: any = {
      resourceType: PerResourceTypeEnum.dataset,
      resourceId: datasetId,
      teamId
    };
    if (tmbId) match.tmbId = tmbId;
    if (groupId) match.groupId = groupId;
    if (orgId) match.orgId = orgId;

    await MongoResourcePermission.deleteOne(match);
    jsonRes(res, { data: 'success' });
    return true;
  }

  // 8. 协作者列表 / 组织架构 / 权限等无商业版时的静默回退
  if (
    pathStr.startsWith('support/user/team/collaborator/') ||
    pathStr.startsWith('support/user/team/group/') ||
    pathStr.startsWith('support/user/team/org/') ||
    pathStr.startsWith('support/user/team/invitationLink/') ||
    pathStr.startsWith('support/user/inform/')
  ) {
    if (pathStr.includes('/list')) {
      jsonRes(res, { data: [] });
      return true;
    }
    jsonRes(res, { data: null });
    return true;
  }

  return false;
}
