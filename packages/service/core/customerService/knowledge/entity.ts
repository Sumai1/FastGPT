import {
  CustomerServiceKnowledgeStatusEnum,
  type CustomerServiceKnowledgeAuditActionEnum
} from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceKnowledgeType } from '@fastgpt/global/core/customerService/type';
import type { ClientSession } from '../../../common/mongo';
import { MongoCustomerServiceKnowledge, MongoCustomerServiceKnowledgeAudit } from './schema';

type CreateCustomerServiceKnowledgeData = Omit<
  CustomerServiceKnowledgeType,
  '_id' | 'createTime' | 'updateTime'
>;

export const createCustomerServiceKnowledge = (
  data: CreateCustomerServiceKnowledgeData,
  session?: ClientSession
) => MongoCustomerServiceKnowledge.create([data], { session }).then(([item]) => item);

export const findCustomerServiceKnowledgeById = ({
  teamId,
  knowledgeId,
  session
}: {
  teamId: string;
  knowledgeId: string;
  session?: ClientSession;
}) => MongoCustomerServiceKnowledge.findOne({ _id: knowledgeId, teamId }, null, { session }).lean();

/** 仅更新仍允许编辑的治理记录，状态条件防止旧页面覆盖已提交或已发布内容。 */
export const updateEditableCustomerServiceKnowledgeById = ({
  teamId,
  knowledgeId,
  update,
  session
}: {
  teamId: string;
  knowledgeId: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceKnowledge.findOneAndUpdate(
    {
      _id: knowledgeId,
      teamId,
      status: {
        $in: [CustomerServiceKnowledgeStatusEnum.draft, CustomerServiceKnowledgeStatusEnum.rejected]
      }
    },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const transitionCustomerServiceKnowledge = ({
  teamId,
  knowledgeId,
  fromStatus,
  toStatus,
  update,
  session
}: {
  teamId: string;
  knowledgeId: string;
  fromStatus: CustomerServiceKnowledgeStatusEnum | CustomerServiceKnowledgeStatusEnum[];
  toStatus: CustomerServiceKnowledgeStatusEnum;
  update?: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceKnowledge.findOneAndUpdate(
    {
      _id: knowledgeId,
      teamId,
      status: Array.isArray(fromStatus) ? { $in: fromStatus } : fromStatus
    },
    {
      $set: {
        status: toStatus,
        updateTime: new Date(),
        ...update
      }
    },
    { new: true, runValidators: true, session }
  ).lean();

/** 记录知识治理流转审计流水，追踪版本演进、审批批注与操作人。 */
export const createCustomerServiceKnowledgeAudit = ({
  teamId,
  knowledgeId,
  versionGroupId,
  version,
  diffSummary = '',
  action,
  fromStatus,
  toStatus,
  reason = '',
  operatorTmbId,
  session
}: {
  teamId: string;
  knowledgeId: string;
  versionGroupId?: string;
  version?: number;
  diffSummary?: string;
  action: CustomerServiceKnowledgeAuditActionEnum;
  fromStatus?: CustomerServiceKnowledgeStatusEnum;
  toStatus: CustomerServiceKnowledgeStatusEnum;
  reason?: string;
  operatorTmbId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceKnowledgeAudit.create(
    [
      {
        teamId,
        knowledgeId,
        ...(versionGroupId && { versionGroupId }),
        ...(version !== undefined && { version }),
        diffSummary,
        action,
        fromStatus,
        toStatus,
        reason,
        operatorTmbId
      }
    ],
    { session }
  ).then(([item]) => item);

/** 按知识 ID 或版本组 ID 获取知识治理审计历史列表。 */
export const listCustomerServiceKnowledgeAudits = ({
  teamId,
  knowledgeId,
  versionGroupId
}: {
  teamId: string;
  knowledgeId?: string;
  versionGroupId?: string;
}) =>
  MongoCustomerServiceKnowledgeAudit.find({
    teamId,
    ...(knowledgeId && { knowledgeId }),
    ...(versionGroupId && { versionGroupId })
  })
    .sort({ createTime: -1 })
    .lean();

export const listCustomerServiceKnowledges = ({
  teamId,
  status,
  datasetId,
  modelId
}: {
  teamId: string;
  status?: CustomerServiceKnowledgeStatusEnum;
  datasetId?: string;
  modelId?: string;
}) =>
  MongoCustomerServiceKnowledge.find({
    teamId,
    ...(status && { status }),
    ...(datasetId && { datasetId }),
    ...(modelId && { $or: [{ modelIds: { $size: 0 } }, { modelIds: modelId }] })
  })
    .sort({ updateTime: -1 })
    .lean();
