import React from 'react';
import { Bot, RotateCcw, SlidersHorizontal, PhoneCall, ExternalLink, X } from 'lucide-react';
import type { CustomerServicePublicBootstrapResponse } from '../types';

interface HeaderProps {
  projectName: string;
  humanContact?: CustomerServicePublicBootstrapResponse['project']['humanContact'];
  onNewConversation: () => void;
  onToggleProductSelector?: () => void;
  isSidebarOpen?: boolean;
  isWidget?: boolean;
  onCloseWidget?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  humanContact,
  onNewConversation,
  onToggleProductSelector,
  isSidebarOpen,
  isWidget,
  onCloseWidget
}) => {
  return (
    <header className="cs-header">
      <div className="cs-header-title">
        <div className="cs-brand-logo" style={{ width: 32, height: 32 }}>
          <Bot size={18} />
        </div>
        <span>{projectName || '智能产品客服'}</span>
        <span className="cs-online-badge" style={{ marginLeft: 6 }}>
          <span className="cs-online-dot" />
          <span>在线</span>
        </span>
      </div>

      <div className="cs-header-actions">
        {humanContact?.phone && (
          <a
            href={`tel:${humanContact.phone}`}
            className="cs-btn cs-btn-secondary cs-btn-sm"
            title={`拨打客服电话: ${humanContact.phone}`}
          >
            <PhoneCall size={14} />
            <span className="cs-hide-mobile">{humanContact.phone}</span>
          </a>
        )}

        {humanContact?.url && (
          <a
            href={humanContact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="cs-btn cs-btn-secondary cs-btn-sm"
            title="在线人工客服"
          >
            <ExternalLink size={14} />
            <span className="cs-hide-mobile">转人工</span>
          </a>
        )}

        {onToggleProductSelector && (
          <button
            type="button"
            className={`cs-btn cs-btn-secondary cs-btn-sm ${isSidebarOpen ? 'active' : ''}`}
            onClick={onToggleProductSelector}
            title="切换产品型号"
          >
            <SlidersHorizontal size={14} />
            <span>型号</span>
          </button>
        )}

        <button
          type="button"
          className="cs-btn cs-btn-secondary cs-btn-sm"
          onClick={onNewConversation}
          title="开启新会话"
        >
          <RotateCcw size={14} />
          <span className="cs-hide-mobile">新会话</span>
        </button>

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
