import type {
  ChatMessage,
  CustomerServiceFeedbackBody,
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse
} from '../types';

export const SSE_INACTIVITY_TIMEOUT_MS = 35_000;
export const SSE_TOTAL_TIMEOUT_MS = 120_000;
export const STOP_REQUEST_TIMEOUT_MS = 3_000;

/** 拼接 API 完整请求地址 */
export const resolveApiUrl = (path: string, apiHost?: string): string => {
  if (!apiHost) return path;
  const cleanHost = apiHost.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanHost}${cleanPath}`;
};

/** 生成或获取项目会话 ID */
export const getSessionId = (projectKey: string): string => {
  if (typeof window === 'undefined') return 'session-ssr';
  const key = `fastgpt-cs-session:${projectKey}`;
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;
  const value = window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  window.localStorage.setItem(key, value);
  return value;
};

/** 清除项目会话 ID */
export const clearSessionId = (projectKey: string): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`fastgpt-cs-session:${projectKey}`);
};

/** 获取存储的消息记录 */
export const getStoredMessages = (projectKey: string): ChatMessage[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(`fastgpt-cs-messages:${projectKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ChatMessage =>
        !!item &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string'
    );
  } catch {
    return [];
  }
};

/** 存储消息记录 */
export const setStoredMessages = (projectKey: string, messages: ChatMessage[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`fastgpt-cs-messages:${projectKey}`, JSON.stringify(messages));
  } catch {
    // 忽略 sessionStorage 写入失败（如隐私模式或超配额）
  }
};

/** 清空当前项目会话持久化数据 */
export const clearConversationStorage = (projectKey: string): void => {
  clearSessionId(projectKey);
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(`fastgpt-cs-messages:${projectKey}`);
  }
};

/**
 * 获取公开客服项目元信息与产品目录树
 */
export const fetchPublicBootstrap = async ({
  publicId,
  apiHost
}: {
  publicId: string;
  apiHost?: string;
}): Promise<CustomerServicePublicBootstrapResponse> => {
  const url = resolveApiUrl(
    `/api/customer-service/public/bootstrap?publicId=${encodeURIComponent(publicId)}`,
    apiHost
  );
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
    throw new Error(payload.message || '加载客服配置失败');
  }

  return (payload.data || payload) as CustomerServicePublicBootstrapResponse;
};

/**
 * 发送公开聊天消息并解析 SSE 流式事件
 */
export const sendPublicChatMessageStream = async ({
  publicId,
  requestId,
  sessionId,
  message,
  productModel,
  hardwareVersion,
  softwareVersion,
  apiHost,
  signal,
  onStatus,
  onAnswerDelta,
  onTimeout
}: {
  publicId: string;
  requestId: string;
  sessionId: string;
  message: string;
  productModel?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  apiHost?: string;
  signal?: AbortSignal;
  onStatus?: (status: string) => void;
  onAnswerDelta?: (delta: string) => void;
  onTimeout?: () => void;
}): Promise<CustomerServicePublicChatResponse> => {
  const url = resolveApiUrl('/api/customer-service/public/chat', apiHost);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream, application/json'
    },
    signal,
    body: JSON.stringify({
      publicId,
      requestId,
      sessionId,
      message,
      stream: true,
      productModel: productModel || undefined,
      hardwareVersion: hardwareVersion || undefined,
      softwareVersion: softwareVersion || undefined
    })
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.message || `请求失败 (${response.status})`);
  }

  if (!response.body) {
    throw new Error('服务端未返回响应流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalResponse: CustomerServicePublicChatResponse | undefined;

  /** 读取下一块，带有空闲超时机制 */
  const readNextChunk = async (): Promise<ReadableStreamReadResult<Uint8Array>> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            onTimeout?.();
            reject(new Error('响应读取超时，请重试'));
          }, SSE_INACTIVITY_TIMEOUT_MS);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  /** 处理单个 SSE 数据块 */
  const handleEventBlock = (block: string) => {
    const lines = block.split('\n');
    let eventName = '';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    const rawData = dataLines.join('\n');
    if (!rawData || rawData === '[DONE]') return;

    try {
      const parsed = JSON.parse(rawData);

      // 处理心跳与处理状态事件
      if (eventName === 'customerServiceStatus' || parsed.status === 'processing') {
        onStatus?.(parsed.status || 'processing');
      }

      // 处理流式文本增量
      if (eventName === 'answer') {
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          onAnswerDelta?.(delta);
        }
      }

      // 处理客服最终全量业务响应
      if (eventName === 'customerService') {
        finalResponse = parsed as CustomerServicePublicChatResponse;
      }

      // 处理服务端抛出的错误事件
      if (eventName === 'error') {
        throw new Error(typeof parsed.message === 'string' ? parsed.message : '客服回答生成异常');
      }
    } catch (err) {
      if (eventName === 'error') throw err;
      // 忽略心跳解析微小异常
    }
  };

  while (true) {
    const { done, value } = await readNextChunk();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';

    for (const block of blocks) {
      if (block.trim()) {
        handleEventBlock(block);
      }
    }

    if (done) break;
  }

  if (buffer.trim()) {
    handleEventBlock(buffer);
  }

  if (!finalResponse) {
    throw new Error('未收到完整的客服业务响应');
  }

  return finalResponse;
};

/**
 * 停止当前客服回答生成
 */
export const stopPublicChatMessage = async ({
  publicId,
  requestId,
  sessionId,
  apiHost
}: {
  publicId: string;
  requestId: string;
  sessionId: string;
  apiHost?: string;
}): Promise<void> => {
  const url = resolveApiUrl('/api/customer-service/public/stop', apiHost);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STOP_REQUEST_TIMEOUT_MS);

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        publicId,
        requestId,
        sessionId
      })
    });
  } catch {
    // 停止操作尽力而为，不阻塞客户端交互
  } finally {
    clearTimeout(timer);
  }
};

/**
 * 提交客服回答评价反馈（点赞、点踩、问题未解决）
 */
export const submitPublicFeedback = async ({
  publicId,
  sessionId,
  messageId,
  type,
  content = '',
  apiHost
}: {
  publicId: string;
  sessionId: string;
  messageId: string;
  type: CustomerServiceFeedbackBody['type'];
  content?: string;
  apiHost?: string;
}): Promise<void> => {
  const url = resolveApiUrl('/api/customer-service/public/feedback', apiHost);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      publicId,
      sessionId,
      messageId,
      type,
      content
    })
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.message || '提交反馈失败');
  }
};
