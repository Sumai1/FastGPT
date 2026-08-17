import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Select,
  Spinner,
  Text,
  Textarea,
  useToast,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import Markdown from '@/components/Markdown';
import type {
  CustomerServiceChatResponse,
  CustomerServiceFeedbackBody,
  CustomerServiceInternalBootstrapResponse,
  CustomerServiceProductCatalogResponse,
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicChatResponse
} from '@fastgpt/global/openapi/customerService/api';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import MyIcon from '@fastgpt/web/components/common/Icon';

const SSE_INACTIVITY_TIMEOUT_MS = 35_000;
/**
 * 心跳只能证明连接仍然存活，不能避免模型或上游代理无限等待。总时限覆盖握手和整段
 * SSE 读取，给正常的慢模型留出余量，同时避免客户页像普通聊天一样等待数分钟。
 */
const SSE_TOTAL_TIMEOUT_MS = 120_000;
const WAITING_TIME_TICK_MS = 1_000;
const STOP_REQUEST_TIMEOUT_MS = 3_000;

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  /** 同一轮用户问题和助手占位共用的客服幂等键。 */
  requestId?: string;
  /** 与 requestId 配套的外部会话标识，用于停止请求和刷新后的重试。 */
  sessionId?: string;
  processing?: boolean;
  canRetry?: boolean;
  stopPending?: boolean;
  waitingSeconds?: number;
  response?: CustomerServicePublicChatResponse;
  feedback?: CustomerServiceFeedbackBody['type'];
};

type ActiveRequest = {
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

type CustomerServiceChatAccess =
  | { type: 'internal'; initialProjectId?: string }
  | { type: 'public'; publicId: string };

type ViewBootstrap = CustomerServiceInternalBootstrapResponse;
type RawChatResponse = CustomerServiceChatResponse | CustomerServicePublicChatResponse;

/**
 * 客户端只保留页面真正使用的公开响应投影。站内客服仍可调用内部 API，但不会把内部资源 ID
 * 写进页面状态或 sessionStorage，公开端和站内端因此共用同一套引用渲染逻辑。
 */
const normalizeChatResponse = (response: RawChatResponse): CustomerServicePublicChatResponse => ({
  requestId: response.requestId,
  sessionId: response.sessionId,
  messageId: response.messageId,
  status: response.status,
  answer: response.answer,
  audience: CustomerServiceAudienceEnum.public,
  resolvedProduct: {
    modelCode: response.resolvedProduct.modelCode,
    hardwareVersionCode: response.resolvedProduct.hardwareVersionCode,
    softwareVersionCode: response.resolvedProduct.softwareVersionCode
  },
  candidates: response.candidates.map((candidate) => ({
    modelCode: candidate.modelCode,
    name: candidate.name,
    description: candidate.description
  })),
  citations: response.citations.map((citation) => {
    if ('title' in citation) {
      return {
        title: citation.title,
        summary: citation.summary,
        score: citation.score
      };
    }
    return {
      title: citation.sourceName.trim() || citation.q.trim(),
      summary: citation.a.trim() || citation.q.trim(),
      score: citation.score
    };
  }),
  ...(response.safetyWarning !== undefined && { safetyWarning: response.safetyWarning }),
  ...(response.humanContact !== undefined && { humanContact: response.humanContact })
});

const getSessionId = (projectKey: string) => {
  const key = `customer-service-session:${projectKey}`;
  const saved = window.localStorage.getItem(key);
  if (saved) return saved;
  const value = window.crypto.randomUUID();
  window.localStorage.setItem(key, value);
  return value;
};

const getMessageStorageKey = (projectKey: string) => `customer-service-messages:${projectKey}`;

/** 恢复当前浏览器标签页内的展示记录；异常或旧格式数据直接忽略，不影响服务端会话。 */
const getStoredMessages = (projectKey: string): ChatMessage[] => {
  try {
    const value = JSON.parse(
      window.sessionStorage.getItem(getMessageStorageKey(projectKey)) ?? '[]'
    );
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (item): item is ChatMessage =>
          !!item &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.content === 'string'
      )
      .map((item) => ({
        ...item,
        ...(item.response && { response: normalizeChatResponse(item.response) })
      }));
  } catch {
    return [];
  }
};

