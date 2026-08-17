import {
  CustomerServiceChatStatusEnum,
  CustomerServiceRequestStatusEnum,
  type CustomerServiceAudienceEnum,
  type CustomerServiceHumanHandoffReasonEnum
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import { redactCustomerServiceSensitiveText } from '@fastgpt/global/core/customerService/privacy';
import { MongoCustomerServiceRequest } from './schema';

/**
 * 原子占用 project + key + requestId 幂等键。重复处理中返回冲突，超时占用可被同一上下文回收，
 * 已完成请求交给调用方回放。
 */
export const acquireCustomerServiceRequest = async ({
  teamId,
  projectId,
  openApiKeyId,
  requestId,
  question = '',
  externalSessionId,
  internalChatId,
  responseChatItemId,
  audience,
  processingStaleMs = 30 * 60 * 1000
}: {
  teamId: string;
  projectId: string;
  openApiKeyId: string;
  requestId: string;
  question?: string;
  externalSessionId: string;
  internalChatId: string;
  responseChatItemId: string;
  audience: CustomerServiceAudienceEnum;
  processingStaleMs?: number;
}) => {
  // 请求正文会进入运营检索和审计列表；保留可读问题的同时，避免把手机号、订单号或
  // API Key 等常见敏感字段复制到客服业务投影。原生聊天链路仍按 FastGPT 既有策略保存。
  const persistedQuestion = redactCustomerServiceSensitiveText(question);
  try {
    const item = await MongoCustomerServiceRequest.create({
      teamId,
      projectId,
      openApiKeyId,
      requestId,
      question: persistedQuestion,
      externalSessionId,
      internalChatId,
      responseChatItemId,
      status: CustomerServiceRequestStatusEnum.processing,
      audience
    });
    return { item: item.toObject(), acquired: true as const };
  } catch (error) {
    if ((error as { code?: number })?.code !== 11000) throw error;
    const existing = await MongoCustomerServiceRequest.findOne({
      teamId,
      projectId,
      openApiKeyId,
      requestId
    }).lean();
    if (!existing) throw error;
    if (
      existing.externalSessionId !== externalSessionId ||
      existing.internalChatId !== internalChatId ||
      existing.responseChatItemId !== responseChatItemId ||
      existing.audience !== audience
    ) {
      throw new UserError('Customer service request idempotency context conflicts');
    }

    /** 只有仍处于预期状态的原记录可被当前调用原子重新占用。 */
    const retryExisting = (filter: Record<string, unknown>) =>
      MongoCustomerServiceRequest.findOneAndUpdate(
        { _id: existing._id, ...filter },
        {
          $set: {
            status: CustomerServiceRequestStatusEnum.processing,
            question: persistedQuestion,
            errorMessage: '',
            candidateModelIds: [],
            lowConfidence: false,
            citationCount: 0,
            updateTime: new Date()
          },
          $unset: {
            resultStatus: '',
            modelId: '',
            hardwareVersionId: '',
            softwareVersionId: '',
            serverAnswer: '',
            safetyWarning: '',
            humanReason: ''
          }
        },
        { new: true }
      ).lean();

    if (existing.status === CustomerServiceRequestStatusEnum.processing) {
      const staleBefore = new Date(Date.now() - processingStaleMs);
      if (existing.updateTime > staleBefore) {
        throw new UserError('Customer service request is processing');
      }
      const retried = await retryExisting({
        status: CustomerServiceRequestStatusEnum.processing,
        updateTime: { $lte: staleBefore }
      });
      if (!retried) throw new UserError('Customer service request is processing');
      return { item: retried, acquired: true as const };
    }
    if (existing.status === CustomerServiceRequestStatusEnum.failed) {
      const retried = await retryExisting({ status: CustomerServiceRequestStatusEnum.failed });
      if (!retried) throw new UserError('Customer service request is processing');
      return { item: retried, acquired: true as const };
    }
    return { item: existing, acquired: false as const };
  }
};

/** 完成客服请求并保存回放所需的业务元数据；生成正文仍只保存在 FastGPT chat item。 */
export const completeCustomerServiceRequest = ({
  id,
  resultStatus,
  modelId,
  hardwareVersionId,
  softwareVersionId,
  candidateModelIds = [],
  serverAnswer,
  safetyWarning,
  humanReason,
  lowConfidence = false,
  citationCount = 0
}: {
  id: string;
  resultStatus: CustomerServiceChatStatusEnum;
  modelId?: string;
  hardwareVersionId?: string;
  softwareVersionId?: string;
  candidateModelIds?: string[];
  serverAnswer?: string;
  safetyWarning?: string;
  humanReason?: CustomerServiceHumanHandoffReasonEnum;
  lowConfidence?: boolean;
  citationCount?: number;
}) =>
  MongoCustomerServiceRequest.findByIdAndUpdate(id, {
    $set: {
      status: CustomerServiceRequestStatusEnum.completed,
      resultStatus,
      modelId,
      hardwareVersionId,
      softwareVersionId,
      candidateModelIds,
      serverAnswer:
        serverAnswer === undefined ? undefined : redactCustomerServiceSensitiveText(serverAnswer),
      safetyWarning:
        safetyWarning === undefined ? undefined : redactCustomerServiceSensitiveText(safetyWarning),
      humanReason,
      lowConfidence,
      citationCount,
      updateTime: new Date()
    }
  }).lean();

/** 将执行失败标记为可重试状态，不缓存错误响应。 */
export const failCustomerServiceRequest = ({ id, error }: { id: string; error: unknown }) =>
  MongoCustomerServiceRequest.findByIdAndUpdate(id, {
    $set: {
      status: CustomerServiceRequestStatusEnum.failed,
      errorMessage: redactCustomerServiceSensitiveText(
        error instanceof Error ? error.message : String(error)
      ),
      updateTime: new Date()
    }
  });

/**
 * 按客服项目、专用 Key、幂等请求和外部会话精确定位正在生成的请求。
 * 停止接口不能只信任 requestId，否则同一团队或 Key 下的其它访客会话可能被越权停止。
 */
export const findProcessingCustomerServiceRequest = ({
  teamId,
  projectId,
  openApiKeyId,
  requestId,
  sessionId
}: {
  teamId: string;
  projectId: string;
  openApiKeyId: string;
  requestId: string;
  sessionId: string;
}) =>
  MongoCustomerServiceRequest.findOne({
    teamId,
    projectId,
    openApiKeyId,
    requestId,
    externalSessionId: sessionId,
    status: CustomerServiceRequestStatusEnum.processing
  })
    .select('_id internalChatId')
    .lean();

/** 计算同一会话末尾连续低置信度次数，遇到正常回答立即停止。 */
export const countConsecutiveCustomerServiceLowConfidence = async ({
  teamId,
  projectId,
  internalChatId,
  limit
}: {
  teamId: string;
  projectId: string;
  internalChatId: string;
  limit: number;
}) => {
  const items = await MongoCustomerServiceRequest.find({
    teamId,
    projectId,
    internalChatId,
    status: CustomerServiceRequestStatusEnum.completed
  })
    .select('lowConfidence resultStatus')
    .sort({ updateTime: -1 })
    .limit(limit)
    .lean();

  let count = 0;
  for (const item of items) {
    if (!item.lowConfidence || item.resultStatus === CustomerServiceChatStatusEnum.answered) break;
    count += 1;
  }
  return count;
};

/** 按客服绑定、外部会话和消息 ID 定位已完成请求，供反馈接口验证归属。 */
export const findCompletedCustomerServiceRequestByMessage = ({
  teamId,
  projectId,
  openApiKeyId,
  externalSessionId,
  responseChatItemId
}: {
  teamId: string;
  projectId: string;
  openApiKeyId: string;
  externalSessionId: string;
  responseChatItemId: string;
}) =>
  MongoCustomerServiceRequest.findOne({
    teamId,
    projectId,
    openApiKeyId,
    externalSessionId,
    responseChatItemId,
    status: CustomerServiceRequestStatusEnum.completed
  }).lean();

/**
 * 更新客户“问题未解决”标记。调用方必须先通过消息归属校验；条件更新防止非完成请求被
 * 运营统计误收录，重复提交同一状态保持幂等。
 */
export const setCustomerServiceRequestUnresolved = ({
  id,
  unresolved
}: {
  id: string;
  unresolved: boolean;
}) =>
  MongoCustomerServiceRequest.findOneAndUpdate(
    { _id: id, status: CustomerServiceRequestStatusEnum.completed },
    { $set: { unresolved, updateTime: new Date() } },
    { new: true }
  ).lean();

/** 获取同一内部会话最近一次完成请求的产品上下文。 */
export const findLatestCompletedCustomerServiceRequest = ({
  teamId,
  projectId,
  internalChatId
}: {
  teamId: string;
  projectId: string;
  internalChatId: string;
}) =>
  MongoCustomerServiceRequest.findOne({
    teamId,
    projectId,
    internalChatId,
    status: CustomerServiceRequestStatusEnum.completed
  })
    .select('modelId hardwareVersionId softwareVersionId')
    .sort({ updateTime: -1 })
    .lean();
