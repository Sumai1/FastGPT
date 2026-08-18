import type {
  CustomerServiceMemberRoleEnum,
  CustomerServiceMemberRoleAuditActionEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type { ClientSession } from '../../../common/mongo';
import { MongoCustomerServiceMemberRole, MongoCustomerServiceMemberRoleAudit } from './schema';

export const findCustomerServiceMemberRole = ({
  teamId,
  tmbId,
  session
}: {
  teamId: string;
  tmbId: string;
  session?: ClientSession;
}) => MongoCustomerServiceMemberRole.findOne({ teamId, tmbId }, null, { session }).lean();

export const upsertCustomerServiceMemberRole = ({
  teamId,
  tmbId,
  role,
  allowedCategoryIds = [],
  allowedModelIds = [],
  status,
  reason,
  operatorTmbId,
  session
}: {
  teamId: string;
  tmbId: string;
  role: CustomerServiceMemberRoleEnum;
  allowedCategoryIds?: string[];
  allowedModelIds?: string[];
  status: CustomerServiceResourceStatusEnum;
  reason: string;
  operatorTmbId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceMemberRole.findOneAndUpdate(
    { teamId, tmbId },
    {
      $set: {
        role,
        allowedCategoryIds,
        allowedModelIds,
        status,
        reason,
        updateTmbId: operatorTmbId,
        updateTime: new Date()
      },
      $setOnInsert: {
        creatorTmbId: operatorTmbId,
        createTime: new Date()
      }
    },
    { upsert: true, new: true, runValidators: true, session }
  ).lean();

export const createCustomerServiceMemberRoleAudit = ({
  teamId,
  tmbId,
  action,
  fromRole,
  toRole,
  fromStatus,
  toStatus,
  reason,
  operatorTmbId,
  session
}: {
  teamId: string;
  tmbId: string;
  action: CustomerServiceMemberRoleAuditActionEnum;
  fromRole?: CustomerServiceMemberRoleEnum;
  toRole: CustomerServiceMemberRoleEnum;
  fromStatus?: CustomerServiceResourceStatusEnum;
  toStatus: CustomerServiceResourceStatusEnum;
  reason: string;
  operatorTmbId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceMemberRoleAudit.create(
    [
      {
        teamId,
        tmbId,
        action,
        fromRole,
        toRole,
        fromStatus,
        toStatus,
        reason,
        operatorTmbId
      }
    ],
    { session }
  ).then(([item]) => item);

export const listCustomerServiceMemberRoles = ({ teamId }: { teamId: string }) =>
  MongoCustomerServiceMemberRole.find({ teamId }).sort({ updateTime: -1 }).lean();

export const listCustomerServiceMemberRoleAudits = ({
  teamId,
  tmbId,
  limit = 50
}: {
  teamId: string;
  tmbId?: string;
  limit?: number;
}) =>
  MongoCustomerServiceMemberRoleAudit.find({
    teamId,
    ...(tmbId && { tmbId })
  })
    .sort({ createTime: -1 })
    .limit(limit)
    .lean();
