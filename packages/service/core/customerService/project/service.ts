import {
  CustomerServiceAudienceEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import type { ClientSession } from '../../../common/mongo';
import { MongoApp } from '../../app/schema';
import { MongoOpenApi } from '../../../support/openapi/schema';
import {
  createCustomerServiceProject,
  findActiveCustomerServiceKeyBindingByOpenApiKeyId,
  findCustomerServiceProjectById,
  listCustomerServiceProjects,
  setCustomerServiceProjectPublicId,
  updateCustomerServiceKeyBindingById,
  updateCustomerServiceProjectById,
  upsertCustomerServiceKeyBinding
} from './entity';
import { MongoCustomerServiceKeyBinding } from './schema';
import { listProductModelsByIds } from '../product/entity';
import { CustomerServicePublicIdSchema } from '@fastgpt/global/core/customerService/type';
import { generateCustomerServiceProjectPublicId } from './utils';

const isMongoDuplicateKeyError = (error: unknown): error is { code: number } =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

/** 客服项目只保存当前团队真实型号引用，避免配置错误退化成项目全型号。 */
const validateCustomerServiceProjectModelIds = async ({
  teamId,
  modelIds
}: {
  teamId: string;
  modelIds: string[];
}) => {
  const uniqueModelIds = Array.from(new Set(modelIds));
  const models = await listProductModelsByIds({ teamId, ids: uniqueModelIds });
  if (models.length !== uniqueModelIds.length) {
    throw new UserError('Customer service project product models are invalid');
  }
  return uniqueModelIds;
};

/**
 * 查询一个已认证的真实 OpenAPI Key 是否被启用中的客服项目占用。
 * 调用方必须传 authCert 返回的真实 Key，不能使用带 appId 的兼容传输字符串。
 */
export const hasActiveCustomerServiceBindingByApiKey = async ({
  teamId,
  apiKey
}: {
  teamId: string;
  apiKey: string;
}) => {
  const openApiKey = await MongoOpenApi.findOne({ teamId, apiKey }).select('_id').lean();
  if (!openApiKey) return false;

  return !!(await findActiveCustomerServiceKeyBindingByOpenApiKeyId({
    teamId,
    openApiKeyId: String(openApiKey._id)
  }));
};

/**
 * 解析已通过 authCert 校验的客服 Key 上下文，并强制执行绑定、项目、App 和来源限制。
 * 任何缺失或停用状态都显式报错，调用方不得回退到普通 App 或全库检索。
 */
export const getCustomerServiceProjectContextByApiKey = async ({
  teamId,
  apiKey,
  origin,
  trustedInternalRequest = false
}: {
  teamId: string;
  apiKey: string;
  origin?: string;
  trustedInternalRequest?: boolean;
}) => {
  const openApiKey = await MongoOpenApi.findOne({ teamId, apiKey }).select('_id tmbId').lean();
  if (!openApiKey) throw new UserError('Customer service API key not found');

  const binding = await MongoCustomerServiceKeyBinding.findOne({
    teamId,
    openApiKeyId: openApiKey._id,
    status: CustomerServiceResourceStatusEnum.active
  }).lean();
  if (!binding) throw new UserError('Customer service API key binding is unavailable');

  if (!trustedInternalRequest && binding.allowedOrigins.length > 0) {
    const normalizedOrigin = origin?.trim().replace(/\/$/, '');
    const allowedOrigins = binding.allowedOrigins.map((item) => item.trim().replace(/\/$/, ''));
    if (!normalizedOrigin || !allowedOrigins.includes(normalizedOrigin)) {
      throw new UserError('Customer service request origin is not allowed');
    }
  }

  const project = await findCustomerServiceProjectById({
    teamId,
    projectId: String(binding.projectId)
  });
  if (!project || project.status !== CustomerServiceProjectStatusEnum.active) {
    throw new UserError('Customer service project is unavailable');
  }

  const app = await MongoApp.findOne({
    _id: project.appId,
    teamId,
    deleteTime: null
  }).lean();
  if (!app) throw new UserError('Customer service app is unavailable');

  return {
    openApiKey,
    binding,
    project,
    app
  };
};

/** 创建客服项目，项目只引用同团队的现有 FastGPT App。 */
export const createCustomerServiceProjectWithApp = async ({
  teamId,
  tmbId,
  appId,
  projectCode,
  name,
  modelIds = [],
  defaultAudience = CustomerServiceAudienceEnum.public,
  welcomeText = '',
  recommendedQuestions = [],
  humanContact = { name: '人工客服' },
  ruleConfig = {
    lowConfidenceThreshold: 0.45,
    lowConfidenceMaxCount: 2,
    maxAnswerTokens: 600,
    dangerousKeywords: [],
    disputeKeywords: [],
    complaintKeywords: [],
    humanRequestKeywords: []
  },
  sessionRetentionDays,
  session
}: {
  teamId: string;
  tmbId: string;
  appId: string;
  projectCode: string;
  name: string;
  modelIds?: string[];
  defaultAudience?: CustomerServiceAudienceEnum;
  welcomeText?: string;
  recommendedQuestions?: string[];
  humanContact?: { name: string; phone?: string; url?: string; workTime?: string };
  ruleConfig?: {
    lowConfidenceThreshold: number;
    lowConfidenceMaxCount: number;
    maxAnswerTokens: number;
    dangerousKeywords: string[];
    disputeKeywords: string[];
    complaintKeywords: string[];
    humanRequestKeywords: string[];
  };
  sessionRetentionDays?: number;
  session?: ClientSession;
}) => {
  const [app, normalizedModelIds] = await Promise.all([
    MongoApp.findOne({ _id: appId, teamId, deleteTime: null })
      .select('_id')
      .session(session ?? null)
      .lean(),
    validateCustomerServiceProjectModelIds({ teamId, modelIds })
  ]);
  if (!app) {
    throw new UserError('Customer service app not found');
  }

  return createCustomerServiceProject(
    {
      teamId,
      appId,
      projectCode: projectCode.trim().toUpperCase(),
      publicId: generateCustomerServiceProjectPublicId(),
      name: name.trim(),
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: normalizedModelIds,
      defaultAudience,
      welcomeText: welcomeText.trim(),
      recommendedQuestions: Array.from(
        new Set(recommendedQuestions.map((item) => item.trim()).filter(Boolean))
      ),
      humanContact,
      ruleConfig,
      sessionRetentionDays,
      workflowSyncStatus: CustomerServiceWorkflowSyncStatusEnum.idle,
      workflowSyncFailureReason: '',
      tmbId,
      updateTmbId: tmbId
    },
    session
  );
};

/**
 * 为 V1.4 及更早的客服项目原子补齐公开标识。并发调用只会保留一个值；随机值碰撞时
 * 由全局唯一索引拒绝并重试，绝不回退到跨团队 projectCode 查询。
 */
export const ensureCustomerServiceProjectPublicId = async ({
  teamId,
  projectId,
  session
}: {
  teamId: string;
  projectId: string;
  session?: ClientSession;
}) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const project = await findCustomerServiceProjectById({ teamId, projectId, session });
    if (!project) throw new UserError('Customer service project not found');
    if (CustomerServicePublicIdSchema.safeParse(project.publicId).success) return project;

    try {
      const updated = await setCustomerServiceProjectPublicId({
        teamId,
        projectId,
        currentPublicId: project.publicId,
        publicId: generateCustomerServiceProjectPublicId(),
        session
      });
      if (updated) return updated;
    } catch (error) {
      if (!isMongoDuplicateKeyError(error)) throw error;
    }
  }

  throw new UserError('Failed to allocate customer service public ID');
};

