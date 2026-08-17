import React from 'react';
import { Bot, RotateCcw, SlidersHorizontal, PhoneCall, History, Headphones, X } from './icons';
import type { CustomerServicePublicBootstrapResponse, CustomerServiceAudienceEnum } from '../types';
import { AudienceSwitcher } from './AudienceSwitcher';

interface HeaderProps {
  projectName: string;
  humanContact?: CustomerServicePublicBootstrapResponse['project']['humanContact'];
  audience: CustomerServiceAudienceEnum;
  onAudienceChange: (audience: CustomerServiceAudienceEnum) => void;
  onNewConversation: () => void;
  onOpenSessionDrawer: () => void;
  onOpenHumanHandoff?: () => void;
  onToggleProductSelector?: () => void;
  isSidebarOpen?: boolean;
  isWidget?: boolean;
  onCloseWidget?: () => void;
  sessionCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  humanContact,
  audience,
  onAudienceChange,
  onNewConversation,
  onOpenSessionDrawer,
  onOpenHumanHandoff,
  onToggleProductSelector,
  isSidebarOpen,
  isWidget,
  onCloseWidget,
  sessionCount = 0
}) => {
  return (
    <header className="cs-header">
      <div className="cs-header-title">
        <div className="cs-brand-logo" style={{ width: 32, height: 32 }}>
          <Bot size={18} />
        </div>
        <span className="cs-header-title-text">{projectName || '智能产品客服'}</span>
        <span className="cs-online-badge cs-hide-mobile" style={{ marginLeft: 4 }}>
          <span className="cs-online-dot" />
          <span>在线</span>
        </span>
      </div>

      <div className="cs-header-actions">
        {/* 三级受众身份切换器 */}
        <AudienceSwitcher audience={audience} onChange={onAudienceChange} compact={isWidget} />

        {/* 历史会话抽屉入口 */}
        <button
          type="button"
          className="cs-btn cs-btn-secondary cs-btn-sm"
          onClick={onOpenSessionDrawer}
          title="查看历史会话记录"
        >
          <History size={14} />
          <span className="cs-hide-mobile">历史</span>
          {sessionCount > 0 && (
            <span
              style={{
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 10,
                backgroundColor: 'var(--cs-surface-alt)',
                color: 'var(--cs-text-secondary)',
                fontWeight: 600
              }}
            >
              {sessionCount}
            </span>
          )}
        </button>

        {/* 人工工单 / 客服支持 */}
        {onOpenHumanHandoff && (
          <button
            type="button"
            className="cs-btn cs-btn-secondary cs-btn-sm"
            onClick={onOpenHumanHandoff}
            title="转接人工客服与工单摘要"
          >
            <Headphones size={14} />
            <span className="cs-hide-mobile">转人工</span>
          </button>
        )}

        {/* 拨打电话 */}
        {humanContact?.phone && !onOpenHumanHandoff && (
          <a
            href={`tel:${humanContact.phone}`}
            className="cs-btn cs-btn-secondary cs-btn-sm"
            title={`拨打客服电话: ${humanContact.phone}`}
          >
            <PhoneCall size={14} />
            <span className="cs-hide-mobile">{humanContact.phone}</span>
          </a>
        )}

        {/* 侧边栏型号选择切换 */}
        {onToggleProductSelector && (
          <button
            type="button"
            className={`cs-btn cs-btn-secondary cs-btn-sm ${isSidebarOpen ? 'active' : ''}`}
            onClick={onToggleProductSelector}
            title="切换产品型号"
          >
            <SlidersHorizontal size={14} />
            <span className="cs-hide-mobile">型号</span>
          </button>
        )}

        {/* 新建会话 */}
        <button
          type="button"
          className="cs-btn cs-btn-secondary cs-btn-sm"
          onClick={onNewConversation}
          title="开启新会话"
        >
          <RotateCcw size={14} />
          <span className="cs-hide-mobile">新会话</span>
        </button>

        {/* Widget 浮窗关闭按钮 */}
        {isWidget && onCloseWidget && (
          <button
            type="button"
            className="cs-btn cs-btn-secondary cs-btn-icon"
            onClick={onCloseWidget}
            title="关闭浮窗"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
