import type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse,
  CustomerServicePublicCitation,
  CustomerServicePublicProductCatalogResponse,
  CustomerServiceFeedbackBody
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceVersionTypeEnum } from '@fastgpt/global/core/customerService/constants';

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

export { CustomerServiceVersionTypeEnum };

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
  seriesCode: string;
  modelCode: string;
  hardwareVersionCode: string;
  softwareVersionCode: string;
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