/** 管理端读取项目时补齐历史记录，确保每个生成的公开入口都使用稳定的全局唯一标识。 */
export const listCustomerServiceProjectsWithPublicId = async ({ teamId }: { teamId: string }) => {
  const projects = await listCustomerServiceProjects({ teamId });
  return Promise.all(
    projects.map((project) =>
      CustomerServicePublicIdSchema.safeParse(project.publicId).success
        ? project
        : ensureCustomerServiceProjectPublicId({ teamId, projectId: String(project._id) })
    )
  );
};

/** 将现有 OpenAPI Key 绑定到客服项目，不复制 Key、额度或过期配置。 */
export const bindCustomerServiceOpenApiKey = async ({
  teamId,
  tmbId,
  projectId,
  openApiKeyId,
  maxAudience,
  allowedOrigins = [],
  rateLimit,
  session
}: {
  teamId: string;
  tmbId: string;
  projectId: string;
  openApiKeyId: string;
  maxAudience: CustomerServiceAudienceEnum;
  allowedOrigins?: string[];
  rateLimit?: { seconds: number; limit: number };
  session?: ClientSession;
}) => {
  const [project, openApiKey] = await Promise.all([
    findCustomerServiceProjectById({ teamId, projectId, session }),
    MongoOpenApi.findOne({ _id: openApiKeyId, teamId })
      .select('_id tmbId')
      .session(session ?? null)
      .lean()
  ]);
  if (!project) throw new UserError('Customer service project not found');
  if (!openApiKey) throw new UserError('OpenAPI key not found');
  if (String(openApiKey.tmbId) !== String(tmbId)) {
    throw new UserError('Only the OpenAPI key owner can bind this key');
  }
  if (rateLimit && (rateLimit.seconds <= 0 || rateLimit.limit <= 0)) {
    throw new UserError('Customer service rate limit is invalid');
  }

  return upsertCustomerServiceKeyBinding(
    {
      teamId,
      projectId,
      openApiKeyId,
      maxAudience,
      status: CustomerServiceResourceStatusEnum.active,
      allowedOrigins: Array.from(
        new Set(allowedOrigins.map((item) => item.trim()).filter(Boolean))
      ),
      rateLimit,
      disabledReason: '',
      tmbId,
      updateTmbId: tmbId
    },
    session
  );
};

