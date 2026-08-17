import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  RotateCcw,
  BookOpen,
  Headphones,
  PhoneCall,
  ExternalLink
} from 'lucide-react';
import type { ChatMessage, CustomerServicePublicChatResponse } from '../types';
import { LightMarkdown } from '../utils/markdown';

interface MessageListProps {
  messages: ChatMessage[];
  welcomeText?: string;
  recommendedQuestions?: string[];
  onSelectQuestion: (question: string) => void;
  onSelectCandidateModel?: (modelCode: string) => void;
  onFeedback: (messageIndex: number, type: 'good' | 'bad' | 'unresolved') => void;
  onOpenFeedbackModal: (
    messageIndex: number,
    response: CustomerServicePublicChatResponse,
    defaultType?: 'good' | 'bad' | 'unresolved'
  ) => void;
  onRetryMessage?: (assistantIndex: number) => void;
  loading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  welcomeText,
  recommendedQuestions = [],
  onSelectQuestion,
  onSelectCandidateModel,
  onFeedback,
  onOpenFeedbackModal,
  onRetryMessage,
  loading
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [openCitations, setOpenCitations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleCitation = (index: number) => {
    setOpenCitations((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="cs-chat-scroll">
      <div className="cs-chat-container">
        {/* 欢迎语与推荐问题区 */}
        {messages.length === 0 && (
          <div className="cs-welcome-hero">
            <div className="cs-welcome-title">
              <div className="cs-brand-logo" style={{ width: 34, height: 34 }}>
                <Sparkles size={18} />
              </div>
              <span>{welcomeText || '您好！我是您的智能产品客服助手'}</span>
            </div>
            <div className="cs-welcome-desc">
              您可以直接提问设备使用、故障排查、耗材更换或保养问题，也可以点击下方推荐问题快速咨询。
            </div>

            {recommendedQuestions.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div className="cs-recommended-title">推荐提问</div>
                <div className="cs-recommended-wrap" style={{ marginTop: 8 }}>
                  {recommendedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="cs-recommended-pill"
                      onClick={() => onSelectQuestion(q)}
                    >
                      <Sparkles size={13} style={{ color: 'var(--cs-primary)' }} />
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 消息列表 */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const isCitationOpen = !!openCitations[index];

          if (isUser) {
            return (
              <div key={index} className="cs-message-row cs-message-user">
                <div className="cs-bubble-wrapper">
                  <div className="cs-bubble-user">{msg.content}</div>
                </div>
                <div className="cs-avatar cs-avatar-user">
                  <User size={18} />
                </div>
              </div>
            );
          }

          // 助手消息
          return (
            <div key={index} className="cs-message-row cs-message-assistant">
              <div className="cs-avatar cs-avatar-assistant">
                <Bot size={18} />
              </div>

              <div className="cs-bubble-wrapper">
                <div className="cs-bubble-assistant">
                  {/* 内容展示或加载中状态 */}
                  {msg.content ? (
                    <LightMarkdown content={msg.content} isStreaming={msg.processing} />
                  ) : (
                    <div className="cs-thinking-indicator">
                      <div className="cs-spinner" />
                      <span>
                        正在检索知识库并生成解答
                        {msg.waitingSeconds !== undefined ? ` (${msg.waitingSeconds}s)` : '...'}
                      </span>
                    </div>
                  )}

                  {/* 正在思考时间提示 */}
                  {msg.processing && msg.content && msg.waitingSeconds !== undefined && (
                    <div style={{ fontSize: 12, color: 'var(--cs-text-muted)', marginTop: 4 }}>
                      持续生成中... ({msg.waitingSeconds}s)
                    </div>
                  )}

                  {/* 安全告警提示 */}
                  {msg.response?.safetyWarning && (
                    <div className="cs-safety-warning">
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>{msg.response.safetyWarning}</div>
                    </div>
                  )}

                  {/* 歧义型号候选列表 */}
                  {msg.response?.candidates && msg.response.candidates.length > 0 && (
                    <div className="cs-candidates-box">
                      <div className="cs-candidates-title">
                        检测到相关设备型号，请确认您的机型：
                      </div>
                      <div className="cs-candidates-grid">
                        {msg.response.candidates.map((cand) => (
                          <button
                            key={cand.modelCode}
                            type="button"
                            className="cs-candidate-chip"
                            onClick={() => onSelectCandidateModel?.(cand.modelCode)}
                          >
                            <strong>{cand.name}</strong> ({cand.modelCode})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 知识库引用折叠卡片 */}
                  {msg.response?.citations && msg.response.citations.length > 0 && (
                    <div className="cs-citations-accordion">
                      <button
                        type="button"
                        className="cs-citations-trigger"
                        onClick={() => toggleCitation(index)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <BookOpen size={14} />
                          知识库参考来源 ({msg.response.citations.length})
                        </span>
                        {isCitationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isCitationOpen && (
                        <div className="cs-citations-list">
                          {msg.response.citations.map((cite, cIdx) => (
                            <div key={cIdx} className="cs-citation-item">
                              <div className="cs-citation-header">
                                <span className="cs-citation-title">{cite.title}</span>
                                {cite.score !== undefined && cite.score !== null && (
                                  <span className="cs-citation-score">
                                    匹配度 {Math.round(cite.score * 100)}%
                                  </span>
                                )}
                              </div>
                              <div className="cs-citation-summary">{cite.summary}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 转人工客服推荐 */}
                  {msg.response?.humanContact && (
                    <div className="cs-human-contact-card" style={{ marginTop: 6 }}>
                      <div className="cs-human-contact-title">
                        <Headphones size={15} />
                        <span>建议联系人工客服支持：{msg.response.humanContact.name}</span>
                      </div>
                      <div className="cs-human-contact-actions">
                        {msg.response.humanContact.phone && (
                          <a
                            href={`tel:${msg.response.humanContact.phone}`}
                            className="cs-contact-btn cs-contact-btn-primary"
                          >
                            <PhoneCall size={13} />
                            <span>{msg.response.humanContact.phone}</span>
                          </a>
                        )}
                        {msg.response.humanContact.url && (
                          <a
                            href={msg.response.humanContact.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cs-contact-btn cs-contact-btn-outline"
                          >
                            <ExternalLink size={13} />
                            <span>转人工服务</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 消息底部操作栏 */}
                  {!msg.processing && (
                    <div className="cs-bubble-actions">
                      <div className="cs-feedback-group">
                        <button
                          type="button"
                          className={`cs-action-btn ${msg.feedback === 'good' ? 'active' : ''}`}
                          onClick={() => onFeedback(index, 'good')}
                          title="有帮助"
                        >
                          <ThumbsUp size={13} />
                          <span>有帮助</span>
                        </button>

                        <button
                          type="button"
                          className={`cs-action-btn ${msg.feedback === 'bad' ? 'active' : ''}`}
                          onClick={() => {
                            if (msg.response) {
                              onOpenFeedbackModal(index, msg.response, 'bad');
                            } else {
                              onFeedback(index, 'bad');
                            }
                          }}
                          title="无帮助"
                        >
                          <ThumbsDown size={13} />
                          <span>未解决</span>
                        </button>

                        <button
                          type="button"
                          className={`cs-action-btn cs-action-btn-warning ${
                            msg.feedback === 'unresolved' ? 'active' : ''
                          }`}
                          onClick={() => {
                            if (msg.response) {
                              onOpenFeedbackModal(index, msg.response, 'unresolved');
                            } else {
                              onFeedback(index, 'unresolved');
                            }
                          }}
                          title="问题仍未解决？点击反馈"
                        >
                          <HelpCircle size={13} />
                          <span>未解决反馈</span>
                        </button>
                      </div>

                      {msg.canRetry && onRetryMessage && !loading && (
                        <button
                          type="button"
                          className="cs-action-btn"
                          disabled={msg.stopPending}
                          onClick={() => onRetryMessage(index)}
                          title="重新生成此回答"
                        >
                          <RotateCcw size={13} />
                          <span>重试</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
