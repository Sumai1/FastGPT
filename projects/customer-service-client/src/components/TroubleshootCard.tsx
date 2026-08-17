import React, { useState } from 'react';
import {
  CheckCircle2,
  Headphones,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  ShieldAlert
} from './icons';
import type { TroubleshootStep } from '../types';

interface TroubleshootCardProps {
  title?: string;
  steps: TroubleshootStep[];
  onStepToggle?: (stepId: string, completed: boolean) => void;
  onRequestHumanHandoff?: () => void;
  onResolvedFeedback?: () => void;
}

export const TroubleshootCard: React.FC<TroubleshootCardProps> = ({
  title = '交互式故障排查步骤清单',
  steps: initialSteps,
  onStepToggle,
  onRequestHumanHandoff,
  onResolvedFeedback
}) => {
  const [steps, setSteps] = useState<TroubleshootStep[]>(initialSteps);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [resolvedStatus, setResolvedStatus] = useState<'none' | 'resolved' | 'unresolved'>('none');

  const totalSteps = steps.length;
  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const allCompleted = totalSteps > 0 && completedCount === totalSteps;

  const handleToggle = (stepId: string) => {
    const updated = steps.map((s) => (s.id === stepId ? { ...s, completed: !s.completed } : s));
    setSteps(updated);
    const target = updated.find((s) => s.id === stepId);
    if (target) {
      onStepToggle?.(stepId, !!target.completed);
    }
  };

  const toggleDetail = (stepId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSteps((prev) => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const handleReset = () => {
    const reset = steps.map((s) => ({ ...s, completed: false }));
    setSteps(reset);
    setResolvedStatus('none');
  };

  return (
    <div className="cs-troubleshoot-card">
      <div className="cs-troubleshoot-header">
        <div className="cs-troubleshoot-title-group">
          <div className="cs-troubleshoot-badge-icon">
            <Sparkles size={15} />
          </div>
          <div>
            <div className="cs-troubleshoot-title">{title}</div>
            <div className="cs-troubleshoot-progress-text">
              排查进度：<strong>{completedCount}</strong> / {totalSteps} 步 ({progressPercent}%)
            </div>
          </div>
        </div>

        {completedCount > 0 && (
          <button
            type="button"
            className="cs-troubleshoot-reset-btn"
            onClick={handleReset}
            title="重置排查勾选"
          >
            <RotateCcw size={12} />
            <span>重置</span>
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="cs-troubleshoot-progress-bar-track">
        <div
          className={`cs-troubleshoot-progress-bar-fill ${allCompleted ? 'completed' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 步骤列表 */}
      <div className="cs-troubleshoot-steps-list">
        {steps.map((step, idx) => {
          const isDone = !!step.completed;
          const isExpanded = !!expandedSteps[step.id];

          return (
            <div
              key={step.id || idx}
              className={`cs-troubleshoot-step-item ${isDone ? 'done' : ''} ${
                step.isDanger ? 'danger' : ''
              }`}
              onClick={() => handleToggle(step.id)}
              role="checkbox"
              aria-checked={isDone}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleToggle(step.id);
                }
              }}
            >
              <div className="cs-troubleshoot-checkbox">
                {isDone ? (
                  <div className="cs-troubleshoot-checked-icon">
                    <Check size={14} />
                  </div>
                ) : (
                  <div className="cs-troubleshoot-unchecked-icon">
                    <span>{idx + 1}</span>
                  </div>
                )}
              </div>

              <div className="cs-troubleshoot-step-main">
                <div className="cs-troubleshoot-step-title-row">
                  <span className="cs-troubleshoot-step-title">{step.title}</span>
                  {step.isDanger && (
                    <span className="cs-troubleshoot-danger-tag">
                      <ShieldAlert size={12} />
                      <span>高危断电操作</span>
                    </span>
                  )}
                </div>

                {step.detail && (
                  <div className="cs-troubleshoot-detail-wrap">
                    <button
                      type="button"
                      className="cs-troubleshoot-detail-toggle"
                      onClick={(e) => toggleDetail(step.id, e)}
                    >
                      <span>{isExpanded ? '收起详情' : '展开操作要领'}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                    {isExpanded && (
                      <div className="cs-troubleshoot-detail-content">{step.detail}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 全部完成后的排查结果确认 */}
      {allCompleted && resolvedStatus === 'none' && (
        <div className="cs-troubleshoot-result-box">
          <div className="cs-troubleshoot-result-title">
            <CheckCircle2 size={16} className="cs-text-success" />
            <span>已完成全部排查步骤，设备是否已恢复正常？</span>
          </div>
          <div className="cs-troubleshoot-result-actions">
            <button
              type="button"
              className="cs-btn cs-btn-sm cs-btn-secondary"
              style={{ color: 'var(--cs-success)', borderColor: 'var(--cs-success-border)' }}
              onClick={() => {
                setResolvedStatus('resolved');
                onResolvedFeedback?.();
              }}
            >
              <Check size={13} />
              <span>已恢复正常</span>
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-sm cs-btn-danger"
              onClick={() => {
                setResolvedStatus('unresolved');
                onRequestHumanHandoff?.();
              }}
            >
              <Headphones size={13} />
              <span>仍未恢复，转人工客服</span>
            </button>
          </div>
        </div>
      )}

      {resolvedStatus === 'resolved' && (
        <div className="cs-troubleshoot-success-note">
          <CheckCircle2 size={15} />
          <span>感谢您的排查！故障已顺利解决。若后续遇到其他问题欢迎随时咨询。</span>
        </div>
      )}

      {/* 底部转人工快捷入口 */}
      <div className="cs-troubleshoot-footer">
        <span className="cs-troubleshoot-footer-tip">
          如自行排查遇到困难或涉及带电作业，请勿强行操作
        </span>
        {onRequestHumanHandoff && (
          <button
            type="button"
            className="cs-troubleshoot-handoff-link"
            onClick={onRequestHumanHandoff}
          >
            <Headphones size={13} />
            <span>一键转人工工单</span>
          </button>
        )}
      </div>
    </div>
  );
};