/** 将公开单项目响应转换为聊天组件内部视图，不引入第二套页面状态。 */
const normalizePublicBootstrap = (data: CustomerServicePublicBootstrapResponse): ViewBootstrap => ({
  projects: [
    {
      id: data.project.publicId,
      name: data.project.name,
      welcomeText: data.project.welcomeText,
      recommendedQuestions: data.project.recommendedQuestions,
      humanContact: data.project.humanContact
    }
  ],
  selectedProjectId: data.project.publicId,
  // 公开目录只含业务编码。这里生成的 key 仅用于当前 React 组件的选择状态，不会回传或持久化为
  // FastGPT 资源 ID；聊天请求始终使用 modelCode/versionCode。
  catalog: {
    categories: data.catalog.categories.map((item) => ({
      id: item.code,
      ...item
    })),
    series: data.catalog.series.map((item) => ({
      id: `${item.categoryCode}:${item.code}`,
      categoryId: item.categoryCode,
      code: item.code,
      name: item.name,
      aliases: item.aliases,
      description: item.description,
      status: item.status,
      sortOrder: item.sortOrder
    })),
    models: data.catalog.models.map((item) => ({
      id: item.modelCode,
      seriesId: `${item.categoryCode}:${item.seriesCode}`,
      modelCode: item.modelCode,
      name: item.name,
      aliases: item.aliases,
      description: item.description,
      status: item.status,
      discontinuedAt: item.discontinuedAt,
      datasetIds: [],
      sortOrder: item.sortOrder
    })),
    versions: data.catalog.versions.map((item) => ({
      id: `${item.modelCode}:${item.type}:${item.versionCode}`,
      modelId: item.modelCode,
      type: item.type,
      versionCode: item.versionCode,
      name: item.name,
      aliases: item.aliases,
      description: item.description,
      status: item.status,
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo
    }))
  } satisfies CustomerServiceProductCatalogResponse
});

