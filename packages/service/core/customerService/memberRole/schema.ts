import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceMemberRoleAuditActionEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceMemberRoleAuditType,
  CustomerServiceMemberRoleType
} from '@fastgpt/global/core/customerService/type';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { defineIndex, Schema, getMongoModel } from '../../../common/mongo';

export const CustomerServiceMemberRoleCollectionName = 'customer_service_member_roles';
export const CustomerServiceMemberRoleAuditCollectionName = 'customer_service_member_role_audits';

const CustomerServiceMemberRoleSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  role: {
    type: String,
    enum: Object.values(CustomerServiceMemberRoleEnum),
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    default: CustomerServiceResourceStatusEnum.active
  },
  reason: { type: String, default: '' },
  creatorTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  updateTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  createTime: { type: Date, default: () => new Date() },
  updateTime: { type: Date, default: () => new Date() }
});

// 单字段 role 保证编辑和审核天然互斥；唯一索引保证成员只有一条当前岗位记录。
defineIndex(CustomerServiceMemberRoleSchema, {
  key: { teamId: 1, tmbId: 1 },
  options: { unique: true }
});
defineIndex(CustomerServiceMemberRoleSchema, { key: { teamId: 1, role: 1, status: 1 } });

export const MongoCustomerServiceMemberRole = getMongoModel<CustomerServiceMemberRoleType>(
  CustomerServiceMemberRoleCollectionName,
  CustomerServiceMemberRoleSchema
);

const CustomerServiceMemberRoleAuditSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: TeamCollectionName, required: true },
  tmbId: { type: Schema.Types.ObjectId, ref: TeamMemberCollectionName, required: true },
  action: {
    type: String,
    enum: Object.values(CustomerServiceMemberRoleAuditActionEnum),
    required: true
  },
  fromRole: { type: String, enum: Object.values(CustomerServiceMemberRoleEnum) },
  toRole: { type: String, enum: Object.values(CustomerServiceMemberRoleEnum), required: true },
  fromStatus: { type: String, enum: Object.values(CustomerServiceResourceStatusEnum) },
  toStatus: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    required: true
  },
  reason: { type: String, required: true },
  operatorTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  createTime: { type: Date, default: () => new Date() }
});

defineIndex(CustomerServiceMemberRoleAuditSchema, { key: { teamId: 1, tmbId: 1, createTime: -1 } });
defineIndex(CustomerServiceMemberRoleAuditSchema, { key: { teamId: 1, createTime: -1 } });

export const MongoCustomerServiceMemberRoleAudit =
  getMongoModel<CustomerServiceMemberRoleAuditType>(
    CustomerServiceMemberRoleAuditCollectionName,
    CustomerServiceMemberRoleAuditSchema
  );
