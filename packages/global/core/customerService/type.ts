import { ObjectIdSchema } from '../../common/type/mongo';
import { z } from 'zod';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum,
  CustomerServiceKnowledgeAuditActionEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceMemberRoleAuditActionEnum,
  CustomerServiceMemberRoleEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum,
  CustomerServiceRequestStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from './constants';

const CustomerServiceTimestampSchema = z.object({
  createTime: z.date(),
  updateTime: z.date()
});

export const CustomerServiceProductCategorySchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    code: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    description: z.string().default(''),
    status: z.enum(CustomerServiceResourceStatusEnum),
    sortOrder: z.number().int().default(0),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceProductCategoryType = z.infer<
  typeof CustomerServiceProductCategorySchema
>;

export const CustomerServiceProductSeriesSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    categoryId: ObjectIdSchema,
    code: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    description: z.string().default(''),
    status: z.enum(CustomerServiceResourceStatusEnum),
    sortOrder: z.number().int().default(0),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceProductSeriesType = z.infer<typeof CustomerServiceProductSeriesSchema>;

export const CustomerServiceProductModelSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    seriesId: ObjectIdSchema,
    modelCode: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    description: z.string().default(''),
    status: z.enum(CustomerServiceProductStatusEnum),
    discontinuedAt: z.date().optional(),
    datasetIds: z.array(ObjectIdSchema).default([]),
    sortOrder: z.number().int().default(0),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceProductModelType = z.infer<typeof CustomerServiceProductModelSchema>;

export const CustomerServiceProductVersionSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    modelId: ObjectIdSchema,
    type: z.enum(CustomerServiceVersionTypeEnum),
    versionCode: z.string(),
    name: z.string(),
    aliases: z.array(z.string()).default([]),
    description: z.string().default(''),
    status: z.enum(CustomerServiceResourceStatusEnum),
    effectiveFrom: z.date().optional(),
    effectiveTo: z.date().optional(),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceProductVersionType = z.infer<typeof CustomerServiceProductVersionSchema>;

export const CustomerServiceMemberRoleSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    tmbId: ObjectIdSchema,
    role: z.enum(CustomerServiceMemberRoleEnum),
    status: z.enum(CustomerServiceResourceStatusEnum),
    reason: z.string().default(''),
    creatorTmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceMemberRoleType = z.infer<typeof CustomerServiceMemberRoleSchema>;

export const CustomerServiceMemberRoleAuditSchema = z.object({
  _id: ObjectIdSchema,
  teamId: ObjectIdSchema,
  tmbId: ObjectIdSchema,
  action: z.enum(CustomerServiceMemberRoleAuditActionEnum),
  fromRole: z.enum(CustomerServiceMemberRoleEnum).optional(),
  toRole: z.enum(CustomerServiceMemberRoleEnum),
  fromStatus: z.enum(CustomerServiceResourceStatusEnum).optional(),
  toStatus: z.enum(CustomerServiceResourceStatusEnum),
  reason: z.string(),
  operatorTmbId: ObjectIdSchema,
  createTime: z.date()
});
export type CustomerServiceMemberRoleAuditType = z.infer<
  typeof CustomerServiceMemberRoleAuditSchema
>;

export const CustomerServiceKnowledgeSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    datasetId: ObjectIdSchema,
    collectionId: ObjectIdSchema,
    title: z.string(),
    sourceName: z.string().default(''),
    sourceRequestRecordId: ObjectIdSchema.optional(),
    sourceSessionId: z.string().optional(),
    knowledgeType: z.enum(CustomerServiceKnowledgeTypeEnum),
    audienceLevel: z.enum(CustomerServiceAudienceEnum),
    modelIds: z.array(ObjectIdSchema).default([]),
    hardwareVersionIds: z.array(ObjectIdSchema).default([]),
    softwareVersionIds: z.array(ObjectIdSchema).default([]),
    effectiveFrom: z.date().optional(),
    effectiveTo: z.date().optional(),
    status: z.enum(CustomerServiceKnowledgeStatusEnum),
    version: z.number().int().positive(),
    versionGroupId: ObjectIdSchema,
    previousKnowledgeId: ObjectIdSchema.optional(),
    supersededBy: ObjectIdSchema.optional().nullable(),
    supersededAt: z.date().optional().nullable(),
    structuredData: z.record(z.string(), z.unknown()).optional().nullable(),
    submitterTmbId: ObjectIdSchema.optional(),
    submitTime: z.date().optional(),
    reviewerTmbId: ObjectIdSchema.optional(),
    reviewTime: z.date().optional(),
    reviewReason: z.string().default(''),
    publishedTime: z.date().optional(),
    offlineTime: z.date().optional(),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceKnowledgeType = z.infer<typeof CustomerServiceKnowledgeSchema>;

