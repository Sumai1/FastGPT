import {
  CustomerServiceAudienceEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceKeyBindingType,
  CustomerServiceProjectType
} from '@fastgpt/global/core/customerService/type';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { defineIndex, Schema, getMongoModel } from '../../../common/mongo';
import { AppCollectionName } from '../../app/schema';
import { CustomerServiceProductModelCollectionName } from '../product/schema';
import { generateCustomerServiceProjectPublicId } from './utils';

export const CustomerServiceProjectCollectionName = 'customer_service_projects';
export const CustomerServiceKeyBindingCollectionName = 'customer_service_key_bindings';

const CustomerServiceProjectSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  appId: {
    type: Schema.Types.ObjectId,
    ref: AppCollectionName,
    required: true
  },
  projectCode: { type: String, required: true },
  publicId: { type: String, default: generateCustomerServiceProjectPublicId },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(CustomerServiceProjectStatusEnum),
    default: CustomerServiceProjectStatusEnum.active
  },
  modelIds: {
    type: [Schema.Types.ObjectId],
    ref: CustomerServiceProductModelCollectionName,
    default: []
  },
  defaultAudience: {
    type: String,
    enum: Object.values(CustomerServiceAudienceEnum),
    default: CustomerServiceAudienceEnum.public
  },
  welcomeText: { type: String, default: '' },
  recommendedQuestions: { type: [String], default: [] },
  humanContact: {
    name: { type: String, default: '人工客服' },
    phone: String,
    url: String,
    workTime: String
  },
  ruleConfig: {
    lowConfidenceThreshold: { type: Number, default: 0.45 },
    lowConfidenceMaxCount: { type: Number, default: 2 },
    maxAnswerTokens: { type: Number, default: 600 },
    dangerousKeywords: { type: [String], default: [] },
    disputeKeywords: { type: [String], default: [] },
    complaintKeywords: { type: [String], default: [] },
    humanRequestKeywords: { type: [String], default: [] }
  },
  sessionRetentionDays: Number,
  workflowSyncStatus: {
    type: String,
    enum: Object.values(CustomerServiceWorkflowSyncStatusEnum),
    default: CustomerServiceWorkflowSyncStatusEnum.idle
  },
  workflowSyncFailureReason: { type: String, default: '' },
  workflowSyncFailureTime: Date,
  workflowSyncLastAttemptTime: Date,
  workflowSyncSuccessTime: Date,
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

defineIndex(CustomerServiceProjectSchema, {
  key: { teamId: 1, projectCode: 1 },
  options: { unique: true }
});
defineIndex(CustomerServiceProjectSchema, { key: { teamId: 1, appId: 1 } });
defineIndex(CustomerServiceProjectSchema, { key: { teamId: 1, status: 1, modelIds: 1 } });
defineIndex(CustomerServiceProjectSchema, {
  key: { publicId: 1 },
  options: {
    unique: true,
    partialFilterExpression: { publicId: { $type: 'string' } }
  }
});

const CustomerServiceKeyBindingSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  projectId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProjectCollectionName,
    required: true
  },
  openApiKeyId: {
    type: Schema.Types.ObjectId,
    ref: 'openapi',
    required: true
  },
  maxAudience: {
    type: String,
    enum: Object.values(CustomerServiceAudienceEnum),
    default: CustomerServiceAudienceEnum.public
  },
  status: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    default: CustomerServiceResourceStatusEnum.active
  },
  allowedOrigins: { type: [String], default: [] },
  rateLimit: {
    seconds: Number,
    limit: Number
  },
  disabledReason: { type: String, default: '' },
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

defineIndex(CustomerServiceKeyBindingSchema, {
  key: { teamId: 1, openApiKeyId: 1 },
  options: { unique: true }
});
defineIndex(CustomerServiceKeyBindingSchema, { key: { teamId: 1, projectId: 1, status: 1 } });

export const MongoCustomerServiceProject = getMongoModel<CustomerServiceProjectType>(
  CustomerServiceProjectCollectionName,
  CustomerServiceProjectSchema
);
export const MongoCustomerServiceKeyBinding = getMongoModel<CustomerServiceKeyBindingType>(
  CustomerServiceKeyBindingCollectionName,
  CustomerServiceKeyBindingSchema
);
