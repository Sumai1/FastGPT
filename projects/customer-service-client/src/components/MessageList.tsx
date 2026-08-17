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
} from './icons';
import type { ChatMessage, CustomerServicePublicChatResponse, TroubleshootStep } from '../types';
import { LightMarkdown } from '../utils/markdown';
import { DiagnosticGuideTree } from './DiagnosticGuideTree';
import { ErrorCodeQuickSearch } from './ErrorCodeQuickSearch';
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
  onRetryMessage?: (assistantIndex: number) => void;
  loading?: boolean;
}

/** 智能从助手文本中提取排查步骤 */
const extractTroubleshootSteps = (content: string): TroubleshootStep[] => {
  if (!content) return [];

  const steps: TroubleshootStep[] = [];
  const lines = content.split('\n');

  let stepCounter = 1;
  for (const line of lines) {
    const trimmed = line.trim();
    // 匹配如: "1. 检查电源线", "步骤 1: 重启设备", "第1步：清理卡纸", "- [ ] 步骤一"
    const stepMatch =
      trimmed.match(
        /^(?:(?:步骤|第)?\s*(\d+|[一二三四五六七八九十])\s*[、.：:]\s*|\d+\.\s+)(.+)$/
      ) || trimmed.match(/^-\s*\[\s*\]\s*(.+)$/);

    if (stepMatch) {
      const stepText = (stepMatch[2] || stepMatch[1] || '').trim();
      if (stepText.length >= 4 && stepText.length <= 150) {
        const isDanger = /高压|断电|触电|拔掉插头|切断电源|危险|开箱|拆机|拆卸/i.test(stepText);
        steps.push({
          id: `step-${stepCounter}`,
          index: stepCounter,
          title: stepText.replace(/\*\*/g, ''),
          completed: false,
          isDanger
        });
        stepCounter++;
      }
    }
  }

  // 只有当识别到 2 个或以上有效步骤时才激活排查卡片
  return steps.length >= 2 ? steps : [];
};

/** 检测文本中是否包含高危安全阻断级关键词 */
const checkHighDangerWarning = (content: string, safetyWarning?: string): boolean => {
  const target = `${safetyWarning || ''} ${content}`;
  return /高压电|带电拆机|触电危险|严禁拆卸|强电总成|压缩机高压|主板强电|漏电触电/i.test(target);
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  welcomeText,
  recommendedQuestions = [],
  onSelectQuestion,
  onSelectCandidateModel,
  onFeedback,
  onOpenFeedbackModal,
  onOpenHumanHandoff,
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
        {/* 欢迎语与场景化诊断引导区 */}
        {messages.length === 0 && (
          <>
            <div className="cs-welcome-hero">
              <div className="cs-welcome-title">
                <div className="cs-brand-logo" style={{ width: 34, height: 34 }}>
                  <Sparkles size={18} />
                </div>
                <span>{welcomeText || '您好！我是您的无人设备智能客服专家'}</span>
              </div>
              <div className="cs-welcome-desc">
                为您提供 7×24 小时无人设备（拍照机 /
                售货机）故障排查、常见问题解答、错误代码速查与人工转接支持。
              </div>

              {recommendedQuestions.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div className="cs-recommended-title">快捷咨询问题</div>
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

            {/* 场景化引导树 (拍照机/售货机专区) */}
            <DiagnosticGuideTree onSelectGuide={(prompt) => onSelectQuestion(prompt)} />

            {/* 错误代码速查小工具 */}
            <ErrorCodeQuickSearch
              onSearchErrorCode={(_, prompt) => onSelectQuestion(prompt || _)}
            />
          </>
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
                      title="⚠️ 阻断级高危电气安全警示"
                      message={
                        msg.response?.safetyWarning ||
                        '检测到排查涉及高压电源、带电拆机或强电回路。严禁普通用户自行带电拆卸外壳，以免发生触电危险！'
                      }
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