export const CustomerServiceKnowledgeAuditSchema = z.object({
  _id: ObjectIdSchema,
  teamId: ObjectIdSchema,
  knowledgeId: ObjectIdSchema,
  action: z.enum(CustomerServiceKnowledgeAuditActionEnum),
  fromStatus: z.enum(CustomerServiceKnowledgeStatusEnum).optional(),
  toStatus: z.enum(CustomerServiceKnowledgeStatusEnum),
  reason: z.string().default(''),
  operatorTmbId: ObjectIdSchema,
  createTime: z.date()
});
export type CustomerServiceKnowledgeAuditType = z.infer<typeof CustomerServiceKnowledgeAuditSchema>;

export const CustomerServiceHumanContactSchema = z.object({
  name: z.string().default('人工客服'),
  phone: z.string().optional(),
  url: z.string().optional(),
  workTime: z.string().optional()
});

export const CustomerServiceRuleConfigSchema = z.object({
  lowConfidenceThreshold: z.number().min(0).max(1).default(0.45),
  lowConfidenceMaxCount: z.number().int().positive().default(2),
  maxAnswerTokens: z.number().int().positive().default(600),
  dangerousKeywords: z.array(z.string()).default([]),
  disputeKeywords: z.array(z.string()).default([]),
  complaintKeywords: z.array(z.string()).default([]),
  humanRequestKeywords: z.array(z.string()).default([])
});

/** 客服公开入口使用的全局唯一随机标识；大小写敏感且不能由业务编码推导。 */
export const CustomerServicePublicIdSchema = z
  .string()
  .trim()
  .min(20)
  .max(80)
  .regex(/^cs_[A-Za-z0-9]+$/)
  .meta({
    example: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
    description: '客服公开入口的全局唯一随机标识'
  });

export const CustomerServiceProjectSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    appId: ObjectIdSchema,
    projectCode: z.string(),
    publicId: CustomerServicePublicIdSchema.optional(),
    name: z.string(),
    status: z.enum(CustomerServiceProjectStatusEnum),
    modelIds: z.array(ObjectIdSchema).default([]),
    defaultAudience: z.enum(CustomerServiceAudienceEnum),
    welcomeText: z.string().default(''),
    recommendedQuestions: z.array(z.string()).default([]),
    humanContact: CustomerServiceHumanContactSchema,
    ruleConfig: CustomerServiceRuleConfigSchema,
    sessionRetentionDays: z.number().int().nonnegative().optional(),
    workflowSyncStatus: z
      .enum(CustomerServiceWorkflowSyncStatusEnum)
      .default(CustomerServiceWorkflowSyncStatusEnum.idle),
    workflowSyncFailureReason: z.string().default(''),
    workflowSyncFailureTime: z.date().optional(),
    workflowSyncLastAttemptTime: z.date().optional(),
    workflowSyncSuccessTime: z.date().optional(),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceProjectType = z.infer<typeof CustomerServiceProjectSchema>;

export const CustomerServiceKeyBindingSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    projectId: ObjectIdSchema,
    openApiKeyId: ObjectIdSchema,
    maxAudience: z.enum(CustomerServiceAudienceEnum),
    status: z.enum(CustomerServiceResourceStatusEnum),
    allowedOrigins: z.array(z.string()).default([]),
    rateLimit: z
      .object({
        seconds: z.number().int().positive(),
        limit: z.number().int().positive()
      })
      .optional(),
    disabledReason: z.string().default(''),
    tmbId: ObjectIdSchema,
    updateTmbId: ObjectIdSchema
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceKeyBindingType = z.infer<typeof CustomerServiceKeyBindingSchema>;

export const CustomerServiceRequestSchema = z
  .object({
    _id: ObjectIdSchema,
    teamId: ObjectIdSchema,
    projectId: ObjectIdSchema,
    openApiKeyId: ObjectIdSchema,
    requestId: z.string(),
    question: z.string().default(''),
    externalSessionId: z.string(),
    internalChatId: z.string(),
    responseChatItemId: z.string(),
    status: z.enum(CustomerServiceRequestStatusEnum),
    resultStatus: z.enum(CustomerServiceChatStatusEnum).optional(),
    audience: z.enum(CustomerServiceAudienceEnum),
    modelId: ObjectIdSchema.optional(),
    hardwareVersionId: ObjectIdSchema.optional(),
    softwareVersionId: ObjectIdSchema.optional(),
    candidateModelIds: z.array(ObjectIdSchema).default([]),
    serverAnswer: z.string().optional(),
    safetyWarning: z.string().optional(),
    humanReason: z.enum(CustomerServiceHumanHandoffReasonEnum).optional(),
    lowConfidence: z.boolean().default(false),
    citationCount: z.number().int().nonnegative().default(0),
    unresolved: z.boolean().default(false),
    errorMessage: z.string().default('')
  })
  .extend(CustomerServiceTimestampSchema.shape);
export type CustomerServiceRequestType = z.infer<typeof CustomerServiceRequestSchema>;
