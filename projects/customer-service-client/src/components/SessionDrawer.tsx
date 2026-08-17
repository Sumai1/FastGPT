import React from 'react';
import { X, Plus, Trash2, Download, Copy, MessageSquare } from './icons';
import type { SessionSummary } from '../types';

interface SessionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: SessionSummary[];
  currentSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAllSessions: () => void;
  onExportMarkdown: () => void;
  onCopyAllText: () => void;
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onClearAllSessions,
  onExportMarkdown,
  onCopyAllText
}) => {
  // 按时间分组：今天、最近7天、更早
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const today: SessionSummary[] = [];
  const recentWeek: SessionSummary[] = [];
  const earlier: SessionSummary[] = [];

  const baseTime = sessions[0]?.updatedAt || sessions[0]?.createdAt || 0;
  for (const session of sessions) {
    const sessionTime = session.updatedAt || session.createdAt || 0;
    const diff = baseTime > 0 && sessionTime > 0 ? baseTime - sessionTime : 0;
    if (diff < oneDay) {
      today.push(session);
    } else if (diff < sevenDays) {
      recentWeek.push(session);
    } else {
      earlier.push(session);
    }
  }

  const groupedSessions = [
    { label: '今天 / 最近', list: today },
    { label: '最近 7 天', list: recentWeek },
    { label: '更早之前', list: earlier }
  ].filter((g) => g.list.length > 0);

  if (!isOpen) return null;

  return (
    <div className="cs-drawer-overlay" onClick={onClose}>
      <aside className="cs-drawer-card" onClick={(e) => e.stopPropagation()}>
        {/* 抽屉头部 */}
        <div className="cs-drawer-header">
          <div className="cs-drawer-title">
            <MessageSquare size={16} className="cs-text-primary" />
            <span>历史会话与回放</span>
            <span className="cs-drawer-count-badge">{sessions.length}</span>
          </div>

          <div className="cs-drawer-header-actions">
            <button
              type="button"
              className="cs-btn cs-btn-primary cs-btn-sm"
              onClick={() => {
                onNewSession();
                onClose();
              }}
              title="开启新会话"
            >
              <Plus size={14} />
              <span>新建对话</span>
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-icon"
              onClick={onClose}
              title="关闭抽屉"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 抽屉主体：会话列表 */}
        <div className="cs-drawer-body">
          {sessions.length === 0 ? (
            <div className="cs-drawer-empty">
              <MessageSquare size={36} className="cs-drawer-empty-icon" />
              <div className="cs-drawer-empty-title">暂无历史会话</div>
              <div className="cs-drawer-empty-desc">
                当您与智能客服进行沟通后，会话记录将自动保存在这里。
              </div>
              <button
                type="button"
                className="cs-btn cs-btn-primary cs-btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => {
                  onNewSession();
                  onClose();
                }}
              >
                <Plus size={14} />
                <span>立即开始新咨询</span>
              </button>
            </div>
          ) : (
            <div className="cs-drawer-groups">
              {groupedSessions.map((group) => (
                <div key={group.label} className="cs-drawer-group-section">
                  <div className="cs-drawer-group-label">{group.label}</div>
                  <div className="cs-drawer-group-list">
                    {group.list.map((item) => {
                      const isActive = item.id === currentSessionId;
                      const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleTimeString(
                        'zh-CN',
                        { hour: '2-digit', minute: '2-digit' }
                      );

                      return (
                        <div
                          key={item.id}
                          className={`cs-drawer-session-item ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            onSelectSession(item.id);
                            onClose();
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="cs-drawer-session-main">
                            <div className="cs-drawer-session-title-row">
                              <span className="cs-drawer-session-title">{item.title}</span>
                              <span className="cs-drawer-session-time">{dateStr}</span>
                            </div>
                            <div className="cs-drawer-session-preview">{item.preview}</div>
                            {item.selection?.modelCode && (
                              <div className="cs-drawer-session-model-tag">
                                <span>型号: {item.selection.modelCode}</span>
                              </div>
                            )}
                          </div>

                          <div className="cs-drawer-session-actions">
                            <button
                              type="button"
                              className="cs-drawer-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('确定删除该会话记录吗？')) {
                                  onDeleteSession(item.id);
                                }
                              }}
                              title="删除会话"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 抽屉底部工具栏 */}
        <div className="cs-drawer-footer">
          <div className="cs-drawer-footer-actions">
            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-sm"
              onClick={onExportMarkdown}
              title="导出当前会话为 Markdown 文件"
            >
              <Download size={13} />
              <span>导出 Markdown</span>
            </button>
            <button
              type="button"
              className="cs-btn cs-btn-secondary cs-btn-sm"
              onClick={onCopyAllText}
              title="复制当前会话全量文本"
            >
              <Copy size={13} />
              <span>复制全文</span>
            </button>
          </div>

          {sessions.length > 0 && (
            <button
              type="button"
              className="cs-drawer-clear-btn"
              onClick={() => {
                if (window.confirm('确定要清空全部历史会话吗？此操作无法撤销。')) {
                  onClearAllSessions();
                }
              }}
              title="清空所有记录"
            >
              <Trash2 size={12} />
              <span>清空历史</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
