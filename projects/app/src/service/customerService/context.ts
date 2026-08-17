import type { NextApiRequest } from 'next';
import type { AuthResponseType } from '@fastgpt/global/openapi/core/chat/completion/api';
import { ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { delAgentRuntimeStopSign } from '@fastgpt/service/core/workflow/dispatch/workflowStatus';

export type CustomerServiceRequestContext = {
  auth: AuthResponseType;
  projectId: string;
  openApiKeyId: string;
  collectionIdWhitelist: string[];
  requestId: string;
  modelId?: string;
  hardwareVersionId?: string;
  softwareVersionId?: string;
  audience: string;
  /** 允许客服 v1 请求使用服务端停止标记；普通 v1 请求不会获得该能力。 */
  customerServiceStopEnabled: boolean;
};

// WeakMap 只接受当前进程内的 req 对象，外部请求无法通过 header/body 伪造该可信上下文。
const requestContextMap = new WeakMap<NextApiRequest, CustomerServiceRequestContext>();
const internalProxyProjectMap = new WeakMap<NextApiRequest, string>();
const publicProxyProjectMap = new WeakMap<NextApiRequest, string>();
const publicProxyProcessingCallbackMap = new WeakMap<NextApiRequest, () => void>();

export const setCustomerServiceRequestContext = ({
  req,
  context
}: {
  req: NextApiRequest;
  context: CustomerServiceRequestContext;
}) => requestContextMap.set(req, context);

export const getCustomerServiceRequestContext = (req: NextApiRequest) => requestContextMap.get(req);

export const clearCustomerServiceRequestContext = (req: NextApiRequest) =>
  requestContextMap.delete(req);

/**
 * 清理客服会话可能遗留的停止标记。
 *
 * 客服请求在进入通用 completions 前调用一次；之后 dispatch 会保留新写入的停止标记，
 * 从而避免 stop API 与工作流初始化之间的竞态。sourceType 固定为 app，不能由调用方传入。
 */
export const clearCustomerServiceRuntimeStop = ({
  appId,
  chatId
}: {
  appId: string;
  chatId: string;
}) =>
  delAgentRuntimeStopSign({
    sourceType: ChatSourceTypeEnum.app,
    sourceId: appId,
    chatId
  });

/** 标记已完成登录和 App 权限校验的站内代理请求；该状态不能由 HTTP 参数伪造。 */
export const setCustomerServiceInternalProxyProject = ({
  req,
  projectId
}: {
  req: NextApiRequest;
  projectId: string;
}) => internalProxyProjectMap.set(req, projectId);

export const getCustomerServiceInternalProxyProject = (req: NextApiRequest) =>
  internalProxyProjectMap.get(req);

export const clearCustomerServiceInternalProxyProject = (req: NextApiRequest) =>
  internalProxyProjectMap.delete(req);

/** 标记已按公开编码解析的同源客户代理；HTTP 参数无法伪造该进程内状态。 */
export const setCustomerServicePublicProxyProject = ({
  req,
  projectId,
  onProcessing
}: {
  req: NextApiRequest;
  projectId: string;
  onProcessing?: () => void;
}) => {
  publicProxyProjectMap.set(req, projectId);
  if (onProcessing) publicProxyProcessingCallbackMap.set(req, onProcessing);
};

export const getCustomerServicePublicProxyProject = (req: NextApiRequest) =>
  publicProxyProjectMap.get(req);

/** 在公开代理通过限流和幂等占位后启动外层安全 SSE，避免错误 JSON 被写入已建立的流。 */
export const getCustomerServicePublicProxyProcessingCallback = (req: NextApiRequest) =>
  publicProxyProcessingCallbackMap.get(req);

export const clearCustomerServicePublicProxyProject = (req: NextApiRequest) => {
  publicProxyProcessingCallbackMap.delete(req);
  publicProxyProjectMap.delete(req);
};
