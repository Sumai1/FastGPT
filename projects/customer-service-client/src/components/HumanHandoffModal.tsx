import React, { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  PhoneCall,
  ExternalLink,
  Headphones,
  FileText,
  Clock,
  AlertCircle
} from './icons';
import type { HumanHandoffData } from '../types';
import { CustomerServiceAudienceEnum } from '../types';

interface HumanHandoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  handoffData: HumanHandoffData;
}

export const HumanHandoffModal: React.FC<HumanHandoffModalProps> = ({
  isOpen,
  onClose,
  handoffData
}) => {
  const [copied, setCopied] = useState(false);

  const audienceLabel = useMemo(() => {
    switch (handoffData.audience) {
      case CustomerServiceAudienceEnum.dealer:
        return '经销商/运营 (dealer)';
      case CustomerServiceAudienceEnum.internal:
        return '内部售后技术 (internal)';
      default:
        return '普通终端客户 (public)';
    }
  }, [handoffData.audience]);

  const formattedTime = useMemo(() => {
    const d = handoffData.timestamp ? new Date(handoffData.timestamp) : new Date();
    return d.toLocaleString('zh-CN', { hour12: false });
  }, [handoffData.timestamp]);

  // 生成结构化工单摘要文本
  const ticketSummaryText = useMemo(() => {
    const lines: string[] = [];
    lines.push('【智能客服售后转接工单】');
    lines.push(`• 所属客服：${handoffData.projectName || '自助设备智能客服'}`);
    lines.push(`• 设备型号：${handoffData.productModel || '通用机型 / 未选择特定型号'}`);
    if (handoffData.hardwareVersion || handoffData.softwareVersion) {
      lines.push(
        `• 软硬件版本：HW ${handoffData.hardwareVersion || '通用'} / SW ${
          handoffData.softwareVersion || '通用'
        }`
      );
    }
    lines.push(`• 咨询身份：${audienceLabel}`);
    lines.push(`• 故障现象：${handoffData.faultSummary || '用户请求人工客服介入协助'}`);

    if (handoffData.troubleshootSteps && handoffData.troubleshootSteps.length > 0) {
      lines.push('• 已执行排查步骤：');
      handoffData.troubleshootSteps.forEach((step, idx) => {
        const mark = step.completed ? '[✓已排查]' : '[✗未完成/未解决]';
        lines.push(`  ${mark} ${idx + 1}. ${step.title}`);
      });
    }

    lines.push(`• 提交时间：${formattedTime}`);
    if (handoffData.sessionId) {
      lines.push(`• 会话编号：${handoffData.sessionId}`);
    }

    return lines.join('\n');
  }, [handoffData, audienceLabel, formattedTime]);

  const handleCopy = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(ticketSummaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // 回退
      }
    }
  };

  if (!isOpen) return null;

  const contact = handoffData.humanContact;

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal-card cs-handoff-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="cs-modal-header">
          <div className="cs-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="cs-handoff-badge-icon">
              <Headphones size={18} />
            </div>
            <span>转接人工客服支持</span>
          </div>
          <button
            type="button"
            className="cs-btn cs-btn-secondary cs-btn-icon"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* 主体 */}
        <div className="cs-modal-body">
          {/* 联系渠道信息 */}
          {contact && (
            <div className="cs-handoff-contact-banner">
              <div className="cs-handoff-contact-name">{contact.name || '专业售后服务支持'}</div>
              {contact.workTime && (
                <div className="cs-handoff-contact-time">
                  <Clock size={13} style={{ marginRight: 4 }} />
                  <span>服务时间：{contact.workTime}</span>
                </div>
              )}
              <div className="cs-handoff-contact-btns">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="cs-btn cs-btn-primary cs-btn-sm">
                    <PhoneCall size={14} />
                    <span>立即拨打：{contact.phone}</span>
                  </a>
                )}
                {contact.url && (
                  <a
                    href={contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cs-btn cs-btn-secondary cs-btn-sm"
                  >
                    <ExternalLink size={14} />
                    <span>进入在线客服平台</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 结构化工单预览 */}
          <div className="cs-handoff-ticket-section">
            <div className="cs-handoff-ticket-header">
              <div className="cs-handoff-ticket-title">
                <FileText size={14} className="cs-text-primary" />
                <span>已自动聚合结构化工单摘要（可一键复制）：</span>
              </div>
              <button
                type="button"
                className={`cs-btn cs-btn-sm ${copied ? 'cs-btn-secondary' : 'cs-btn-primary'}`}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check size={13} className="cs-text-success" />
                    <span>已复制工单</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>一键复制摘要</span>
                  </>
                )}
              </button>
            </div>

            <pre className="cs-handoff-ticket-preview">
              <code>{ticketSummaryText}</code>
            </pre>
          </div>

          <div className="cs-handoff-hint">
            <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              提示：将工单摘要发送给人工客服或粘贴至工单系统，售后工程师将能够直接定位您的设备型号与排查进度，避免重复描述。
            </span>
          </div>
        </div>

        {/* 底部 */}
        <div className="cs-modal-footer">
          <button type="button" className="cs-btn cs-btn-secondary" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="cs-btn cs-btn-primary" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? '已成功复制' : '复制工单并关闭'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
