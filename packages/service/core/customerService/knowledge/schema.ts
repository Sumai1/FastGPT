import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeAuditActionEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceKnowledgeAuditType,
  CustomerServiceKnowledgeType
} from '@fastgpt/global/core/customerService/type';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { defineIndex, Schema, getMongoModel } from '../../../common/mongo';
import { DatasetCollectionName } from '../../dataset/schema';
import { DatasetColCollectionName } from '../../dataset/collection/schema';
import {
  CustomerServiceProductModelCollectionName,
  CustomerServiceProductVersionCollectionName
} from '../product/schema';

export const CustomerServiceKnowledgeCollectionName = 'customer_service_knowledges';
export const CustomerServiceKnowledgeAuditCollectionName = 'customer_service_knowledge_audits';

const CustomerServiceKnowledgeSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  datasetId: {
    type: Schema.Types.ObjectId,
    ref: DatasetCollectionName,
    required: true
  },
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: DatasetColCollectionName,
    required: true
  },
  title: { type: String, required: true },
  sourceName: { type: String, default: '' },
  sourceRequestRecordId: { type: Schema.Types.ObjectId },
  sourceSessionId: String,
  knowledgeType: {
    type: String,
    enum: Object.values(CustomerServiceKnowledgeTypeEnum),
    required: true
  },
  audienceLevel: {
    type: String,
    enum: Object.values(CustomerServiceAudienceEnum),
    required: true
  },
  modelIds: {
    type: [Schema.Types.ObjectId],
    ref: CustomerServiceProductModelCollectionName,
    default: []
  },
  hardwareVersionIds: {
    type: [Schema.Types.ObjectId],
    ref: CustomerServiceProductVersionCollectionName,
    default: []
  },
  softwareVersionIds: {
    type: [Schema.Types.ObjectId],
    ref: CustomerServiceProductVersionCollectionName,
    default: []
  },
  effectiveFrom: Date,
  effectiveTo: Date,
  status: {
    type: String,
    enum: Object.values(CustomerServiceKnowledgeStatusEnum),
    default: CustomerServiceKnowledgeStatusEnum.draft
  },
  version: { type: Number, default: 1 },
  versionGroupId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceKnowledgeCollectionName,
    required: true
  },
  previousKnowledgeId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceKnowledgeCollectionName
  },
  supersededBy: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceKnowledgeCollectionName,
    default: null
  },
  supersededAt: { type: Date, default: null },
  structuredData: { type: Schema.Types.Mixed, default: null },
  submitterTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName
  },
  submitTime: Date,
  reviewerTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName
  },
  reviewTime: Date,
  reviewReason: { type: String, default: '' },
  publishedTime: Date,
  offlineTime: Date,
  tmbId: {
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

defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, collectionId: 1 },
  options: { unique: true }
});
// 事务内的状态校验不能阻止两个并发审核会话同时发布，由唯一索引兜底保证每个版本组只有一个在线版本。
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, versionGroupId: 1 },
  options: {
    unique: true,
    partialFilterExpression: { status: CustomerServiceKnowledgeStatusEnum.published }
  }
});
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, versionGroupId: 1, version: 1 }
});
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, datasetId: 1, status: 1, audienceLevel: 1 }
});
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, status: 1, audienceLevel: 1, effectiveFrom: 1, effectiveTo: 1, modelIds: 1 }
});
// 版本数组不能与 modelIds 放进同一个复合多键索引，分别声明供 MongoDB 选择索引。
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, status: 1, hardwareVersionIds: 1 }
});
defineIndex(CustomerServiceKnowledgeSchema, {
  key: { teamId: 1, status: 1, softwareVersionIds: 1 }
});

const CustomerServiceKnowledgeAuditSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  knowledgeId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceKnowledgeCollectionName,
    required: true
  },
  versionGroupId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceKnowledgeCollectionName
  },
  version: { type: Number },
  diffSummary: { type: String, default: '' },
  action: {
    type: String,
    enum: Object.values(CustomerServiceKnowledgeAuditActionEnum),
    required: true
  },
  fromStatus: {
    type: String,
    enum: Object.values(CustomerServiceKnowledgeStatusEnum)
  },
  toStatus: {
    type: String,
    enum: Object.values(CustomerServiceKnowledgeStatusEnum),
    required: true
  },
  reason: { type: String, default: '' },
  operatorTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  createTime: { type: Date, default: () => new Date() }
});

defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { knowledgeId: 1, createTime: -1 } });
defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { versionGroupId: 1, createTime: -1 } });
defineIndex(CustomerServiceKnowledgeAuditSchema, { key: { teamId: 1, createTime: -1 } });
defineIndex(CustomerServiceKnowledgeAuditSchema, {
  key: { teamId: 1, operatorTmbId: 1, createTime: -1 }
});

export const MongoCustomerServiceKnowledge = getMongoModel<CustomerServiceKnowledgeType>(
  CustomerServiceKnowledgeCollectionName,
  CustomerServiceKnowledgeSchema
);
export const MongoCustomerServiceKnowledgeAudit = getMongoModel<CustomerServiceKnowledgeAuditType>(
  CustomerServiceKnowledgeAuditCollectionName,
  CustomerServiceKnowledgeAuditSchema
);
