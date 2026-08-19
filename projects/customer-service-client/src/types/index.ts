import type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse,
  CustomerServicePublicCitation,
  CustomerServicePublicProductCatalogResponse,
  CustomerServiceFeedbackBody
} from '@fastgpt/global/openapi/customerService/api';

export enum CustomerServiceAudienceEnum {
  public = 'public',
  dealer = 'dealer',
  internal = 'internal'
}

export enum CustomerServiceVersionTypeEnum {
  hardware = 'hardware',
  software = 'software'
}

export type CustomerServicePublicCandidateModel = NonNullable<
  CustomerServicePublicChatResponse['candidates']
>[number];

export type CustomerServicePublicResolvedProduct =
  CustomerServicePublicChatResponse['resolvedProduct'];

export type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse,
  CustomerServicePublicCitation,
  CustomerServicePublicProductCatalogResponse,
  CustomerServiceFeedbackBody
};

export type CustomerServiceCitation = CustomerServicePublicCitation;

/** 会话消息格式 */
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  requestId?: string;
  sessionId?: string;
  processing?: boolean;
  canRetry?: boolean;
  stopPending?: boolean;
  waitingSeconds?: number;
  response?: CustomerServicePublicChatResponse;
  feedback?: CustomerServiceFeedbackBody['type'];
  /** 交互式排查步骤状态（针对助手消息中检测到的步骤） */
  troubleshootSteps?: TroubleshootStep[];
  troubleshootCompleted?: boolean;
};

/** 活跃请求追踪对象 */
export type ActiveRequest = {
  token: number;
  projectKey: string;
  requestId: string;
  sessionId: string;
  assistantIndex: number;
  controller: AbortController;
  stoppedByUser: boolean;
  stopRequested: boolean;
  stopPromise?: Promise<void>;
};

/** 客户端接入凭据 */
export type CustomerServiceAccess = {
  type: 'public';
  publicId: string;
  apiHost?: string;
};

/** 当前选中的产品型号与软硬件版本 */
export type ProductSelection = {
  categoryCode?: string;
  seriesCode: string;
  modelCode: string;
  hardwareVersionCode: string;
  softwareVersionCode: string;
};

/** 单个排查步骤 */
export type TroubleshootStep = {
  id: string;
  index: number;
  title: string;
  detail?: string;
  completed?: boolean;
  isDanger?: boolean;
};

/** 转人工工单摘要数据 */
export type HumanHandoffData = {
  projectName?: string;
  productModel?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  faultSummary?: string;
  troubleshootSteps?: { title: string; completed: boolean }[];
  audience?: CustomerServiceAudienceEnum;
  sessionId?: string;
  timestamp?: number;
  humanContact?: CustomerServicePublicBootstrapResponse['project']['humanContact'];
};

/** 会话历史摘要 */
export type SessionSummary = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  preview: string;
  selection?: ProductSelection;
};

/** 场景引导项 */
export type DiagnosticItem = {
  id: string;
  category: 'photo' | 'vending' | 'general';
  categoryLabel: string;
  title: string;
  desc: string;
  prompt: string;
  iconName: string;
  badge?: string;
};

/** 错误码项 */
export type ErrorCodeItem = {
  code: string;
  name: string;
  category: 'photo' | 'vending' | 'system';
  prompt: string;
};

/** 反馈弹窗状态 */
export type FeedbackModalState = {
  isOpen: boolean;
  messageIndex: number;
  response?: CustomerServicePublicChatResponse;
  defaultType?: CustomerServiceFeedbackBody['type'];
};

/** 嵌入式浮窗配置项 */
export type WidgetOptions = {
  project?: string;
  publicId?: string;
  apiHost?: string;
  position?: 'bottom-right' | 'bottom-left';
  themeColor?: string;
  title?: string;
  defaultOpen?: boolean;
};
