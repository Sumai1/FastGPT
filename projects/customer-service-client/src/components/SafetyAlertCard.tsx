import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, PhoneCall, Headphones, Check, Zap } from './icons';

interface SafetyAlertCardProps {
  level?: 'danger' | 'warning' | 'critical';
  title?: string;
  message: string;
  prohibitedActions?: string[];
  onContactSupport?: () => void;
  onAcknowledge?: () => void;
  phone?: string;
}

export const SafetyAlertCard: React.FC<SafetyAlertCardProps> = ({
  level = 'danger',
  title = '阻断级高危安全警示',
  message,
  prohibitedActions = [
    '严禁在未完全切断市电总电源的情况下打开设备后盖或机箱',
    '严禁触碰高压开关电源、逆变器、电容组及压缩机接线柱',
    '非专业持证售后维修人员切勿私自使用万用表测量高压强电回路'
  ],
  onContactSupport,
  onAcknowledge,
  phone
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const handleAcknowledge = () => {
    setAcknowledged(true);
    onAcknowledge?.();
  };

  return (
    <div className={`cs-safety-alert-card cs-safety-level-${level}`}>
      {/* 顶部醒目警示标题栏 */}
      <div className="cs-safety-alert-header">
        <div className="cs-safety-alert-badge-wrap">
          <div className="cs-safety-hazard-pulsing-dot" />
          <ShieldAlert size={18} className="cs-safety-shield-icon" />
          <span className="cs-safety-alert-title">{title}</span>
        </div>
        <span className="cs-safety-hazard-tag">
          <Zap size={12} />
          <span>高压 / 拆机危险</span>
        </span>
      </div>

      {/* 核心警示正文 */}
      <div className="cs-safety-alert-body">
        <div className="cs-safety-alert-message">{message}</div>

        {/* 禁止违规操作清单 */}
        {prohibitedActions && prohibitedActions.length > 0 && (
          <div className="cs-safety-prohibited-box">
            <div className="cs-safety-prohibited-title">
              <AlertTriangle size={14} />
              <span>严禁执行以下高危动作：</span>
            </div>
            <ul className="cs-safety-prohibited-list">
              {prohibitedActions.map((action, idx) => (
                <li key={idx} className="cs-safety-prohibited-item">
                  <span className="cs-safety-cross-icon">✕</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 底部操作与直连售后 */}
      <div className="cs-safety-alert-footer">
        <div className="cs-safety-actions-left">
          {!acknowledged ? (
            <button type="button" className="cs-safety-ack-btn" onClick={handleAcknowledge}>
              <Check size={13} />
              <span>我已切断电源并已知悉安全风险</span>
            </button>
          ) : (
            <span className="cs-safety-ack-done">
              <Check size={13} />
              <span>已确认安全风险须知</span>
            </span>
          )}
        </div>

        <div className="cs-safety-actions-right">
          {phone && (
            <a href={`tel:${phone}`} className="cs-btn cs-btn-sm cs-btn-danger">
              <PhoneCall size={13} />
              <span>拨打售后电话 ({phone})</span>
            </a>
          )}
          {onContactSupport && (
            <button
              type="button"
              className="cs-btn cs-btn-sm cs-btn-primary"
              onClick={onContactSupport}
            >
              <Headphones size={13} />
              <span>一键转接人工售后</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
