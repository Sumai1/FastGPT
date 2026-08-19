import React from 'react';
import { X, BookOpen, ExternalLink, CheckCircle2 } from './icons';
import type { CustomerServiceCitation } from '../types';
import { classifyCitationType } from '../utils/safety';

interface QuoteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citations: CustomerServiceCitation[];
  messageIndex?: number;
}

export const QuoteDrawer: React.FC<QuoteDrawerProps> = ({
  isOpen,
  onClose,
  citations,
  messageIndex
}) => {
  if (!isOpen || !citations || citations.length === 0) return null;

  return (
    <div className="cs-drawer-overlay" onClick={onClose}>
      <div
        className="cs-quote-drawer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="知识库参考来源"
      >
        <div className="cs-drawer-header">
          <div className="cs-drawer-title-group">
            <div className="cs-drawer-icon">
              <BookOpen size={16} />
            </div>
            <div>
              <div className="cs-drawer-title">知识库参考来源</div>
              <div className="cs-drawer-subtitle">
                共召回 {citations.length} 篇相关资料依据
                {messageIndex !== undefined && `（第 ${messageIndex + 1} 条回复）`}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="cs-btn cs-btn-secondary cs-btn-icon"
            onClick={onClose}
            aria-label="关闭来源抽屉"
          >
            <X size={16} />
          </button>
        </div>

        <div className="cs-drawer-body">
          <div className="cs-quote-list">
            {citations.map((cite, idx) => {
              const classification = classifyCitationType(cite.title, cite.summary);
              const scorePercent =
                cite.score !== undefined && cite.score !== null
                  ? Math.round(cite.score * 100)
                  : undefined;

              return (
                <div key={idx} className="cs-quote-card">
                  <div className="cs-quote-card-header">
                    <span
                      className="cs-quote-type-tag"
                      style={{
                        color: classification.typeColor,
                        backgroundColor: classification.typeBg,
                        borderColor: classification.borderColor
                      }}
                    >
                      {classification.typeLabel}
                    </span>
                    <span className="cs-quote-card-title">{cite.title}</span>
                  </div>

                  {scorePercent !== undefined && (
                    <div className="cs-quote-score-row">
                      <div className="cs-quote-score-bar-bg">
                        <div
                          className="cs-quote-score-bar-fill"
                          style={{
                            width: `${Math.min(100, Math.max(0, scorePercent))}%`,
                            backgroundColor:
                              scorePercent >= 80
                                ? 'var(--cs-primary)'
                                : scorePercent >= 60
                                  ? 'var(--cs-warning)'
                                  : 'var(--cs-text-muted)'
                          }}
                        />
                      </div>
                      <span className="cs-quote-score-text">
                        匹配度 {scorePercent}%
                        {scorePercent >= 80 && (
                          <span className="cs-quote-confidence-high">高置信</span>
                        )}
                      </span>
                    </div>
                  )}

                  {cite.summary && (
                    <div className="cs-quote-snippet">
                      <div className="cs-quote-snippet-label">原文摘要片段：</div>
                      <div className="cs-quote-snippet-content">{cite.summary}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cs-drawer-footer">
          <div className="cs-quote-trust-tip">
            <CheckCircle2 size={13} style={{ color: 'var(--cs-success)' }} />
            <span>所有回答均基于已发布且在有效期内的官方知识库生成</span>
          </div>
          <button type="button" className="cs-btn cs-btn-secondary cs-btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
