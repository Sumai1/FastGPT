import React, { useState } from 'react';
import { X, MessageSquareWarning } from 'lucide-react';
import type { CustomerServiceFeedbackBody } from '../types';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: CustomerServiceFeedbackBody['type'], content: string) => Promise<void>;
  defaultType?: CustomerServiceFeedbackBody['type'];
}

const PRESET_REASONS = [
  '回答不准确',
  '未找到相关解决方案',
  '操作步骤不清晰',
  '资料内容已过时',
  '设备型号不匹配',
  '建议转人工处理'
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultType = 'unresolved'
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customDetail, setCustomDetail] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const combinedContent = [selectedReason, customDetail.trim()].filter(Boolean).join('；');
    setSubmitting(true);
    try {
      await onSubmit(defaultType, combinedContent);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cs-modal-header">
          <div className="cs-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquareWarning size={18} style={{ color: 'var(--cs-warning)' }} />
            <span>问题未解决反馈</span>
          </div>
          <button type="button" className="cs-action-btn" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="cs-modal-body">
          <p style={{ fontSize: 13, color: 'var(--cs-text-secondary)' }}>
            请选择或填写未解决的原因，帮助我们持续完善知识库与服务质量：
          </p>

          <div className="cs-reasons-grid">
            {PRESET_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                className={`cs-reason-btn ${selectedReason === reason ? 'selected' : ''}`}
                onClick={() => setSelectedReason(reason === selectedReason ? '' : reason)}
              >
                {reason}
              </button>
            ))}
          </div>

          <textarea
            className="cs-feedback-textarea"
            placeholder="请补充具体说明（可选，例如期望的排查步骤或正确参数）..."
            value={customDetail}
            onChange={(e) => setCustomDetail(e.target.value)}
            maxLength={1000}
          />
        </div>

        <div className="cs-modal-footer">
          <button
            type="button"
            className="cs-btn cs-btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            取消
          </button>
          <button
            type="button"
            className="cs-btn cs-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交反馈'}
          </button>
        </div>
      </div>
    </div>
  );
};
