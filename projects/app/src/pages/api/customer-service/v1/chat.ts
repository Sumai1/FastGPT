import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { handler as chatCompletionHandler } from '@/pages/api/v2/chat/completions';
import { authCustomerServiceExternalRequest } from '@/service/customerService/externalAuth';
import {
  clearCustomerServiceRequestContext,
  clearCustomerServiceRuntimeStop,
  getCustomerServicePublicProxyProcessingCallback,
  setCustomerServiceRequestContext
} from '@/service/customerService/context';
import {
  extractCustomerServiceCitations,
  getSavedCustomerServiceChatResult,
  replaceCustomerServiceChatAnswer,
  resolveCustomerServiceWorkflowFixedBranchAction
} from '@/service/customerService/chatResult';
import { formatCustomerServiceProductModels } from '@/service/customerService/format';
import {
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum,
  resolveCustomerServiceAudience
} from '@fastgpt/global/core/customerService/constants';
import { ChatErrEnum } from '@fastgpt/global/common/error/code/chat';
import { UserError } from '@fastgpt/global/common/error/utils';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import {
  CustomerServiceChatBodySchema,
  CustomerServiceChatResponseSchema,
  type CustomerServiceChatResponse
} from '@fastgpt/global/openapi/customerService/api';
import { SseResponseEventEnum } from '@fastgpt/global/core/workflow/runtime/constants';
import { workflowSseEvent } from '@fastgpt/global/core/workflow/runtime/sse';
import { customerServiceFrequencyLimit } from '@fastgpt/service/common/api/frequencyLimit';
import { getSseErrorResponse, jsonRes } from '@fastgpt/service/common/response';
import { createSseStreamContext } from '@fastgpt/service/common/response/sse';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import {
  getCustomerServiceHumanAnswer,
  resolveCustomerServiceHumanRule,
  type CustomerServiceHumanRuleReason
} from '@fastgpt/service/core/customerService/chat/rule';
import {
  getCustomerServiceProductClarification,
  resolveCustomerServiceProduct,
  type CustomerServiceProductResolution
} from '@fastgpt/service/core/customerService/chat/productResolver';
import {
  findProductModelById,
  findProductVersionById,
  listProductModelsByIds
} from '@fastgpt/service/core/customerService/product/entity';
import {
  acquireCustomerServiceRequest,
  completeCustomerServiceRequest,
  countConsecutiveCustomerServiceLowConfidence,
  failCustomerServiceRequest,
  findLatestCompletedCustomerServiceRequest
} from '@fastgpt/service/core/customerService/request/service';
import { getCustomerServiceCollectionIds } from '@fastgpt/service/core/customerService/search/whitelist';
import { hashCustomerServiceExternalUserId } from '@fastgpt/service/core/customerService/privacy';

const stableId = (value: string, length: number) =>
  createHash('sha256').update(value).digest('hex').slice(0, length);

const customerServiceStatusEvent = 'customerServiceStatus';
const processingStatusData = JSON.stringify({ status: 'processing' });

const humanReasonMap: Record<
  CustomerServiceHumanRuleReason,
  CustomerServiceHumanHandoffReasonEnum
> = {
  dangerous_operation: CustomerServiceHumanHandoffReasonEnum.dangerous,
  dispute: CustomerServiceHumanHandoffReasonEnum.dispute,
  complaint: CustomerServiceHumanHandoffReasonEnum.complaint,
  human_requested: CustomerServiceHumanHandoffReasonEnum.requested
};

/**
 * 客服 Chat 入口。所有检索范围由服务端生成，流式请求也先完成安全和引用判定，再用兼容 SSE
 * 事件输出，避免把随后需要撤回的低置信度内容提前发给客户端。
 */
