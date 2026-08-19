import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Camera,
  ShoppingBag,
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
} from './icons';
import type { ChatMessage, CustomerServicePublicChatResponse } from '../types';
import { LightMarkdown } from '../utils/markdown';
import { extractTroubleshootSteps } from '../utils/troubleshoot';
import {
  checkHighDangerWarning,
  getMatchedSafetyRule,
  classifyCitationType
} from '../utils/safety';
import { TroubleshootCard } from './TroubleshootCard';
import { SafetyAlertCard } from './SafetyAlertCard';

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
  onOpenHumanHandoff?: (
    faultSummary?: string,
    steps?: { title: string; completed: boolean }[]
  ) => void;
  onOpenQuoteDrawer?: (
    citations: CustomerServicePublicChatResponse['citations'],
    messageIndex: number
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
  onOpenHumanHandoff,
  onOpenQuoteDrawer,
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
        {/* 欢迎语与场景化极简场景卡 (FastGPT Native DesktopHomeHero & QuickApps) */}
        {messages.length === 0 && (
          <div className="cs-native-hero">
            <div className="cs-native-hero-icon">
              <Bot size={34} />
            </div>
            <h1 className="cs-native-hero-title">{welcomeText || '企业产品智能客服'}</h1>
            <p className="cs-native-hero-subtitle">
              专为自助拍照机、智能售货机等无人设备打造的 7×24 小时排障与售后支持门户
            </p>

            {/* 44px 极简场景推荐卡 (对标 FastGPT QuickApps) */}
            <div className="cs-quickapps-row">
              <div
                className="cs-quickapp-chip"
                onClick={() => onSelectQuestion('拍照机相纸卡在出片口或切刀处卡阻，如何安全排障？')}
                role="button"
                tabIndex={0}
              >
                <div className="cs-quickapp-avatar photo">
                  <Camera size={14} />
                </div>
                <span className="cs-quickapp-text">拍照机 卡纸/切刀阻滞排查</span>
              </div>

              <div
                className="cs-quickapp-chip"
                onClick={() =>
                  onSelectQuestion('售货机用户已扣款但货道电机未掉货，如何应急处理并退款？')
                }
                role="button"
                tabIndex={0}
              >
                <div className="cs-quickapp-avatar vending">
                  <ShoppingBag size={14} />
                </div>
                <span className="cs-quickapp-text">售货机 扣款未掉货应急处理</span>
              </div>

              <div
                className="cs-quickapp-chip"
                onClick={() =>
                  onSelectQuestion('设备屏幕显示错误代码 E-01 或 V-101，具体代表什么故障？')
                }
                role="button"
                tabIndex={0}
              >
                <div className="cs-quickapp-avatar tool">
                  <Sparkles size={14} />
                </div>
                <span className="cs-quickapp-text">错误代码秒查 (E-01 / V-101)</span>
              </div>

              {recommendedQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="cs-quickapp-chip"
                  onClick={() => onSelectQuestion(q)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cs-quickapp-avatar">
                    <Sparkles size={13} />
                  </div>
                  <span className="cs-quickapp-text">{q}</span>
                </div>
              ))}
            </div>
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
          const extractedSteps =
            !msg.processing && msg.content ? extractTroubleshootSteps(msg.content) : [];
          const isHighDanger = checkHighDangerWarning(msg.content, msg.response?.safetyWarning);
          const matchedSafetyRule = isHighDanger
            ? getMatchedSafetyRule(msg.content, msg.response?.safetyWarning)
            : null;

          const textBeforeSteps =
            extractedSteps.length > 0
              ? (
                  msg.content.split(
                    /\n(?=(?:步骤|第|step)?\s*(\d+|[一二三四五六七八九十])\s*[\.、:：\-\s]|\d+[\.、\)]|- \[\s*[xX ]?\s*\])/i
                  )[0] || ''
                ).trim()
              : msg.content;

          return (
            <div key={index} className="cs-message-row cs-message-assistant">
              <div className="cs-avatar cs-avatar-assistant">
                <Bot size={18} />
              </div>

              <div className="cs-bubble-wrapper">
                <div className="cs-bubble-assistant">
                  {/* 高危安全警告红框 (阻断级) */}
                  {isHighDanger && (
                    <SafetyAlertCard
                      level="danger"
                      title="阻断级高危电气安全警示"
                      message={
                        msg.response?.safetyWarning ||
                        matchedSafetyRule?.warningMessage ||
                        '检测到排查涉及高压电源、带电拆机或强电回路。严禁普通用户自行带电拆卸外壳，以免发生触电危险！'
                      }
                      prohibitedActions={matchedSafetyRule?.prohibitedActions}
                      phone={msg.response?.humanContact?.phone}
                      onContactSupport={
                        onOpenHumanHandoff
                          ? () =>
                              onOpenHumanHandoff(
                                '触发高压电/带电拆机高危安全警示，请求专业售后协助',
                                []
                              )
                          : undefined
                      }
                    />
                  )}

                  {/* 普通安全告警提示 (非阻断) */}
                  {!isHighDanger && msg.response?.safetyWarning && (
                    <div className="cs-safety-warning">
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>{msg.response.safetyWarning}</div>
                    </div>
                  )}

                  {/* 核心内容展示或加载中状态 */}
                  {msg.content ? (
                    textBeforeSteps ? (
                      <LightMarkdown content={textBeforeSteps} isStreaming={msg.processing} />
                    ) : null
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

                  {/* 交互式排查清单卡片 */}
                  {extractedSteps.length > 0 && (
                    <TroubleshootCard
                      title="交互式步骤排查清单（可逐项勾选）"
                      steps={extractedSteps}
                      onRequestHumanHandoff={() => {
                        const previousUserMsg = messages[index - 1];
                        onOpenHumanHandoff?.(
                          previousUserMsg?.content || '设备故障未解决',
                          extractedSteps.map((s) => ({
                            title: s.title,
                            completed: !!s.completed
                          }))
                        );
                      }}
                      onResolvedFeedback={() => onFeedback(index, 'good')}
                    />
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

                  {/* 结构化知识库引用折叠卡片 (4大资料类型分类透出) */}
                  {msg.response?.citations && msg.response.citations.length > 0 && (
                    <div className="cs-citations-accordion">
                      <button
                        type="button"
                        className="cs-citations-trigger"
                        onClick={() => {
                          if (onOpenQuoteDrawer && msg.response?.citations) {
                            onOpenQuoteDrawer(msg.response.citations, index);
                          } else {
                            toggleCitation(index);
                          }
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <BookOpen size={14} />
                          知识库参考来源 ({msg.response.citations.length})
                        </span>
                        {isCitationOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isCitationOpen && (
                        <div className="cs-citations-list">
                          {msg.response.citations.map((cite, cIdx) => {
                            const classification = classifyCitationType(cite.title, cite.summary);
                            return (
                              <div
                                key={cIdx}
                                className="cs-citation-item"
                                style={{
                                  backgroundColor: classification.typeBg,
                                  borderColor: classification.borderColor
                                }}
                              >
                                <div className="cs-citation-header">
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      className="cs-citation-title"
                                      style={{ color: classification.typeColor }}
                                    >
                                      {cite.title}
                                    </span>
                                  </div>
                                  {cite.score !== undefined && cite.score !== null && (
                                    <span
                                      className="cs-citation-score"
                                      style={{ color: classification.typeColor }}
                                    >
                                      匹配度 {Math.round(cite.score * 100)}%
                                    </span>
                                  )}
                                </div>
                                <div
                                  className="cs-citation-summary"
                                  style={{ color: classification.typeColor }}
                                >
                                  {cite.summary}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 转人工客服推荐与工单摘要 */}
                  {msg.response?.humanContact && (
                    <div className="cs-human-contact-card" style={{ marginTop: 6 }}>
                      <div className="cs-human-contact-title">
                        <Headphones size={15} />
                        <span>建议联系人工客服支持：{msg.response.humanContact.name}</span>
                      </div>
                      <div className="cs-human-contact-actions">
                        {onOpenHumanHandoff && (
                          <button
                            type="button"
                            className="cs-contact-btn cs-contact-btn-primary"
                            onClick={() => {
                              const prevUser = messages[index - 1];
                              onOpenHumanHandoff(
                                prevUser?.content || '设备故障需要人工介入',
                                extractedSteps.map((s) => ({
                                  title: s.title,
                                  completed: !!s.completed
                                }))
                              );
                            }}
                          >
                            <Headphones size={13} />
                            <span>一键生成转接工单</span>
                          </button>
                        )}
                        {msg.response.humanContact.phone && (
                          <a
                            href={`tel:${msg.response.humanContact.phone}`}
                            className="cs-contact-btn cs-contact-btn-outline"
                          >
                            <PhoneCall size={13} />
                            <span>拨打电话 ({msg.response.humanContact.phone})</span>
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
                            <span>在线人工渠道</span>
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
                          <span>深度反馈</span>
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
