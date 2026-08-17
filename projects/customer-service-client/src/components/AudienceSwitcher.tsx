import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Store,
  Wrench,
  ChevronDown,
  Check,
  ShieldAlert,
  Info,
  type LucideIcon
} from './icons';
import { CustomerServiceAudienceEnum } from '../types';

interface AudienceSwitcherProps {
  audience: CustomerServiceAudienceEnum;
  onChange: (audience: CustomerServiceAudienceEnum) => void;
  disabled?: boolean;
  compact?: boolean;
}

interface AudienceOption {
  key: CustomerServiceAudienceEnum;
  label: string;
  subLabel: string;
  badge: string;
  icon: LucideIcon;
  description: string;
  scopeNote: string;
  colorClass: string;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  {
    key: CustomerServiceAudienceEnum.public,
    label: '普通客户',
    subLabel: '终端用户',
    badge: '客户',
    icon: User,
    description: '终端设备使用者，仅展示安全操作与常见咨询',
    scopeNote: '仅展示终端用户安全操作指南与常见问题解答，隐藏工程级拆机与核心代码。',
    colorClass: 'public'
  },
  {
    key: CustomerServiceAudienceEnum.dealer,
    label: '运营商 / 经销商',
    subLabel: '商户运维',
    badge: '运营',
    icon: Store,
    description: '商户与运营人员，包含常规补货与设备维护',
    scopeNote: '已解锁商户日常巡检、补货、卡纸卡币清障与常用运维排查手册。',
    colorClass: 'dealer'
  },
  {
    key: CustomerServiceAudienceEnum.internal,
    label: '内部售后技术',
    subLabel: '工程维修',
    badge: '售后',
    icon: Wrench,
    description: '专业工程售后人员，全量错误码与电路拆修手册',
    scopeNote: '已解锁深度工程排查、全量错误代码速查、电路拓扑与售后维修手册。',
    colorClass: 'internal'
  }
];

export const AudienceSwitcher: React.FC<AudienceSwitcherProps> = ({
  audience,
  onChange,
  disabled = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentOption = AUDIENCE_OPTIONS.find((opt) => opt.key === audience) || AUDIENCE_OPTIONS[0];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowTooltip(false);
      }
    };
    if (isOpen || showTooltip) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, showTooltip]);

  const handleSelect = (key: CustomerServiceAudienceEnum) => {
    onChange(key);
    setIsOpen(false);
  };

  const IconComponent = currentOption.icon;

  return (
    <div className="cs-audience-switcher-root" ref={containerRef}>
      {/* 触发按钮 */}
      <div className="cs-audience-trigger-group">
        <button
          type="button"
          className={`cs-audience-btn cs-audience-${currentOption.colorClass} ${
            isOpen ? 'active' : ''
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          title={`当前身份：${currentOption.label}`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="cs-audience-icon">
            <IconComponent size={14} />
          </span>
          <span className="cs-audience-text">
            {compact ? currentOption.badge : currentOption.label}
          </span>
          <ChevronDown size={13} className={`cs-audience-chevron ${isOpen ? 'rotated' : ''}`} />
        </button>

        {/* 权限说明气泡触发器 */}
        <button
          type="button"
          className="cs-audience-info-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }}
          title="查看当前受众可见权限说明"
          aria-label="受众权限说明"
        >
          <Info size={13} />
        </button>
      </div>

      {/* 权限提示气泡 (Tooltip) */}
      {showTooltip && (
        <div className="cs-audience-tooltip">
          <div className="cs-audience-tooltip-header">
            <ShieldAlert size={14} className="cs-text-primary" />
            <span>【{currentOption.label}】权限范围</span>
          </div>
          <div className="cs-audience-tooltip-body">{currentOption.scopeNote}</div>
          <div className="cs-audience-tooltip-hint">
            提示：不同身份将检索匹配相应安全深度的知识库
          </div>
        </div>
      )}

      {/* 下拉选择浮层 */}
      {isOpen && (
        <div className="cs-audience-dropdown" role="listbox">
          <div className="cs-audience-dropdown-header">
            <span>切换咨询身份与权限</span>
            <span className="cs-audience-badge-sub">三级知识可见体系</span>
          </div>

          <div className="cs-audience-options-list">
            {AUDIENCE_OPTIONS.map((opt) => {
              const isSelected = opt.key === audience;
              const OptIcon = opt.icon;
              return (
                <div
                  key={opt.key}
                  role="option"
                  aria-selected={isSelected}
                  className={`cs-audience-option-item cs-audience-${opt.colorClass} ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => handleSelect(opt.key)}
                >
                  <div className="cs-audience-option-icon">
                    <OptIcon size={16} />
                  </div>
                  <div className="cs-audience-option-content">
                    <div className="cs-audience-option-title-row">
                      <span className="cs-audience-option-title">{opt.label}</span>
                      <span className="cs-audience-tag">{opt.subLabel}</span>
                    </div>
                    <div className="cs-audience-option-desc">{opt.description}</div>
                  </div>
                  {isSelected && (
                    <div className="cs-audience-option-check">
                      <Check size={15} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