/** 启停客服 Key 绑定；停用必须记录原因，重新启用时清空旧原因。 */
export const updateCustomerServiceKeyBindingStatus = ({
  teamId,
  tmbId,
  bindingId,
  status,
  reason,
  session
}: {
  teamId: string;
  tmbId: string;
  bindingId: string;
  status: CustomerServiceResourceStatusEnum;
  reason: string;
  session?: ClientSession;
}) => {
  if (status === CustomerServiceResourceStatusEnum.inactive && !reason.trim()) {
    throw new UserError('Customer service key disable reason is required');
  }
  return updateCustomerServiceKeyBindingById({
    teamId,
    bindingId,
    update: {
      status,
      disabledReason: status === CustomerServiceResourceStatusEnum.inactive ? reason.trim() : '',
      updateTmbId: tmbId
    },
    session
  });
};

/** 更新客服项目配置；App 引用变更由独立创建/迁移流程处理，避免无权限替换。 */
export const updateCustomerServiceProjectConfig = async ({
  teamId,
  tmbId,
  projectId,
  name,
  status,
  modelIds,
  defaultAudience,
  welcomeText,
  recommendedQuestions,
  humanContact,
  ruleConfig,
  sessionRetentionDays,
  session
}: {
  teamId: string;
  tmbId: string;
  projectId: string;
  name?: string;
  status?: CustomerServiceProjectStatusEnum;
  modelIds?: string[];
  defaultAudience?: CustomerServiceAudienceEnum;
  welcomeText?: string;
  recommendedQuestions?: string[];
  humanContact?: { name: string; phone?: string; url?: string; workTime?: string };
  ruleConfig?: {
    lowConfidenceThreshold: number;
    lowConfidenceMaxCount: number;
    maxAnswerTokens: number;
    dangerousKeywords: string[];
    disputeKeywords: string[];
    complaintKeywords: string[];
    humanRequestKeywords: string[];
  };
  sessionRetentionDays?: number | null;
  session?: ClientSession;
}) => {
  const normalizedModelIds = modelIds
    ? await validateCustomerServiceProjectModelIds({ teamId, modelIds })
    : undefined;
  return updateCustomerServiceProjectById({
    teamId,
    projectId,
    update: {
      ...(name !== undefined && { name: name.trim() }),
      ...(status !== undefined && { status }),
      ...(normalizedModelIds !== undefined && { modelIds: normalizedModelIds }),
      ...(defaultAudience !== undefined && { defaultAudience }),
      ...(welcomeText !== undefined && { welcomeText: welcomeText.trim() }),
      ...(recommendedQuestions !== undefined && {
        recommendedQuestions: Array.from(
          new Set(recommendedQuestions.map((item) => item.trim()).filter(Boolean))
        )
      }),
      ...(humanContact !== undefined && { humanContact }),
      ...(ruleConfig !== undefined && { ruleConfig }),
      ...(sessionRetentionDays !== undefined && { sessionRetentionDays }),
      updateTmbId: tmbId
    },
    session
  });
};
