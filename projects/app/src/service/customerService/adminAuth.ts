import type { NextApiRequest } from 'next';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  ManagePermissionVal,
  ReadPermissionVal,
  WritePermissionVal
} from '@fastgpt/global/support/permission/constant';
import { assertAnyCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import { authAppByTmbId } from '@fastgpt/service/support/permission/app/auth';
import { authDatasetByTmbId } from '@fastgpt/service/support/permission/dataset/auth';
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
import { AppReadChatLogPerVal } from '@fastgpt/global/support/permission/app/constant';

type CustomerServiceAdminAuthResult = Awaited<ReturnType<typeof authUserPer>>;

/**
 * 校验后台客服岗位。团队 owner/root 仅作为客服管理员兜底，普通成员必须显式绑定岗位。
 */
export const authCustomerServiceRoles = async ({
  req,
  roles
}: {
  req: NextApiRequest;
  roles: CustomerServiceMemberRoleEnum[];
}): Promise<CustomerServiceAdminAuthResult> => {
  const result = await authUserPer({ req, authToken: true, per: ReadPermissionVal });
  await assertAnyCustomerServiceMemberRole({
    teamId: result.teamId,
    tmbId: result.tmbId,
    requiredRoles: roles,
    isTeamOwner: result.isRoot || result.permission.isOwner
  });
  return result;
};

/** 校验客服管理员岗位。 */
export const authCustomerServiceAdmin = (req: NextApiRequest) =>
  authCustomerServiceRoles({
    req,
    roles: [CustomerServiceMemberRoleEnum.customerServiceAdmin]
  });

/**
 * 校验当前成员对一组知识库拥有指定权限。空数组表示当前操作没有额外知识库资源。
 */
export const authCustomerServiceDatasets = async ({
  tmbId,
  isRoot,
  datasetIds,
  mode
}: {
  tmbId: string;
  isRoot: boolean;
  datasetIds: string[];
  mode: 'read' | 'write' | 'manage';
}) => {
  const uniqueDatasetIds = Array.from(new Set(datasetIds));
  await Promise.all(
    uniqueDatasetIds.map((datasetId) =>
      authDatasetByTmbId({
        tmbId,
        datasetId,
        per:
          mode === 'manage'
            ? ManagePermissionVal
            : mode === 'write'
              ? WritePermissionVal
              : ReadPermissionVal,
        isRoot
      })
    )
  );
};

/** 校验当前成员拥有 App 管理权限，供客服项目配置复用。 */
export const authCustomerServiceAppManage = ({
  tmbId,
  appId,
  isRoot
}: {
  tmbId: string;
  appId: string;
  isRoot: boolean;
}) => authAppByTmbId({ tmbId, appId, per: ManagePermissionVal, isRoot });

/** 校验客服运营记录读取所需的 FastGPT App 日志权限。 */
export const authCustomerServiceAppLogs = ({
  tmbId,
  appId,
  isRoot
}: {
  tmbId: string;
  appId: string;
  isRoot: boolean;
}) => authAppByTmbId({ tmbId, appId, per: AppReadChatLogPerVal, isRoot });

/** 按 FastGPT 原生 Dataset 读权限过滤客服业务展示的知识范围。 */
export const filterCustomerServiceDatasetIds = async ({
  datasetIds,
  tmbId,
  isRoot
}: {
  datasetIds: string[];
  tmbId: string;
  isRoot: boolean;
}) => {
  const uniqueDatasetIds = Array.from(new Set(datasetIds));
  const checks = await Promise.all(
    uniqueDatasetIds.map(async (datasetId) => {
      try {
        await authDatasetByTmbId({
          tmbId,
          datasetId,
          per: ReadPermissionVal,
          isRoot
        });
        return datasetId;
      } catch {
        return undefined;
      }
    })
  );
  return checks.filter((id): id is string => !!id);
};

/** 按原生对话日志权限过滤可显示的客服 App。 */
export const filterCustomerServiceAppIds = async ({
  appIds,
  tmbId,
  isRoot
}: {
  appIds: string[];
  tmbId: string;
  isRoot: boolean;
}) => {
  const uniqueAppIds = Array.from(new Set(appIds));
  const checks = await Promise.all(
    uniqueAppIds.map(async (appId) => {
      try {
        await authAppByTmbId({
          tmbId,
          appId,
          per: AppReadChatLogPerVal,
          isRoot
        });
        return appId;
      } catch {
        return undefined;
      }
    })
  );
  return checks.filter((id): id is string => !!id);
};
