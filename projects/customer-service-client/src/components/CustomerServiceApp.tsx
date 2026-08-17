import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchPublicBootstrap,
  sendPublicChatMessageStream,
  stopPublicChatMessage,
  submitPublicFeedback,
  getSessionId,
  getStoredMessages,
  setStoredMessages,
  clearConversationStorage
} from '../services/api';
import type {
  ActiveRequest,
  ChatMessage,
  CustomerServiceAccess,
  CustomerServiceFeedbackBody,
  CustomerServicePublicBootstrapResponse,
  FeedbackModalState,
  ProductSelection
} from '../types';
import { Header } from './Header';
import { ProductSelector } from './ProductSelector';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FeedbackModal } from './FeedbackModal';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface CustomerServiceAppProps {
  access: CustomerServiceAccess;
  isWidget?: boolean;
  onCloseWidget?: () => void;
}

export const CustomerServiceApp: React.FC<CustomerServiceAppProps> = ({
  access,
  isWidget,
  onCloseWidget
}) => {
  const { publicId, apiHost } = access;

  const [bootstrap, setBootstrap] = useState<CustomerServicePublicBootstrapResponse>();
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [selection, setSelection] = useState<ProductSelection>({
    seriesCode: '',
    modelCode: '',
    hardwareVersionCode: '',
    softwareVersionCode: ''
  });

  const [feedbackModal, setFeedbackModal] = useState<FeedbackModalState>({
    isOpen: false,
    messageIndex: -1
  });

  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined);
  const requestTokenRef = useRef<number>(0);

  // 初始化加载 Bootstrap 配置
  useEffect(() => {
    let isMounted = true;
    if (!publicId) return;

    fetchPublicBootstrap({ publicId, apiHost })
      .then((data) => {
        if (!isMounted) return;
        setBootstrap(data);
        const stored = getStoredMessages(publicId);
        setMessages(stored);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setLoadError(err?.message || '加载客服配置失败');
      });

    return () => {
      isMounted = false;
    };
  }, [publicId, apiHost]);

  const handleRetryBootstrap = useCallback(() => {
    if (!publicId) return;
    setLoadError('');
    fetchPublicBootstrap({ publicId, apiHost })
      .then((data) => {
        setBootstrap(data);
        const stored = getStoredMessages(publicId);
        setMessages(stored);
      })
      .catch((err: any) => {
        setLoadError(err?.message || '加载客服配置失败');
      });
  }, [publicId, apiHost]);

  // 同步消息记录到 sessionStorage
  useEffect(() => {
    if (publicId && messages.length > 0) {
      setStoredMessages(publicId, messages);
    }
  }, [messages, publicId]);

  // 开启新对话
  const handleNewConversation = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.controller.abort();
      activeRequestRef.current = undefined;
    }
    clearConversationStorage(publicId);
    setMessages([]);
    setLoading(false);
  }, [publicId]);

  // 中止当前生成
  const handleStopGeneration = useCallback(() => {
    const active = activeRequestRef.current;
    if (!active) return;

    active.stoppedByUser = true;
    stopPublicChatMessage({
      publicId,
      requestId: active.requestId,
      sessionId: active.sessionId,
      apiHost
    });
    active.controller.abort();
  }, [publicId, apiHost]);

  // 发送消息或原位重试
  const handleSendMessage = async (presetText?: string, retryAssistantIndex?: number) => {
    const isRetry = retryAssistantIndex !== undefined;
    if (!publicId || loading || activeRequestRef.current) return;

    const retryAssistant = isRetry ? messages[retryAssistantIndex] : undefined;
    const previousUserMsg = isRetry ? messages[retryAssistantIndex - 1] : undefined;

    const queryMessage = (isRetry ? previousUserMsg?.content : presetText || input)?.trim();
    if (!queryMessage) return;

    const requestId =
      retryAssistant?.requestId ||
      (window.crypto?.randomUUID ? window.crypto.randomUUID() : `req-${Date.now()}`);
    const sessionId =
      retryAssistant?.sessionId || previousUserMsg?.sessionId || getSessionId(publicId);
    const assistantIndex = isRetry ? retryAssistantIndex : messages.length + 1;

    const controller = new AbortController();
    const currentToken = ++requestTokenRef.current;

    const request: ActiveRequest = {
      token: currentToken,
      projectKey: publicId,
      requestId,
      sessionId,
      assistantIndex,
      controller,
      stoppedByUser: false,
      stopRequested: false
    };

    activeRequestRef.current = request;
    setInput('');
    setLoading(true);

    if (isRetry) {
      setMessages((prev) =>
        prev.map((item, idx) => {
          if (idx === assistantIndex) {
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
          return item;
        })
      );
    } else {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: queryMessage, requestId, sessionId },
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

    const startedAt = Date.now();
    const timerInterval = setInterval(() => {
      if (activeRequestRef.current?.token !== currentToken) {
        clearInterval(timerInterval);
        return;
      }
      const waitingSeconds = Math.floor((Date.now() - startedAt) / 1000);
      setMessages((prev) =>
        prev.map((item, idx) => (idx === assistantIndex ? { ...item, waitingSeconds } : item))
      );
    }, 1000);

    try {
      const finalResp = await sendPublicChatMessageStream({
        publicId,
        requestId,
        sessionId,
        message: queryMessage,
        productModel: selection.modelCode,
        hardwareVersion: selection.hardwareVersionCode,
        softwareVersion: selection.softwareVersionCode,
        apiHost,
        signal: controller.signal,
        onStatus: () => {
          if (activeRequestRef.current?.token !== currentToken) return;
          setMessages((prev) =>
            prev.map((item, idx) => (idx === assistantIndex ? { ...item, processing: true } : item))
          );
        },
        onAnswerDelta: (delta) => {
          if (activeRequestRef.current?.token !== currentToken) return;
          setMessages((prev) =>
            prev.map((item, idx) =>
              idx === assistantIndex ? { ...item, content: item.content + delta } : item
            )
          );
        },
        onTimeout: () => {
          handleStopGeneration();
        }
      });

      if (activeRequestRef.current?.token === currentToken) {
        setMessages((prev) =>
          prev.map((item, idx) =>
            idx === assistantIndex
              ? {
                  ...item,
                  content: finalResp.answer,
                  processing: false,
                  waitingSeconds: undefined,
                  canRetry: false,
                  response: finalResp
                }
              : item
          )
        );
      }
    } catch (err: any) {
      if (activeRequestRef.current?.token === currentToken) {
        const errorMsg = request.stoppedByUser
          ? '回答已由用户中止'
          : err?.message || '生成回答失败，请检查网络后重试';

        setMessages((prev) =>
          prev.map((item, idx) =>
            idx === assistantIndex
              ? {
                  ...item,
                  content: item.content ? `${item.content}\n\n[${errorMsg}]` : errorMsg,
                  processing: false,
                  waitingSeconds: undefined,
                  canRetry: true
                }
              : item
          )
        );
      }
    } finally {
      clearInterval(timerInterval);
      if (activeRequestRef.current?.token === currentToken) {
        activeRequestRef.current = undefined;
        setLoading(false);
      }
    }
  };

  // 评价反馈
  const handleFeedback = async (
    messageIndex: number,
    type: CustomerServiceFeedbackBody['type'],
    content = ''
  ) => {
    const msg = messages[messageIndex];
    if (!msg || !msg.response) return;

    try {
      await submitPublicFeedback({
        publicId,
        sessionId: msg.response.sessionId,
        messageId: msg.response.messageId,
        type,
        content,
        apiHost
      });

      setMessages((prev) =>
        prev.map((item, idx) => (idx === messageIndex ? { ...item, feedback: type } : item))
      );
    } catch {
      // 提交失败静默处理或保留状态
    }
  };

  // 候选型号快捷点击
  const handleSelectCandidateModel = (modelCode: string) => {
    const matchedModel = bootstrap?.catalog.models.find((m) => m.modelCode === modelCode);
    setSelection((prev) => ({
      ...prev,
      seriesCode: matchedModel ? matchedModel.seriesCode : prev.seriesCode,
      modelCode
    }));
    handleSendMessage(`请针对型号 ${modelCode} 进行解答`);
  };

  if (loadError) {
    return (
      <div className="cs-app-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 24 }}>
          <AlertCircle size={44} style={{ color: 'var(--cs-danger)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>客服服务暂时不可用</h2>
          <p style={{ color: 'var(--cs-text-secondary)', fontSize: 13, marginBottom: 20 }}>
            {loadError}
          </p>
          <button type="button" className="cs-btn cs-btn-primary" onClick={handleRetryBootstrap}>
            <RefreshCw size={14} />
            <span>重新加载</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="cs-app-root">
      <div className="cs-layout">
        {/* 桌面端与移动端侧边栏 */}
        {!isWidget && (
          <aside className={`cs-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
            <div className="cs-sidebar-header">
              <div className="cs-brand-info">
                <div className="cs-brand-logo">
                  <span style={{ fontWeight: 700, fontSize: 18 }}>CS</span>
                </div>
                <div className="cs-brand-text">
                  <div className="cs-brand-title">{bootstrap?.project.name || '智能产品客服'}</div>
                  <div className="cs-online-badge">
                    <span className="cs-online-dot" />
                    <span>服务在线</span>
                  </div>
                </div>
              </div>
            </div>

            <ProductSelector
              catalog={bootstrap?.catalog}
              selection={selection}
              onSelectProduct={setSelection}
              humanContact={bootstrap?.project.humanContact}
              projectName={bootstrap?.project.name}
              onNewConversation={handleNewConversation}
              hasActiveMessages={messages.length > 0}
            />
          </aside>
        )}

        {/* 聊天主体交互区 */}
        <main className="cs-main">
          <Header
            projectName={bootstrap?.project.name || '产品客服'}
            humanContact={bootstrap?.project.humanContact}
            onNewConversation={handleNewConversation}
            onToggleProductSelector={!isWidget ? () => setIsSidebarOpen((v) => !v) : undefined}
            isSidebarOpen={isSidebarOpen}
            isWidget={isWidget}
            onCloseWidget={onCloseWidget}
          />

          <MessageList
            messages={messages}
            welcomeText={bootstrap?.project.welcomeText}
            recommendedQuestions={bootstrap?.project.recommendedQuestions}
            onSelectQuestion={(q) => handleSendMessage(q)}
            onSelectCandidateModel={handleSelectCandidateModel}
            onFeedback={(idx, type) => handleFeedback(idx, type)}
            onOpenFeedbackModal={(idx, resp, type) =>
              setFeedbackModal({
                isOpen: true,
                messageIndex: idx,
                response: resp,
                defaultType: type
              })
            }
            onRetryMessage={(idx) => handleSendMessage(undefined, idx)}
            loading={loading}
          />

          <ChatInput
            input={input}
            onChange={setInput}
            onSend={() => handleSendMessage()}
            onStop={handleStopGeneration}
            loading={loading}
            disabled={!publicId}
          />
        </main>
      </div>

      {/* 反馈对话框 */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal({ isOpen: false, messageIndex: -1 })}
        defaultType={feedbackModal.defaultType}
        onSubmit={async (type, content) => {
          if (feedbackModal.messageIndex >= 0) {
            await handleFeedback(feedbackModal.messageIndex, type, content);
          }
        }}
      />
    </div>
  );
};
