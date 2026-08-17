import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum,
  CustomerServiceRequestStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceRequestType } from '@fastgpt/global/core/customerService/type';
import { TeamCollectionName } from '@fastgpt/global/support/user/team/constant';
import { defineIndex, Schema, getMongoModel } from '../../../common/mongo';
import {
  CustomerServiceProductModelCollectionName,
  CustomerServiceProductVersionCollectionName
} from '../product/schema';
import { CustomerServiceProjectCollectionName } from '../project/schema';

export const CustomerServiceRequestCollectionName = 'customer_service_requests';

const CustomerServiceRequestSchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: TeamCollectionName, required: true },
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
  requestId: { type: String, required: true },
  question: { type: String, default: '' },
  externalSessionId: { type: String, required: true },
  internalChatId: { type: String, required: true },
  responseChatItemId: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(CustomerServiceRequestStatusEnum),
    required: true
  },
  resultStatus: { type: String, enum: Object.values(CustomerServiceChatStatusEnum) },
  audience: {
    type: String,
    enum: Object.values(CustomerServiceAudienceEnum),
    required: true
  },
  modelId: { type: Schema.Types.ObjectId, ref: CustomerServiceProductModelCollectionName },
  hardwareVersionId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProductVersionCollectionName
  },
  softwareVersionId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProductVersionCollectionName
  },
  candidateModelIds: {
    type: [Schema.Types.ObjectId],
    ref: CustomerServiceProductModelCollectionName,
    default: []
  },
  serverAnswer: String,
  safetyWarning: String,
  humanReason: { type: String, enum: Object.values(CustomerServiceHumanHandoffReasonEnum) },
  lowConfidence: { type: Boolean, default: false },
  citationCount: { type: Number, default: 0 },
  unresolved: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  createTime: { type: Date, default: () => new Date() },
  updateTime: { type: Date, default: () => new Date() }
});

defineIndex(CustomerServiceRequestSchema, {
  key: { teamId: 1, projectId: 1, openApiKeyId: 1, requestId: 1 },
  options: { unique: true }
});
defineIndex(CustomerServiceRequestSchema, {
  key: { teamId: 1, projectId: 1, internalChatId: 1, updateTime: -1 }
});
defineIndex(CustomerServiceRequestSchema, {
  key: { status: 1, updateTime: 1 }
});
defineIndex(CustomerServiceRequestSchema, {
  key: { teamId: 1, projectId: 1, unresolved: 1, updateTime: -1 }
});
// 高频问题按团队、完成状态和创建时间聚合；该索引先收窄时间窗口，避免运营统计扫描全表。
defineIndex(CustomerServiceRequestSchema, {
  key: { teamId: 1, status: 1, createTime: -1 }
});
defineIndex(CustomerServiceRequestSchema, {
  key: { teamId: 1, projectId: 1, createTime: -1 }
});

export const MongoCustomerServiceRequest = getMongoModel<CustomerServiceRequestType>(
  CustomerServiceRequestCollectionName,
  CustomerServiceRequestSchema
);