export async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<CustomerServiceChatResponse | void> {
  const body = parseApiInput({ req, bodySchema: CustomerServiceChatBodySchema }).body;
  const { teamId, project, binding, app, auth } = await authCustomerServiceExternalRequest(req);
  const projectId = String(project._id);
  const openApiKeyId = String(binding.openApiKeyId);

  if (
    binding.rateLimit &&
    !(await customerServiceFrequencyLimit({
      teamId,
      projectId,
      openApiKeyId,
      limit: binding.rateLimit.limit,
      seconds: binding.rateLimit.seconds,
      res
    }))
  ) {
    return;
  }

  const requestId = body.requestId || getNanoid(24);
  const externalSessionId = body.sessionId || getNanoid(24);
  const internalChatId = stableId(
    `${projectId}:${openApiKeyId}:${externalSessionId}:${body.externalUserId || ''}`,
    32
  );
  const responseChatItemId = stableId(`${projectId}:${openApiKeyId}:${requestId}`, 24);

  // 尽早清理上一次会话遗留的停止标记；之后 dispatch 会保留 stop API 写入的新标记。
  await clearCustomerServiceRuntimeStop({
    appId: String(app._id),
    chatId: internalChatId
  });

  const audience = resolveCustomerServiceAudience({
    maxAudience: binding.maxAudience,
    requestedAudience: body.audience || project.defaultAudience
  });
  const externalUserIdHash = hashCustomerServiceExternalUserId({
    teamId,
    projectId,
    externalUserId: body.externalUserId
  });
  let streamContext: ReturnType<typeof createSseStreamContext> | undefined;

  const startStreamResponse = () => {
    if (!body.stream || streamContext) return;
    res.statusCode = 200;
    streamContext = createSseStreamContext({
      res,
      heartbeat: {
        intervalMs: 10_000,
        write: (write) => write({ event: customerServiceStatusEvent, data: processingStatusData })
      }
    });
    res.flushHeaders?.();
    streamContext.write({ event: customerServiceStatusEvent, data: processingStatusData });
  };

  const writeResponse = (response: CustomerServiceChatResponse) => {
    const parsed = CustomerServiceChatResponseSchema.parse(response);
    if (!body.stream) return parsed;

    startStreamResponse();
    const answerChunks = parsed.answer.match(/[\s\S]{1,80}/g) || [];
    answerChunks.forEach((chunk) => {
      const event = workflowSseEvent.answerDelta(chunk, parsed.messageId);
      streamContext?.write({ event: event.event, data: JSON.stringify(event.data) });
    });
    const stop = workflowSseEvent.answerStop();
    streamContext?.write({ event: stop.event, data: JSON.stringify(stop.data) });
    streamContext?.write({ event: 'customerService', data: JSON.stringify(parsed) });
    const done = workflowSseEvent.done(SseResponseEventEnum.answer);
    streamContext?.write({ event: done.event, data: done.data });
    streamContext?.cleanup();
    if (!res.writableEnded && !res.destroyed) res.end();
  };

  const formatResolvedProduct = async ({
    modelId,
    hardwareVersionId,
    softwareVersionId
  }: {
    modelId?: string;
    hardwareVersionId?: string;
    softwareVersionId?: string;
  }) => {
    const [model, hardwareVersion, softwareVersion] = await Promise.all([
      modelId ? findProductModelById({ teamId, id: modelId }) : undefined,
      hardwareVersionId ? findProductVersionById({ teamId, id: hardwareVersionId }) : undefined,
      softwareVersionId ? findProductVersionById({ teamId, id: softwareVersionId }) : undefined
    ]);
    return {
      modelId: model ? String(model._id) : undefined,
      modelCode: model?.modelCode,
      hardwareVersionId: hardwareVersion ? String(hardwareVersion._id) : undefined,
      hardwareVersionCode: hardwareVersion?.versionCode,
      softwareVersionId: softwareVersion ? String(softwareVersion._id) : undefined,
      softwareVersionCode: softwareVersion?.versionCode
    };
  };

  const acquire = await acquireCustomerServiceRequest({
    teamId,
    projectId,
    openApiKeyId,
    requestId,
    question: body.message,
    externalSessionId,
    internalChatId,
    responseChatItemId,
    audience
  }).catch((error): undefined => {
    if (error instanceof UserError && error.message === 'Customer service request is processing') {
      jsonRes(res, { code: 409, error: ChatErrEnum.chatIsGenerating });
      return;
    }
    throw error;
  });
  if (!acquire) return;

  if (!acquire.acquired) {
    const item = acquire.item;
    const saved =
      item.resultStatus === CustomerServiceChatStatusEnum.answered
        ? await getSavedCustomerServiceChatResult({
            appId: String(app._id),
            chatId: item.internalChatId,
            responseChatItemId: item.responseChatItemId
          })
        : undefined;
    if (item.resultStatus === CustomerServiceChatStatusEnum.answered && !saved) {
      throw new UserError('Customer service idempotent response is unavailable');
    }
    const candidateModels = await listProductModelsByIds({
      teamId,
      ids: item.candidateModelIds.map(String)
    });
    return writeResponse(
      CustomerServiceChatResponseSchema.parse({
        requestId: item.requestId,
        sessionId: item.externalSessionId,
        messageId: item.responseChatItemId,
        status: item.resultStatus,
        answer: saved?.answer || item.serverAnswer || '',
        audience: item.audience,
        resolvedProduct: await formatResolvedProduct({
          modelId: item.modelId ? String(item.modelId) : undefined,
          hardwareVersionId: item.hardwareVersionId ? String(item.hardwareVersionId) : undefined,
          softwareVersionId: item.softwareVersionId ? String(item.softwareVersionId) : undefined
        }),
        candidates: formatCustomerServiceProductModels(candidateModels),
        citations: saved?.citations || [],
        safetyWarning: item.safetyWarning,
        ...(item.resultStatus === CustomerServiceChatStatusEnum.humanRequired && {
          humanContact: project.humanContact
        })
      })
    );
  }

  const requestRecordId = String(acquire.item._id);
  const commonResponse = {
    requestId,
    sessionId: externalSessionId,
    messageId: responseChatItemId,
    audience
  };
  const completeServerResponse = async ({
    status,
    answer,
    resolution,
    safetyWarning,
    humanReason,
    lowConfidence = false
  }: {
    status:
      | CustomerServiceChatStatusEnum.clarificationRequired
      | CustomerServiceChatStatusEnum.humanRequired;
    answer: string;
    resolution?: CustomerServiceProductResolution;
    safetyWarning?: string;
    humanReason?: CustomerServiceHumanHandoffReasonEnum;
    lowConfidence?: boolean;
  }) => {
    const modelId = resolution?.model ? String(resolution.model._id) : undefined;
    const hardwareVersionId = resolution?.hardwareVersion
      ? String(resolution.hardwareVersion._id)
      : undefined;
    const softwareVersionId = resolution?.softwareVersion
      ? String(resolution.softwareVersion._id)
      : undefined;
    const candidateModels = resolution?.modelCandidates || [];
    await completeCustomerServiceRequest({
      id: requestRecordId,
      resultStatus: status,
      modelId,
      hardwareVersionId,
      softwareVersionId,
      candidateModelIds: candidateModels.map((item) => String(item._id)),
      serverAnswer: answer,
      safetyWarning,
      humanReason,
      lowConfidence
    });
    return writeResponse(
      CustomerServiceChatResponseSchema.parse({
        ...commonResponse,
        status,
        answer,
        resolvedProduct: await formatResolvedProduct({
          modelId,
          hardwareVersionId,
          softwareVersionId
        }),
        candidates: formatCustomerServiceProductModels(candidateModels),
        citations: [],
        safetyWarning,
        ...(status === CustomerServiceChatStatusEnum.humanRequired && {
          humanContact: project.humanContact
        })
      })
    );
  };

  try {
    startStreamResponse();
    getCustomerServicePublicProxyProcessingCallback(req)?.();

    const humanRule = resolveCustomerServiceHumanRule({
      message: body.message,
      ruleConfig: project.ruleConfig
    });
    if (humanRule) {
      const humanAnswer = getCustomerServiceHumanAnswer(humanRule);
      return completeServerResponse({
        status: CustomerServiceChatStatusEnum.humanRequired,
        ...humanAnswer,
        humanReason: humanReasonMap[humanRule]
      });
    }

    const previousContext = await findLatestCompletedCustomerServiceRequest({
      teamId,
      projectId,
      internalChatId
    });
    const resolution = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: project.modelIds.map(String),
      message: body.message,
      productModel: body.productModel,
      hardwareVersion: body.hardwareVersion,
      softwareVersion: body.softwareVersion,
      previousModelId: previousContext?.modelId ? String(previousContext.modelId) : undefined,
      previousHardwareVersionId: previousContext?.hardwareVersionId
        ? String(previousContext.hardwareVersionId)
        : undefined,
      previousSoftwareVersionId: previousContext?.softwareVersionId
        ? String(previousContext.softwareVersionId)
        : undefined
    });
    if (resolution.clarification) {
      return completeServerResponse({
        status: CustomerServiceChatStatusEnum.clarificationRequired,
        answer: getCustomerServiceProductClarification({ resolution }),
        resolution
      });
    }

    const modelId = resolution.model ? String(resolution.model._id) : undefined;
    const hardwareVersionId = resolution.hardwareVersion
      ? String(resolution.hardwareVersion._id)
      : undefined;
    const softwareVersionId = resolution.softwareVersion
      ? String(resolution.softwareVersion._id)
      : undefined;
    const collectionIdWhitelist = await getCustomerServiceCollectionIds({
      teamId,
      projectId,
      maxAudience: binding.maxAudience,
      requestAudience: audience,
      modelId,
      hardwareVersionId,
      softwareVersionId
    });

    const completeLowConfidence = async ({ generated = false }: { generated?: boolean } = {}) => {
      const previousLowConfidence = await countConsecutiveCustomerServiceLowConfidence({
        teamId,
        projectId,
        internalChatId,
        limit: project.ruleConfig.lowConfidenceMaxCount
      });
      const shouldHandoff = previousLowConfidence + 1 >= project.ruleConfig.lowConfidenceMaxCount;
      const answer = shouldHandoff
        ? '连续多次未找到足够可靠的资料，建议由人工客服继续核实。'
        : '暂时没有找到足够可靠的资料。请补充设备型号、错误码、故障现象或现场图片。';
      if (generated) {
        await replaceCustomerServiceChatAnswer({
          appId: String(app._id),
          chatId: internalChatId,
          responseChatItemId,
          answer
        });
      }
      return completeServerResponse({
        status: shouldHandoff
          ? CustomerServiceChatStatusEnum.humanRequired
          : CustomerServiceChatStatusEnum.clarificationRequired,
        answer,
        resolution,
        humanReason: shouldHandoff
          ? CustomerServiceHumanHandoffReasonEnum.lowConfidence
          : undefined,
        lowConfidence: true
      });
    };

    if (collectionIdWhitelist.length === 0) return completeLowConfidence();

    setCustomerServiceRequestContext({
      req,
      context: {
        auth,
        projectId,
        openApiKeyId,
        collectionIdWhitelist,
        requestId,
        modelId,
        hardwareVersionId,
        softwareVersionId,
        audience,
        customerServiceStopEnabled: true
      }
    });
    const originalBody = req.body;
    const originalJson = res.json.bind(res);
    let completionResponse: unknown;
    try {
      req.body = {
        appId: String(app._id),
        chatId: internalChatId,
        messages: [
          {
            role: 'system',
            content:
              `你是产品客服。当前型号：${resolution.model?.modelCode || '未确认'}；` +
              `硬件版本：${resolution.hardwareVersion?.versionCode || '未指定'}；` +
              `软件版本：${resolution.softwareVersion?.versionCode || '未指定'}。` +
              '只能依据本次检索返回的资料回答产品事实；资料不足时明确说明无法确认，不得猜测。' +
              `回答控制在约 ${project.ruleConfig.maxAnswerTokens} 个 token 内，优先给出直接步骤和必要安全提示。`
          },
          { role: 'user', content: body.message }
        ],
        stream: false,
        detail: true,
        retainDatasetCite: true,
        responseChatItemId,
        variables: {
          customerServiceProjectId: projectId,
          customerServiceAudience: audience,
          customerServiceProductModelId: modelId,
          customerServiceHardwareVersionId: hardwareVersionId,
          customerServiceSoftwareVersionId: softwareVersionId
        },
        metadata: {
          customerServiceProjectId: projectId,
          customerServiceRequestId: requestId,
          customerServiceExternalSessionId: externalSessionId,
          customerServiceExternalUserIdHash: externalUserIdHash,
          customerServiceAudience: audience,
          customerServiceProductModelId: modelId,
          customerServiceHardwareVersionId: hardwareVersionId,
          customerServiceSoftwareVersionId: softwareVersionId
        }
      };
      res.json = ((value: unknown) => {
        completionResponse = value;
        return res;
      }) as typeof res.json;
      await chatCompletionHandler(req, res);
    } finally {
      req.body = originalBody;
      res.json = originalJson as typeof res.json;
      clearCustomerServiceRequestContext(req);
    }

    if (
      !completionResponse ||
      typeof completionResponse !== 'object' ||
      !('choices' in completionResponse)
    ) {
      throw new UserError('Customer service chat generation failed');
    }
    const saved = await getSavedCustomerServiceChatResult({
      appId: String(app._id),
      chatId: internalChatId,
      responseChatItemId
    });
    if (!saved?.answer) throw new UserError('Customer service chat response is empty');
    const fixedBranchAction = resolveCustomerServiceWorkflowFixedBranchAction(
      saved.workflowFixedBranch
    );

    if (fixedBranchAction === 'humanRequired') {
      return completeServerResponse({
        status: CustomerServiceChatStatusEnum.humanRequired,
        answer: saved.answer,
        resolution
      });
    }

    if (fixedBranchAction === 'lowConfidence') {
      return completeLowConfidence();
    }

    if (fixedBranchAction === 'answerWithoutCitations') {
      await completeCustomerServiceRequest({
        id: requestRecordId,
        resultStatus: CustomerServiceChatStatusEnum.answered,
        modelId,
        hardwareVersionId,
        softwareVersionId,
        citationCount: 0
      });
      return writeResponse(
        CustomerServiceChatResponseSchema.parse({
          ...commonResponse,
          status: CustomerServiceChatStatusEnum.answered,
          answer: saved.answer,
          resolvedProduct: await formatResolvedProduct({
            modelId,
            hardwareVersionId,
            softwareVersionId
          }),
          candidates: [],
          citations: []
        })
      );
    }

    const completionCitations = extractCustomerServiceCitations(
      (completionResponse as { responseData?: unknown }).responseData
    );
    const citations = completionCitations.citations.length
      ? completionCitations.citations
      : saved.citations;
    const confidence = completionCitations.citations.length
      ? completionCitations.confidence
      : saved.confidence;
    if (citations.length === 0 || confidence < project.ruleConfig.lowConfidenceThreshold) {
      return completeLowConfidence({ generated: true });
    }

    await completeCustomerServiceRequest({
      id: requestRecordId,
      resultStatus: CustomerServiceChatStatusEnum.answered,
      modelId,
      hardwareVersionId,
      softwareVersionId,
      citationCount: citations.length
    });
    return writeResponse(
      CustomerServiceChatResponseSchema.parse({
        ...commonResponse,
        status: CustomerServiceChatStatusEnum.answered,
        answer: saved.answer,
        resolvedProduct: await formatResolvedProduct({
          modelId,
          hardwareVersionId,
          softwareVersionId
        }),
        candidates: [],
        citations
      })
    );
  } catch (error) {
    clearCustomerServiceRequestContext(req);
    let requestFailureError: unknown;
    try {
      await failCustomerServiceRequest({ id: requestRecordId, error });
    } catch (failureError) {
      requestFailureError = failureError;
    }
    const responseError = requestFailureError ?? error;
    if (streamContext) {
      const sseError = getSseErrorResponse(responseError);
      streamContext.write({ event: sseError.event, data: sseError.data });
      streamContext.cleanup();
      if (!res.writableEnded && !res.destroyed) res.end();
      return;
    }
    throw responseError;
  }
}

export default NextAPI(handler);

export const config = {
  api: {
    bodyParser: { sizeLimit: '10mb' },
    responseLimit: '10mb'
  }
};
