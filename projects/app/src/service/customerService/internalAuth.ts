import { createHash } from 'node:crypto';
import type { NextApiRequest } from 'next';
import { CustomerServiceProjectStatusEnum } from '@fastgpt/global/core/customerService/constants';
import { ReadPermissionVal } from '@fastgpt/global/support/permission/constant';
import { UserError } from '@fastgpt/global/common/error/utils';
import {
  findActiveCustomerServiceKeyBindingByProjectId,
  findCustomerServiceProjectById,
  listCustomerServiceProjects
} from '@fastgpt/service/core/customerService/project/entity';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';
import { authAppByTmbId } from '@fastgpt/service/support/permission/app/auth';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';

/** 将站内页面幂等 ID 绑定到登录成员，聊天与停止代理必须使用完全相同的映射。 */
export const hashCustomerServiceInternalRequestId = ({
  tmbId,
  requestId
}: {
  tmbId: string;
  requestId: string;
}) => createHash('sha256').update(`${tmbId}:${requestId}`).digest('hex').slice(0, 32);

/**
 * 校验登录用户对站内客服项目的 App 读取权限，并解析仅留在服务端的客服 Key。
 */
export const authCustomerServiceInternalProject = async ({
  req,
  projectId
}: {
  req: NextApiRequest;
  projectId: string;
}) => {
  const auth = await authUserPer({ req, authToken: true, per: ReadPermissionVal });
  const project = await findCustomerServiceProjectById({ teamId: auth.teamId, projectId });
  if (!project || project.status !== CustomerServiceProjectStatusEnum.active) {
    throw new UserError('Customer service project is unavailable');
  }
  await authAppByTmbId({
    tmbId: auth.tmbId,
    appId: String(project.appId),
    per: ReadPermissionVal,
    isRoot: auth.isRoot
  });
  const binding = await findActiveCustomerServiceKeyBindingByProjectId({
    teamId: auth.teamId,
    projectId
  });
  if (!binding) throw new UserError('Customer service project has no active API key');
  const openApiKey = await MongoOpenApi.findOne({
    _id: binding.openApiKeyId,
    teamId: auth.teamId
  })
    .select('apiKey')
    .lean();
  if (!openApiKey) throw new UserError('Customer service API key is unavailable');

  return { auth, project, binding, openApiKey };
};

/** 获取登录成员有权读取且具备启用 Key 的客服项目。 */
export const listCustomerServiceInternalProjects = async (req: NextApiRequest) => {
  const auth = await authUserPer({ req, authToken: true, per: ReadPermissionVal });
  const projects = await listCustomerServiceProjects({ teamId: auth.teamId });
  const allowed = await Promise.all(
    projects
      .filter((project) => project.status === CustomerServiceProjectStatusEnum.active)
      .map(async (project) => {
        try {
          const [, binding] = await Promise.all([
            authAppByTmbId({
              tmbId: auth.tmbId,
              appId: String(project.appId),
              per: ReadPermissionVal,
              isRoot: auth.isRoot
            }),
            findActiveCustomerServiceKeyBindingByProjectId({
              teamId: auth.teamId,
              projectId: String(project._id)
            })
          ]);
          return binding ? project : undefined;
        } catch {
          return;
        }
      })
  );
  return { auth, projects: allowed.filter((item) => !!item) };
};