const CustomerServiceChat = ({ access }: { access: CustomerServiceChatAccess }) => {
  const { t } = useTranslation('customer_service');
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);
  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined);
  const requestTokenRef = useRef(0);
  const [bootstrap, setBootstrap] = useState<ViewBootstrap>();
  const [projectKey, setProjectKey] = useState('');
  const [seriesId, setSeriesId] = useState('');
  const [modelId, setModelId] = useState('');
  const [hardwareVersionId, setHardwareVersionId] = useState('');
  const [softwareVersionId, setSoftwareVersionId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const isPublic = access.type === 'public';
  const publicId = access.type === 'public' ? access.publicId : undefined;
  const initialProjectId = access.type === 'internal' ? access.initialProjectId : undefined;

  const fetchBootstrap = useCallback(
    async (nextProjectId?: string) => {
      const url = (() => {
        if (isPublic) {
          return `/api/customer-service/public/bootstrap?publicId=${encodeURIComponent(
            publicId ?? ''
          )}`;
        }
        return `/api/customer-service/internal/bootstrap${
          nextProjectId ? `?projectId=${encodeURIComponent(nextProjectId)}` : ''
        }`;
      })();
      const response = await fetch(url);
      const payload = await response.json();
      if (!response.ok || payload.code !== 200) {
        throw new Error(payload.message ?? t('load_failed'));
      }
      return isPublic
        ? normalizePublicBootstrap(payload.data as CustomerServicePublicBootstrapResponse)
        : (payload.data as CustomerServiceInternalBootstrapResponse);
    },
    [isPublic, publicId, t]
  );

  const applyBootstrap = useCallback((data: ViewBootstrap) => {
    if (activeRequestRef.current) {
      activeRequestRef.current = undefined;
      abortControllerRef.current?.abort();
      abortControllerRef.current = undefined;
      setLoading(false);
    }
    setBootstrap(data);
    const nextProjectKey = data.selectedProjectId ?? '';
    setProjectKey(nextProjectKey);
    setSeriesId('');
    setModelId('');
    setHardwareVersionId('');
    setSoftwareVersionId('');
    setMessages(nextProjectKey ? getStoredMessages(nextProjectKey) : []);
    setLoadError('');
  }, []);

  const loadBootstrap = useCallback(
    async (nextProjectId?: string) => applyBootstrap(await fetchBootstrap(nextProjectId)),
    [applyBootstrap, fetchBootstrap]
  );

  useEffect(() => {
    let active = true;
    void fetchBootstrap(initialProjectId)
      .then((data) => {
        if (active) applyBootstrap(data);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : t('load_failed'));
      });
    return () => {
      active = false;
      activeRequestRef.current = undefined;
      abortControllerRef.current?.abort();
    };
  }, [applyBootstrap, fetchBootstrap, initialProjectId, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!projectKey) return;
    window.sessionStorage.setItem(getMessageStorageKey(projectKey), JSON.stringify(messages));
  }, [messages, projectKey]);

  const selectedProject = bootstrap?.projects.find((item) => item.id === projectKey);
  const projectModels = useMemo(() => bootstrap?.catalog.models ?? [], [bootstrap?.catalog.models]);
  const series = useMemo(
    () =>
      (bootstrap?.catalog.series ?? []).filter((item) =>
        projectModels.some((model) => model.seriesId === item.id)
      ),
    [bootstrap?.catalog.series, projectModels]
  );
  const models = seriesId
    ? projectModels.filter((item) => item.seriesId === seriesId)
    : projectModels;
  const versions = bootstrap?.catalog.versions.filter((item) => item.modelId === modelId) ?? [];
  const hardwareVersions = versions.filter(
    (item) => item.type === CustomerServiceVersionTypeEnum.hardware
  );
  const softwareVersions = versions.filter(
    (item) => item.type === CustomerServiceVersionTypeEnum.software
  );
  const selectedModel = projectModels.find((item) => item.id === modelId);
  const selectedHardwareVersion = hardwareVersions.find((item) => item.id === hardwareVersionId);
  const selectedSoftwareVersion = softwareVersions.find((item) => item.id === softwareVersionId);
  const hasStopPending = messages.some((item) => item.stopPending);
  const canSend = !!projectKey && !!input.trim() && !loading && !hasStopPending;

  const startNewConversation = useCallback(() => {
    if (!projectKey) return;
    activeRequestRef.current = undefined;
    abortControllerRef.current?.abort();
    abortControllerRef.current = undefined;
    window.localStorage.removeItem(`customer-service-session:${projectKey}`);
    window.sessionStorage.removeItem(getMessageStorageKey(projectKey));
    setMessages([]);
    setLoading(false);
  }, [projectKey]);

  /** 产品上下文变化前结束旧会话，避免同一历史上下文混入另一个设备型号。 */
  const confirmProductChange = () => {
    if (messages.length === 0) return true;
    if (!window.confirm(t('switch_product_confirm'))) return false;
    startNewConversation();
    return true;
  };

  /**
   * 通过同一客服停止代理通知服务端终止工作流。调用方随后会 abort 浏览器读取；网络错误
   * 只记录为已忽略，不能让超时或用户停止动作继续卡住客户页。
   */
  const requestStop = useCallback(
    (request: ActiveRequest, stoppedByUser = false) => {
      if (activeRequestRef.current?.token !== request.token) return Promise.resolve();
      if (stoppedByUser) request.stoppedByUser = true;
      if (request.stopPromise) return request.stopPromise;
      request.stopRequested = true;
      const url = isPublic
        ? '/api/customer-service/public/stop'
        : '/api/customer-service/internal/stop';
      const body = isPublic
        ? {
            publicId: request.projectKey,
            requestId: request.requestId,
            sessionId: request.sessionId
          }
        : {
            projectId: request.projectKey,
            requestId: request.requestId,
            sessionId: request.sessionId
          };
      setMessages((current) =>
        current.map((item, index) =>
          index === request.assistantIndex &&
          item.role === 'assistant' &&
          item.requestId === request.requestId
            ? { ...item, stopPending: true, canRetry: false }
            : item
        )
      );

      const stopController = new AbortController();
      const stopPromise = (async () => {
        const timeout = setTimeout(() => stopController.abort(), STOP_REQUEST_TIMEOUT_MS);
        try {
          await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: stopController.signal,
            body: JSON.stringify(body)
          });
        } catch {
          // 停止是尽力而为的通知；浏览器 abort 和网络错误都不能阻塞当前页面。
        } finally {
          clearTimeout(timeout);
          setMessages((current) =>
            current.map((item, index) =>
              index === request.assistantIndex &&
              item.role === 'assistant' &&
              item.requestId === request.requestId
                ? {
                    ...item,
                    stopPending: false,
                    ...(item.response ? {} : { canRetry: true })
                  }
                : item
            )
          );
        }
      })();
      request.stopPromise = stopPromise;
      return stopPromise;
    },
    [isPublic]
  );

  const parseSseResponse = async ({
    response,
    assistantIndex,
    requestToken,
    onTimeout
  }: {
    response: Response;
    assistantIndex: number;
    requestToken: number;
    onTimeout: () => void;
  }) => {
    if (!response.body) throw new Error(t('empty_response'));
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse: CustomerServicePublicChatResponse | undefined;

    /** 迟到的旧 SSE 不能覆盖重试后的助手消息。状态更新时再次检查 token，避免竞态。 */
    const updateAssistantMessage = (update: (item: ChatMessage) => ChatMessage) => {
      setMessages((current) => {
        if (activeRequestRef.current?.token !== requestToken) return current;
        return current.map((item, index) => (index === assistantIndex ? update(item) : item));
      });
    };

    /** 心跳会持续刷新读取；只有连接长期无数据才中止，避免把慢模型误判为超时。 */
    const readNext = async () => {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => {
              onTimeout();
              reject(new Error(t('request_timeout')));
            }, SSE_INACTIVITY_TIMEOUT_MS);
          })
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };

    const processBlock = (block: string) => {
      if (activeRequestRef.current?.token !== requestToken) return;
      const lines = block.split('\n');
      const event = lines
        .find((line) => line.startsWith('event:'))
        ?.slice(6)
        .trim();
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim())
        .join('\n');
      if (!data || data === '[DONE]') return;

      const parsed = JSON.parse(data) as {
        status?: string;
        message?: string;
        choices?: Array<{ delta?: { content?: unknown } }>;
      };
      if (event === 'customerServiceStatus' && parsed.status === 'processing') {
        updateAssistantMessage((item) => ({ ...item, processing: true }));
      }
      if (event === 'answer') {
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string') {
          updateAssistantMessage((item) => ({ ...item, content: item.content + delta }));
        }
      }
      if (event === 'customerService') {
        finalResponse = normalizeChatResponse(parsed as RawChatResponse);
      }
      if (event === 'error') {
        throw new Error(typeof parsed.message === 'string' ? parsed.message : t('send_failed'));
      }
    };

    while (true) {
      const { done, value } = await readNext();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() ?? '';
      blocks.forEach(processBlock);
      if (done) break;
    }
    if (buffer.trim()) processBlock(buffer);
    if (!finalResponse) throw new Error(t('invalid_response'));
    return finalResponse;
  };

  /**
   * 发起新问题或原位重试。重试只清空目标助手消息并复用 requestId，不再追加一组消息，
   * 这样浏览器刷新、网络重试和服务端幂等记录始终对应同一轮问题。
   */
  const sendMessage = async (preset?: string, retryAssistantIndex?: number) => {
    const isRetry = retryAssistantIndex !== undefined;
    if (!projectKey || loading || activeRequestRef.current) return;

    const retryAssistant = isRetry ? messages[retryAssistantIndex] : undefined;
    const previousMessage = isRetry ? messages[retryAssistantIndex - 1] : undefined;
    if (
      isRetry &&
      (retryAssistant?.role !== 'assistant' ||
        previousMessage?.role !== 'user' ||
        retryAssistant?.stopPending)
    ) {
      return;
    }

    const message = (isRetry ? (previousMessage?.content ?? '') : (preset ?? input)).trim();
    if (!message) return;

    const requestId = retryAssistant?.requestId ?? window.crypto.randomUUID();
    const sessionId =
      retryAssistant?.sessionId ?? previousMessage?.sessionId ?? getSessionId(projectKey);
    const assistantIndex = isRetry ? retryAssistantIndex : messages.length + 1;
    const controller = new AbortController();
    const request: ActiveRequest = {
      token: ++requestTokenRef.current,
      projectKey,
      requestId,
      sessionId,
      assistantIndex,
      controller,
      stoppedByUser: false,
      stopRequested: false
    };

    activeRequestRef.current = request;
    abortControllerRef.current = controller;
    setInput('');
    if (isRetry) {
      setMessages((current) =>
        current.map((item, index) => {
          if (index === assistantIndex) {
            return {
              ...item,
              requestId,
              sessionId,
              content: '',
              processing: true,
              waitingSeconds: 0,
              canRetry: false,
              stopPending: false,
              response: undefined,
              feedback: undefined
            };
          }
          if (index === assistantIndex - 1 && item.role === 'user') {
            return { ...item, requestId, sessionId };
          }
          return item;
        })
      );
    } else {
      setMessages((current) => [
        ...current,
        { role: 'user', content: message, requestId, sessionId },
        {
          role: 'assistant',
          content: '',
          requestId,
          sessionId,
          processing: true,
          waitingSeconds: 0
        }
      ]);
    }
    setLoading(true);

    let requestTimedOut = false;
    let requestSettled = false;
    let responseHandshakeTimeout: ReturnType<typeof setTimeout> | undefined;
    let totalTimeout: ReturnType<typeof setTimeout> | undefined;
    let waitingInterval: ReturnType<typeof setInterval> | undefined;
    const startedAt = Date.now();
    const updateWaitingTime = () => {
      if (activeRequestRef.current?.token !== request.token) return;
      const waitingSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setMessages((current) => {
        if (activeRequestRef.current?.token !== request.token) return current;
        return current.map((item, index) =>
          index === assistantIndex ? { ...item, waitingSeconds } : item
        );
      });
    };

    try {
      responseHandshakeTimeout = setTimeout(() => {
        if (requestSettled || activeRequestRef.current?.token !== request.token) return;
        requestTimedOut = true;
        requestStop(request);
        controller.abort();
      }, SSE_INACTIVITY_TIMEOUT_MS);
      totalTimeout = setTimeout(() => {
        if (requestSettled || activeRequestRef.current?.token !== request.token) return;
        requestTimedOut = true;
        requestStop(request);
        controller.abort();
      }, SSE_TOTAL_TIMEOUT_MS);
      waitingInterval = setInterval(updateWaitingTime, WAITING_TIME_TICK_MS);

      const response = await fetch(
        isPublic ? '/api/customer-service/public/chat' : '/api/customer-service/internal/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            ...(isPublic ? { publicId: projectKey } : { projectId: projectKey }),
            requestId,
            sessionId,
            message,
            stream: true,
            productModel: selectedModel?.modelCode,
            hardwareVersion: selectedHardwareVersion?.versionCode,
            softwareVersion: selectedSoftwareVersion?.versionCode
          })
        }
      );
      if (responseHandshakeTimeout) clearTimeout(responseHandshakeTimeout);
      responseHandshakeTimeout = undefined;
      if (!response.ok) {
        const payload = await response.json().catch(() => undefined);
        throw new Error(payload?.message ?? t('send_failed'));
      }
      const result = await parseSseResponse({
        response,
        assistantIndex,
        requestToken: request.token,
        onTimeout: () => {
          if (requestSettled || activeRequestRef.current?.token !== request.token) return;
          requestTimedOut = true;
          requestStop(request);
          controller.abort();
        }
      });
      requestSettled = true;
      setMessages((current) => {
        if (activeRequestRef.current?.token !== request.token) return current;
        return current.map((item, index) =>
          index === assistantIndex
            ? {
                ...item,
                requestId,
                sessionId: result.sessionId,
                content: result.answer,
                processing: false,
                waitingSeconds: undefined,
                canRetry: false,
                stopPending: false,
                response: result
              }
            : item
        );
      });
    } catch (error) {
      if (activeRequestRef.current?.token !== request.token) return;
      const errorMessage = (() => {
        if (request.stoppedByUser) return t('generation_stopped');
        if (requestTimedOut) return t('request_timeout');
        return error instanceof Error ? error.message : t('send_failed');
      })();
      const setErrorMessage = ({
        canRetry,
        stopPending
      }: {
        canRetry: boolean;
        stopPending: boolean;
      }) =>
        setMessages((current) => {
          if (activeRequestRef.current?.token !== request.token) return current;
          return current.map((item, index) =>
            index === assistantIndex
              ? {
                  ...item,
                  requestId,
                  sessionId,
                  content: errorMessage,
                  processing: false,
                  waitingSeconds: undefined,
                  canRetry,
                  stopPending
                }
              : item
          );
        });
      const waitForStop = request.stopRequested && (request.stoppedByUser || requestTimedOut);
      if (waitForStop) {
        setErrorMessage({ canRetry: true, stopPending: true });
        // 读取已结束即可恢复输入；重试按钮继续保持 pending，直到服务端停止通知 settle。
        setLoading(false);
        await request.stopPromise;
        if (activeRequestRef.current?.token !== request.token) return;
      }
      setErrorMessage({ canRetry: true, stopPending: false });
      if (!request.stoppedByUser) toast({ status: 'error', title: errorMessage });
    } finally {
      requestSettled = true;
      if (responseHandshakeTimeout) clearTimeout(responseHandshakeTimeout);
      if (totalTimeout) clearTimeout(totalTimeout);
      if (waitingInterval) clearInterval(waitingInterval);
      if (activeRequestRef.current?.token === request.token) {
        activeRequestRef.current = undefined;
        if (abortControllerRef.current === controller) abortControllerRef.current = undefined;
        setLoading(false);
      }
    }
  };

  /** 先向客服停止接口提交同一幂等键，再中止浏览器读取；停止接口失败不阻塞客户页。 */
  const stopGeneration = useCallback(() => {
    const request = activeRequestRef.current;
    if (!request) return;
    requestStop(request, true);
    request.controller.abort();
  }, [requestStop]);

  const submitFeedback = async ({
    response,
    type,
    messageIndex
  }: {
    response: CustomerServicePublicChatResponse;
    type: CustomerServiceFeedbackBody['type'];
    messageIndex: number;
  }) => {
    const result = await fetch(
      isPublic
        ? '/api/customer-service/public/feedback'
        : '/api/customer-service/internal/feedback',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isPublic ? { publicId: projectKey } : { projectId: projectKey }),
          sessionId: response.sessionId,
          messageId: response.messageId,
          type
        })
      }
    );
    if (!result.ok) throw new Error(t('feedback_failed'));
    setMessages((current) =>
      current.map((item, index) => (index === messageIndex ? { ...item, feedback: type } : item))
    );
    toast({ status: 'success', title: t('feedback_success') });
  };

  if (loadError) {
    return (
      <Flex minH="100dvh" align="center" justify="center" direction="column" gap={4} p={6}>
        <Heading size="md">{t('customer_service_unavailable')}</Heading>
        <Text color="myGray.600" textAlign="center">
          {loadError}
        </Text>
        <Button onClick={() => void loadBootstrap()}>{t('retry')}</Button>
      </Flex>
    );
  }

  if (!bootstrap) {
    return (
      <Flex minH={isPublic ? '100dvh' : '100%'} align="center" justify="center">
        <Spinner />
      </Flex>
    );
  }

  if (!selectedProject) {
    return (
      <Flex minH={isPublic ? '100dvh' : '100%'} align="center" justify="center" direction="column">
        <Heading size="md">{t('no_project_title')}</Heading>
        <Text mt={2} color="myGray.600">
          {t('no_project_description')}
        </Text>
      </Flex>
    );
  }

  const contact = selectedProject.humanContact;
  const contactButtons = (
    <Flex gap={2} wrap="wrap">
      {contact.phone && (
        <Button as="a" href={`tel:${contact.phone}`} size="sm" colorScheme="orange">
          {contact.phone}
        </Button>
      )}
      {contact.url && (
        <Button as="a" href={contact.url} target="_blank" size="sm" variant="whiteBase">
          {t('contact_human')}
        </Button>
      )}
    </Flex>
  );

  return (
    <Flex h={isPublic ? '100dvh' : '100%'} minH={0} bg="myGray.50" direction={['column', 'row']}>
      <Box
        w={['100%', '300px']}
        flexShrink={0}
        p={[4, 5]}
        bg="white"
        borderRightWidth={[0, '1px']}
        borderBottomWidth={['1px', 0]}
        overflowY="auto"
        maxH={['43dvh', 'none']}
      >
        <Flex justify="space-between" align="start" gap={3} mb={5}>
          <Flex align="center" gap={3} minW={0}>
            <Image src="/icon/customer-service-logo.svg" alt="" boxSize="42px" flexShrink={0} />
            <Box minW={0}>
              <Heading size="md" wordBreak="break-word">
                {selectedProject.name}
              </Heading>
              <Badge mt={2} colorScheme="green">
                {t('service_online')}
              </Badge>
            </Box>
          </Flex>
          <Button size="xs" variant="whiteBase" onClick={startNewConversation}>
            {t('new_conversation')}
          </Button>
        </Flex>

        {!isPublic && (
          <FormControl mb={4}>
            <FormLabel>{t('project')}</FormLabel>
            <Select value={projectKey} onChange={(event) => void loadBootstrap(event.target.value)}>
              {bootstrap.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl mb={4}>
          <FormLabel>{t('product_series')}</FormLabel>
          <Select
            value={seriesId}
            placeholder={t('select_series')}
            onChange={(event) => {
              if (!confirmProductChange()) return;
              setSeriesId(event.target.value);
              setModelId('');
              setHardwareVersionId('');
              setSoftwareVersionId('');
            }}
          >
            {series.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl mb={4}>
          <FormLabel>{t('model')}</FormLabel>
          <Select
            value={modelId}
            placeholder={t('select_model')}
            onChange={(event) => {
              if (!confirmProductChange()) return;
              setModelId(event.target.value);
              const nextModel = projectModels.find((item) => item.id === event.target.value);
              if (nextModel) setSeriesId(nextModel.seriesId);
              setHardwareVersionId('');
              setSoftwareVersionId('');
            }}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.modelCode})
              </option>
            ))}
          </Select>
        </FormControl>
        {hardwareVersions.length > 0 && (
          <FormControl mb={4}>
            <FormLabel>{t('hardware_version')}</FormLabel>
            <Select
              value={hardwareVersionId}
              placeholder={t('optional')}
              onChange={(event) => {
                if (!confirmProductChange()) return;
                setHardwareVersionId(event.target.value);
              }}
            >
              {hardwareVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
            </Select>
          </FormControl>
        )}
        {softwareVersions.length > 0 && (
          <FormControl mb={4}>
            <FormLabel>{t('software_version')}</FormLabel>
            <Select
              value={softwareVersionId}
              placeholder={t('optional')}
              onChange={(event) => {
                if (!confirmProductChange()) return;
                setSoftwareVersionId(event.target.value);
              }}
            >
              {softwareVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
            </Select>
          </FormControl>
        )}

        <Box p={3} borderRadius="lg" bg="orange.50" fontSize="sm">
          <Text fontWeight="600">{contact.name}</Text>
          {contact.workTime && (
            <Text mt={1} color="myGray.600">
              {t('service_hours')}：{contact.workTime}
            </Text>
          )}
          <Box mt={3}>{contactButtons}</Box>
        </Box>
      </Box>

      <Flex flex="1" minW={0} minH={0} direction="column">
        <Flex
          px={[4, 6]}
          py={3}
          bg="white"
          borderBottomWidth="1px"
          justify="space-between"
          align="center"
          gap={3}
        >
          <Text fontWeight="600">{selectedProject.name}</Text>
          <Box display={['none', 'block']}>{contactButtons}</Box>
        </Flex>
        <Box flex="1" overflowY="auto" p={[3, 6]}>
          {messages.length === 0 && (
            <Box maxW="760px" mx="auto" pt={[4, 12]}>
              <Heading size="md" mb={2}>
                {selectedProject.welcomeText || t('welcome')}
              </Heading>
              <Text color="myGray.600" mb={5}>
                {t('selection_tip')}
              </Text>
              <Wrap>
                {selectedProject.recommendedQuestions.map((question) => (
                  <WrapItem key={question}>
                    <Button
                      size="sm"
                      variant="whiteBase"
                      onClick={() => void sendMessage(question)}
                    >
                      {question}
                    </Button>
                  </WrapItem>
                ))}
              </Wrap>
            </Box>
          )}
          <Flex
            maxW="860px"
            mx="auto"
            direction="column"
            gap={4}
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.map((message, index) => (
              <Box
                key={`${message.role}-${index}`}
                alignSelf={message.role === 'user' ? 'flex-end' : 'stretch'}
                maxW={message.role === 'user' ? '80%' : '100%'}
                p={4}
                borderRadius="lg"
                bg={message.role === 'user' ? 'blue.500' : 'white'}
                color={message.role === 'user' ? 'white' : 'inherit'}
                boxShadow={message.role === 'assistant' ? 'sm' : undefined}
              >
                {message.role === 'assistant' ? (
                  message.content ? (
                    <>
                      <Markdown source={message.content} />
                      {message.processing && message.waitingSeconds !== undefined && (
                        <Text mt={2} fontSize="xs" color="myGray.500">
                          {t('generating_answer')} ({message.waitingSeconds}s)
                        </Text>
                      )}
                    </>
                  ) : (
                    <Flex align="center" gap={2} color="myGray.600">
                      <Spinner size="sm" />
                      {message.processing && (
                        <Text fontSize="sm">
                          {t('generating_answer')}
                          {message.waitingSeconds !== undefined && ` (${message.waitingSeconds}s)`}
                        </Text>
                      )}
                    </Flex>
                  )
                ) : (
                  <Text whiteSpace="pre-wrap">{message.content}</Text>
                )}
                {message.response?.safetyWarning && (
                  <Box mt={3} p={3} bg="red.50" color="red.700" borderRadius="md">
                    {message.response.safetyWarning}
                  </Box>
                )}
                {message.response?.citations.length ? (
                  <Accordion mt={4} allowMultiple>
                    <AccordionItem border="0" borderTopWidth="1px">
                      <AccordionButton px={0}>
                        <Box flex="1" textAlign="left" fontSize="sm" fontWeight="600">
                          {t('citations')}（{message.response.citations.length}）
                        </Box>
                        <AccordionIcon />
                      </AccordionButton>
                      <AccordionPanel px={0} pb={0}>
                        <Flex direction="column" gap={2}>
                          {message.response.citations.map((citation, citationIndex) => (
                            <Box
                              key={`${citation.title}-${citationIndex}`}
                              p={3}
                              bg="blue.50"
                              borderRadius="md"
                            >
                              <Text fontSize="sm" fontWeight="600">
                                {citation.title}
                              </Text>
                              <Text mt={1} fontSize="sm" color="myGray.600" noOfLines={4}>
                                {citation.summary}
                              </Text>
                            </Box>
                          ))}
                        </Flex>
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                ) : null}
                {message.response?.humanContact && (
                  <Box mt={4} p={3} bg="orange.50" borderRadius="md">
                    <Text fontWeight="600">{t('human_required')}</Text>
                    <Text mt={1}>{message.response.humanContact.name}</Text>
                    <Box mt={2}>{contactButtons}</Box>
                  </Box>
                )}
                {message.response?.status === 'answered' && (
                  <Flex mt={3} gap={2} justify="flex-end" wrap="wrap">
                    {(
                      [
                        ['good', t('helpful')],
                        ['bad', t('unhelpful')],
                        ['unresolved', t('unresolved')]
                      ] as const
                    ).map(([type, label]) => (
                      <Button
                        key={type}
                        size="xs"
                        variant={message.feedback === type ? 'solid' : 'ghost'}
                        colorScheme={type === 'unresolved' ? 'orange' : 'blue'}
                        onClick={() =>
                          void submitFeedback({
                            response: message.response!,
                            type,
                            messageIndex: index
                          }).catch((error) => toast({ status: 'error', title: error.message }))
                        }
                      >
                        {label}
                      </Button>
                    ))}
                  </Flex>
                )}
                {message.role === 'assistant' && message.canRetry && !loading && (
                  <Flex mt={3} justify="flex-end">
                    <Button
                      size="xs"
                      variant="ghost"
                      leftIcon={<MyIcon name="common/refresh" w="14px" />}
                      isDisabled={message.stopPending}
                      isLoading={message.stopPending}
                      onClick={() => void sendMessage(undefined, index)}
                    >
                      {t('retry_answer')}
                    </Button>
                  </Flex>
                )}
              </Box>
            ))}
            <div ref={bottomRef} />
          </Flex>
        </Box>
        <Flex p={[3, 5]} bg="white" borderTopWidth="1px" gap={3} align="flex-end">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('input_placeholder')}
            aria-label={t('input_placeholder')}
            resize="none"
            maxLength={20000}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSend) void sendMessage();
              }
            }}
          />
          {loading ? (
            <Button colorScheme="orange" onClick={stopGeneration}>
              {t('stop_generation')}
            </Button>
          ) : (
            <Button colorScheme="blue" isDisabled={!canSend} onClick={() => void sendMessage()}>
              {t('send')}
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default CustomerServiceChat;
