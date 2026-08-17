import type {
  CustomerServiceKeyBindingType,
  CustomerServiceProjectType
} from '@fastgpt/global/core/customerService/type';
import type { ClientSession } from '../../../common/mongo';
import {
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { MongoCustomerServiceKeyBinding, MongoCustomerServiceProject } from './schema';

type CreateCustomerServiceProjectData = Omit<
  CustomerServiceProjectType,
  '_id' | 'createTime' | 'updateTime'
>;
type CreateCustomerServiceKeyBindingData = Omit<
  CustomerServiceKeyBindingType,
  '_id' | 'createTime' | 'updateTime'
>;

export const createCustomerServiceProject = (
  data: CreateCustomerServiceProjectData,
  session?: ClientSession
) => MongoCustomerServiceProject.create([data], { session }).then(([item]) => item);

export const findCustomerServiceProjectById = ({
  teamId,
  projectId,
  session
}: {
  teamId: string;
  projectId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProject.findOne({ _id: projectId, teamId })
    .session(session ?? null)
    .lean();

export const listCustomerServiceProjects = ({ teamId }: { teamId: string }) =>
  MongoCustomerServiceProject.find({ teamId }).sort({ updateTime: -1 }).lean();

/** 返回引用指定产品型号的客服项目，用于知识库绑定变化后的工作流同步。 */
export const listCustomerServiceProjectsByModelId = ({
  teamId,
  modelId
}: {
  teamId: string;
  modelId: string;
}) =>
  MongoCustomerServiceProject.find({ teamId, modelIds: modelId }).sort({ updateTime: -1 }).lean();

/** 按数据库保证全局唯一的公开标识定位启用项目，不接受团队内 projectCode 代替。 */
export const findActiveCustomerServiceProjectByPublicId = ({ publicId }: { publicId: string }) =>
  MongoCustomerServiceProject.findOne({
    publicId,
    status: CustomerServiceProjectStatusEnum.active
  }).lean();

/** 仅在公开标识仍等于调用方读取值时写入，用于旧项目的并发安全补齐。 */
export const setCustomerServiceProjectPublicId = ({
  teamId,
  projectId,
  currentPublicId,
  publicId,
  session
}: {
  teamId: string;
  projectId: string;
  currentPublicId?: string;
  publicId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProject.findOneAndUpdate(
    {
      _id: projectId,
      teamId,
      ...(currentPublicId === undefined
        ? { $or: [{ publicId: { $exists: false } }, { publicId: null }] }
        : { publicId: currentPublicId })
    },
    { $set: { publicId } },
    { new: true, runValidators: true, session }
  ).lean();

export const upsertCustomerServiceKeyBinding = (
  data: CreateCustomerServiceKeyBindingData,
  session?: ClientSession
) =>
  MongoCustomerServiceKeyBinding.findOneAndUpdate(
    { teamId: data.teamId, openApiKeyId: data.openApiKeyId },
    {
      $set: {
        ...data,
        updateTime: new Date()
      },
      $setOnInsert: {
        createTime: new Date()
      }
    },
    { upsert: true, new: true, runValidators: true, session }
  ).lean();

export const findCustomerServiceKeyBindingByOpenApiKeyId = ({
  teamId,
  openApiKeyId
}: {
  teamId: string;
  openApiKeyId: string;
}) => MongoCustomerServiceKeyBinding.findOne({ teamId, openApiKeyId }).lean();

export const findActiveCustomerServiceKeyBindingByOpenApiKeyId = ({
  teamId,
  openApiKeyId
}: {
  teamId: string;
  openApiKeyId: string;
}) =>
  MongoCustomerServiceKeyBinding.findOne({
    teamId,
    openApiKeyId,
    status: CustomerServiceResourceStatusEnum.active
  }).lean();

export const findActiveCustomerServiceKeyBindingByProjectId = ({
  teamId,
  projectId
}: {
  teamId: string;
  projectId: string;
}) =>
  MongoCustomerServiceKeyBinding.findOne({
    teamId,
    projectId,
    status: CustomerServiceResourceStatusEnum.active
  }).lean();

export const listCustomerServiceKeyBindings = ({ teamId }: { teamId: string }) =>
  MongoCustomerServiceKeyBinding.find({ teamId }).sort({ updateTime: -1 }).lean();

export const findCustomerServiceKeyBindingById = ({
  teamId,
  bindingId
}: {
  teamId: string;
  bindingId: string;
}) => MongoCustomerServiceKeyBinding.findOne({ _id: bindingId, teamId }).lean();

/** 更新一个已校验归属的客服 Key 绑定状态。 */
export const updateCustomerServiceKeyBindingById = ({
  teamId,
  bindingId,
  update,
  session
}: {
  teamId: string;
  bindingId: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceKeyBinding.findOneAndUpdate(
    { _id: bindingId, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const updateCustomerServiceProjectById = ({
  teamId,
  projectId,
  update,
  session
}: {
  teamId: string;
  projectId: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProject.findOneAndUpdate(
    { _id: projectId, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

/**
 * 持久化托管工作流最近一次知识范围同步状态。
 * 失败时保留旧发布版本，只记录业务错误和时间，供控制台展示与重试。
 */
export const updateCustomerServiceProjectWorkflowSyncState = async ({
  teamId,
  projectId,
  status,
  failureReason,
  expectedLastAttemptTime,
  session
}: {
  teamId: string;
  projectId: string;
  status: CustomerServiceWorkflowSyncStatusEnum;
  failureReason?: string;
  expectedLastAttemptTime?: Date;
  session?: ClientSession;
}) => {
  const now = new Date();
  const set: Record<string, unknown> = {
    workflowSyncStatus: status,
    workflowSyncLastAttemptTime: now,
    updateTime: now
  };
  const update: Record<string, unknown> = { $set: set };
  if (status === CustomerServiceWorkflowSyncStatusEnum.failed) {
    set.workflowSyncFailureReason = failureReason ?? '工作流同步失败';
    set.workflowSyncFailureTime = now;
  } else if (status === CustomerServiceWorkflowSyncStatusEnum.succeeded) {
    set.workflowSyncSuccessTime = now;
    update.$unset = { workflowSyncFailureReason: '', workflowSyncFailureTime: '' };
  }
  return MongoCustomerServiceProject.findOneAndUpdate(
    {
      _id: projectId,
      teamId,
      ...(expectedLastAttemptTime && {
        workflowSyncLastAttemptTime: expectedLastAttemptTime
      })
    },
    update,
    { new: true, runValidators: true, session }
  ).lean();
};
