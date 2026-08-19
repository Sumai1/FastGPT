import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  fetchPublicBootstrap,
  sendPublicChatMessageStream,
  stopPublicChatMessage,
  submitPublicFeedback
} from '../services/api';
import {
  getActiveSessionId,
  setActiveSessionId,
  generateSessionId,
  getSessionList,
  getSessionMessages,
  saveSessionMessages,
  deleteSession,
  clearAllSessions,
  exportMessagesToMarkdown,
  downloadMarkdownFile
} from '../services/session';
import type {
  ActiveRequest,
  ChatMessage,
  CustomerServiceAccess,
  CustomerServiceFeedbackBody,
  CustomerServicePublicBootstrapResponse,
  CustomerServiceCitation,
  FeedbackModalState,
  HumanHandoffData,
  ProductSelection,
  SessionSummary
} from '../types';
import { CustomerServiceAudienceEnum } from '../types';
import { Header } from './Header';
import { ProductSelector } from './ProductSelector';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { FeedbackModal } from './FeedbackModal';
import { SessionDrawer } from './SessionDrawer';
import { HumanHandoffModal } from './HumanHandoffModal';
import { QuoteDrawer } from './QuoteDrawer';
import { AlertCircle, RefreshCw } from './icons';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth > 900;
  });
  const [isSessionDrawerOpen, setIsSessionDrawerOpen] = useState<boolean>(false);

  // 受众身份状态（客户 / 运营 / 售后）
  const [audience, setAudience] = useState<CustomerServiceAudienceEnum>(
    CustomerServiceAudienceEnum.public
  );

  // 会话状态
  const [currentSessionId, setCurrentSessionId] = useState<string>(() =>
    publicId ? getActiveSessionId(publicId) : ''
  );
  const [sessions, setSessions] = useState<SessionSummary[]>(() =>
    publicId ? getSessionList(publicId) : []
  );

  // 转人工工单状态
  const [handoffModalState, setHandoffModalState] = useState<{
    isOpen: boolean;
    data: HumanHandoffData;
  }>({
    isOpen: false,
    data: {}
  });

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

  const [quoteDrawerState, setQuoteDrawerState] = useState<{
    isOpen: boolean;
    citations: CustomerServiceCitation[];
    messageIndex?: number;
  }>({
    isOpen: false,
    citations: []
  });

  const activeRequestRef = useRef<ActiveRequest | undefined>(undefined);
  const requestTokenRef = useRef<number>(0);

  // 初始化加载 Bootstrap 配置与历史会话
  useEffect(() => {
    let isMounted = true;
    if (!publicId) return;

    fetchPublicBootstrap({ publicId, apiHost })
      .then((data) => {
        if (!isMounted) return;
        setBootstrap(data);
        const sid = getActiveSessionId(publicId);
        const stored = getSessionMessages(publicId, sid);
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
    const sid = getActiveSessionId(publicId);
    setCurrentSessionId(sid);

    fetchPublicBootstrap({ publicId, apiHost })
      .then((data) => {
        setBootstrap(data);
        setSessions(getSessionList(publicId));
        setMessages(getSessionMessages(publicId, sid));
      })
      .catch((err: any) => {
        setLoadError(err?.message || '加载客服配置失败');
      });
  }, [publicId, apiHost]);

  // 同步消息记录到持久化存储
  useEffect(() => {
    if (publicId && currentSessionId && messages.length > 0) {
      saveSessionMessages({
        projectKey: publicId,
        sessionId: currentSessionId,
        messages,
        selection
      });
    }
  }, [messages, publicId, currentSessionId, selection]);

  // 开启新会话
  const handleNewConversation = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.controller.abort();
      activeRequestRef.current = undefined;
    }
    const newSessionId = generateSessionId();
    setCurrentSessionId(newSessionId);
    setActiveSessionId(publicId, newSessionId);
    setMessages([]);
    setLoading(false);
  }, [publicId]);

  // 切换历史会话
  const handleSelectSession = useCallback(
    (targetSessionId: string) => {
      if (targetSessionId === currentSessionId) return;
      if (activeRequestRef.current) {
        activeRequestRef.current.controller.abort();
        activeRequestRef.current = undefined;
      }
      setCurrentSessionId(targetSessionId);
      setActiveSessionId(publicId, targetSessionId);

      const targetMessages = getSessionMessages(publicId, targetSessionId);
      setMessages(targetMessages);
      setLoading(false);

      // 恢复该会话的产品型号
      const targetSession = sessions.find((s) => s.id === targetSessionId);
      if (targetSession?.selection) {
        setSelection(targetSession.selection);
      }
    },
    [currentSessionId, publicId, sessions]
  );

  // 删除单个历史会话
  const handleDeleteSession = useCallback(
    (targetSessionId: string) => {
      deleteSession(publicId, targetSessionId);
      setSessions(getSessionList(publicId));
      if (targetSessionId === currentSessionId) {
        handleNewConversation();
      }
    },
    [publicId, currentSessionId, handleNewConversation]
  );

  // 清空所有历史会话
  const handleClearAllSessions = useCallback(() => {
    clearAllSessions(publicId);
    setSessions([]);
    handleNewConversation();
  }, [publicId, handleNewConversation]);

  // 导出 Markdown 文件
  const handleExportMarkdown = useCallback(() => {
    const md = exportMessagesToMarkdown({
      projectName: bootstrap?.project.name,
      sessionId: currentSessionId,
      messages,
      selection
    });
    const filename = `customer-service-${selection.modelCode || 'session'}-${Date.now()}.md`;
    downloadMarkdownFile(filename, md);
  }, [bootstrap?.project.name, currentSessionId, messages, selection]);

  // 复制全量对话文本
  const handleCopyAllText = useCallback(() => {
    const md = exportMessagesToMarkdown({
      projectName: bootstrap?.project.name,
      sessionId: currentSessionId,
      messages,
      selection
    });
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(md).then(() => {
        alert('已复制完整对话记录到剪贴板！');
      });
    }
  }, [bootstrap?.project.name, currentSessionId, messages, selection]);

  // 打开人工客服工单摘要弹窗
  const handleOpenHumanHandoff = useCallback(
    (faultSummary?: string, steps?: { title: string; completed: boolean }[]) => {
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');

      const handoffData: HumanHandoffData = {
        projectName: bootstrap?.project.name,
        productModel: selection.modelCode,
        hardwareVersion: selection.hardwareVersionCode,
        softwareVersion: selection.softwareVersionCode,
        faultSummary: faultSummary || lastUserMsg?.content || '设备故障排查与人工协助',
        troubleshootSteps: steps,
        audience,
        sessionId: currentSessionId,
        timestamp: Date.now(),
        humanContact: bootstrap?.project.humanContact
      };

      setHandoffModalState({
        isOpen: true,
        data: handoffData
      });
    },
    [bootstrap, selection, audience, currentSessionId, messages]
  );

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
    const sessionId = currentSessionId || getActiveSessionId(publicId);
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
      // 提交失败静默处理
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
        {/* 桌面端侧边栏 */}
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
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onClearAllSessions={handleClearAllSessions}
            />
          </aside>
        )}

        {/* 聊天主体交互区 */}
        <main className="cs-main">
          <Header
            projectName={bootstrap?.project.name || '产品客服'}
            humanContact={bootstrap?.project.humanContact}
            audience={audience}
            onAudienceChange={setAudience}
            onNewConversation={handleNewConversation}
            onOpenSessionDrawer={() => setIsSessionDrawerOpen(true)}
            onOpenHumanHandoff={() => handleOpenHumanHandoff()}
            onToggleProductSelector={!isWidget ? () => setIsSidebarOpen((v) => !v) : undefined}
            isSidebarOpen={isSidebarOpen}
            isWidget={isWidget}
            onCloseWidget={onCloseWidget}
            sessionCount={sessions.length}
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
            onOpenHumanHandoff={handleOpenHumanHandoff}
            onOpenQuoteDrawer={(cites, idx) =>
              setQuoteDrawerState({
                isOpen: true,
                citations: cites || [],
                messageIndex: idx
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

      {/* 知识库参考来源抽屉 */}
      <QuoteDrawer
        isOpen={quoteDrawerState.isOpen}
        onClose={() => setQuoteDrawerState({ isOpen: false, citations: [] })}
        citations={quoteDrawerState.citations}
        messageIndex={quoteDrawerState.messageIndex}
      />

      {/* 历史会话管理抽屉 */}
      <SessionDrawer
        isOpen={isSessionDrawerOpen}
        onClose={() => setIsSessionDrawerOpen(false)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewConversation}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        onExportMarkdown={handleExportMarkdown}
        onCopyAllText={handleCopyAllText}
      />

      {/* 结构化转人工工单弹窗 */}
      <HumanHandoffModal
        isOpen={handoffModalState.isOpen}
        onClose={() => setHandoffModalState({ isOpen: false, data: {} })}
        handoffData={handoffModalState.data}
      />

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
