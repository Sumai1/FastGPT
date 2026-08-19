import React, { useMemo, useState } from 'react';
import {
  Bot,
  Layers,
  Cpu,
  Code2,
  Headphones,
  PhoneCall,
  ExternalLink,
  Clock,
  Sparkles,
  RotateCcw,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from './icons';
import type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicProductCatalogResponse,
  ProductSelection,
  SessionSummary
} from '../types';
import { CustomerServiceVersionTypeEnum } from '../types';

interface ProductSelectorProps {
  catalog?: CustomerServicePublicProductCatalogResponse;
  selection: ProductSelection;
  onSelectProduct: (selection: ProductSelection) => void;
  humanContact?: CustomerServicePublicBootstrapResponse['project']['humanContact'];
  projectName?: string;
  onNewConversation?: () => void;
  hasActiveMessages?: boolean;
  sessions?: SessionSummary[];
  currentSessionId?: string;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onClearAllSessions?: () => void;
  defaultExpanded?: boolean;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  catalog,
  selection,
  onSelectProduct,
  humanContact,
  onNewConversation,
  hasActiveMessages,
  sessions = [],
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onClearAllSessions,
  defaultExpanded = false
}) => {
  const [isDeviceConfigOpen, setIsDeviceConfigOpen] = useState(defaultExpanded);

  // 1. 可选大类列表 (Tier 1)
  const categoryList = useMemo(() => catalog?.categories ?? [], [catalog]);

  // 2. 根据当前大类筛选可用系列 (Tier 2)
  const seriesList = useMemo(() => {
    if (!catalog?.series) return [];
    if (!selection.categoryCode) return catalog.series;
    return catalog.series.filter((s) => s.categoryCode === selection.categoryCode);
  }, [catalog, selection.categoryCode]);

  // 3. 根据当前系列与大类筛选可用型号 (Tier 3)
  const filteredModels = useMemo(() => {
    if (!catalog?.models) return [];
    if (selection.seriesCode && !selection.modelCode) {
      return catalog.models.filter((m) => m.seriesCode === selection.seriesCode);
    }
    if (selection.categoryCode && !selection.modelCode) {
      return catalog.models.filter(
        (m) => !m.categoryCode || m.categoryCode === selection.categoryCode
      );
    }
    return catalog.models;
  }, [catalog, selection.categoryCode, selection.seriesCode, selection.modelCode]);

  // 4. 根据当前型号筛选软硬件版本 (Tier 4)
  const modelVersions = useMemo(() => {
    if (!catalog?.versions || !selection.modelCode) return [];
    return catalog.versions.filter((v) => v.modelCode === selection.modelCode);
  }, [catalog, selection.modelCode]);

  const hardwareVersions = useMemo(
    () => modelVersions.filter((v) => v.type === CustomerServiceVersionTypeEnum.hardware),
    [modelVersions]
  );

  const softwareVersions = useMemo(
    () => modelVersions.filter((v) => v.type === CustomerServiceVersionTypeEnum.software),
    [modelVersions]
  );

  // 计算当前选中的设备/系列/大类显示文案
  const currentCategory = useMemo(
    () => catalog?.categories?.find((c) => c.code === selection.categoryCode),
    [catalog, selection.categoryCode]
  );
  const currentSeries = useMemo(
    () => catalog?.series?.find((s) => s.code === selection.seriesCode),
    [catalog, selection.seriesCode]
  );
  const currentModel = useMemo(
    () => catalog?.models?.find((m) => m.modelCode === selection.modelCode),
    [catalog, selection.modelCode]
  );

  const selectedDeviceSummary = useMemo(() => {
    if (currentModel) {
      return `${currentModel.name} (${currentModel.modelCode})`;
    }
    if (selection.modelCode) {
      return selection.modelCode;
    }
    if (currentSeries) {
      return currentSeries.name;
    }
    if (currentCategory) {
      return currentCategory.name;
    }
    return '全部设备型号';
  }, [currentModel, selection.modelCode, currentSeries, currentCategory]);

  const hasDeviceFilter = Boolean(
    selection.categoryCode ||
    selection.seriesCode ||
    selection.modelCode ||
    selection.hardwareVersionCode ||
    selection.softwareVersionCode
  );

  /** 切换前提示用户确认清理旧会话，避免型号上下文混淆 */
  const checkSwitchAllowed = (): boolean => {
    if (!hasActiveMessages) return true;
    if (typeof window !== 'undefined') {
      return window.confirm('切换产品型号将重置当前会话记录，是否继续？');
    }
    return true;
  };

  /** 处理产品大类变更 (Tier 1) */
  const handleCategoryChange = (categoryCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      categoryCode: categoryCode || undefined,
      seriesCode: '',
      modelCode: '',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
    if (hasActiveMessages) {
      onNewConversation?.();
    }
  };

  /** 处理产品系列变更 (Tier 2) */
  const handleSeriesChange = (seriesCode: string) => {
    if (!checkSwitchAllowed()) return;
    const seriesItem = catalog?.series.find((s) => s.code === seriesCode);
    onSelectProduct({
      ...(selection.categoryCode
        ? { categoryCode: seriesItem ? seriesItem.categoryCode : selection.categoryCode }
        : {}),
      seriesCode,
      modelCode: '',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
    if (hasActiveMessages) {
      onNewConversation?.();
    }
  };

  /** 处理产品型号变更 (Tier 3) */
  const handleModelChange = (modelCode: string) => {
    if (!checkSwitchAllowed()) return;
    const model = catalog?.models.find((m) => m.modelCode === modelCode);
    onSelectProduct({
      ...(selection.categoryCode
        ? { categoryCode: model?.categoryCode || selection.categoryCode }
        : {}),
      seriesCode: model ? model.seriesCode : selection.seriesCode,
      modelCode,
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
    if (hasActiveMessages) {
      onNewConversation?.();
    }
  };

  /** 处理硬件版本变更 (Tier 4) */
  const handleHardwareChange = (hardwareVersionCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      ...selection,
      hardwareVersionCode
    });
  };

  /** 处理软件版本变更 (Tier 4) */
  const handleSoftwareChange = (softwareVersionCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      ...selection,
      softwareVersionCode
    });
  };

  /** 重置全部选择 */
  const handleResetSelection = () => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      categoryCode: undefined,
      seriesCode: '',
      modelCode: '',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
  };

  // 历史会话分组：今天、最近7天、更早
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;
  const todaySessions: SessionSummary[] = [];
  const recentSessions: SessionSummary[] = [];
  const earlierSessions: SessionSummary[] = [];

  const baseTime = sessions[0]?.updatedAt || sessions[0]?.createdAt || 0;
  for (const session of sessions) {
    const sessionTime = session.updatedAt || session.createdAt || 0;
    const diff = baseTime > 0 && sessionTime > 0 ? baseTime - sessionTime : 0;
    if (diff < oneDay) {
      todaySessions.push(session);
    } else if (diff < sevenDays) {
      recentSessions.push(session);
    } else {
      earlierSessions.push(session);
    }
  }

  const groupedSessions = [
    { label: '今天', list: todaySessions },
    { label: '最近 7 天', list: recentSessions },
    { label: '更早', list: earlierSessions }
  ].filter((g) => g.list.length > 0);

  return (
    <div className="cs-sidebar-body">
      {/* 1. 顶部收敛极简设备型号选择胶囊 */}
      <div className="cs-sidebar-device-section">
        <div
          className={`cs-device-capsule-btn ${hasDeviceFilter ? 'active' : ''}`}
          onClick={() => setIsDeviceConfigOpen(!isDeviceConfigOpen)}
          role="button"
          tabIndex={0}
          title={hasDeviceFilter ? `当前设备: ${selectedDeviceSummary}` : '选择设备型号'}
          aria-label={hasDeviceFilter ? `当前设备: ${selectedDeviceSummary}` : '选择设备型号'}
        >
          <div className="cs-device-capsule-left">
            <Cpu size={14} className="cs-device-capsule-icon" />
            <div className="cs-device-capsule-info">
              <span className="cs-device-capsule-prefix">
                {hasDeviceFilter ? '当前设备:' : '设备型号:'}
              </span>
              <span className="cs-device-capsule-name">{selectedDeviceSummary}</span>
            </div>
          </div>
          <div className="cs-device-capsule-right">
            {hasDeviceFilter && (
              <button
                type="button"
                className="cs-sidebar-reset-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetSelection();
                }}
                title="重置机型选择"
              >
                <RotateCcw size={11} />
                <span>重置</span>
              </button>
            )}
            {isDeviceConfigOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </div>

        {/* 点击展开轻量级选择面板 (Popover / Slide Card) */}
        {isDeviceConfigOpen && (
          <div className="cs-device-popover-card">
            <div className="cs-device-popover-header">
              <span className="cs-device-popover-title">设备型号筛选与配置</span>
              <button
                type="button"
                className="cs-device-popover-close-btn"
                onClick={() => setIsDeviceConfigOpen(false)}
                title="收起筛选面板"
              >
                完成
              </button>
            </div>

            <div className="cs-sidebar-device-form">
              {/* Tier 1: 产品大类 */}
              {categoryList.length > 0 && (
                <div className="cs-form-group">
                  <label className="cs-form-label" htmlFor="cs-select-category">
                    <span className="cs-tier-tag">1级</span>
                    <span>产品大类 (Category)</span>
                  </label>
                  <select
                    id="cs-select-category"
                    className="cs-select"
                    value={selection.categoryCode || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                  >
                    <option value="">全部产品大类（拍照机 / 售货机）</option>
                    {categoryList.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tier 2: 产品系列 */}
              {(seriesList.length > 0 || categoryList.length === 0) && (
                <div className="cs-form-group">
                  <label className="cs-form-label" htmlFor="cs-select-series">
                    <span className="cs-tier-tag">2级</span>
                    <Layers
                      size={13}
                      style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
                    />
                    <span>产品系列 (Series)</span>
                  </label>
                  <select
                    id="cs-select-series"
                    className="cs-select"
                    value={selection.seriesCode}
                    onChange={(e) => handleSeriesChange(e.target.value)}
                  >
                    <option value="">全部产品系列</option>
                    {seriesList.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.name} ({item.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tier 3: 设备型号 */}
              <div className="cs-form-group">
                <label className="cs-form-label" htmlFor="cs-select-model">
                  <span className="cs-tier-tag">3级</span>
                  <Bot
                    size={13}
                    style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
                  />
                  <span>设备型号 (Model)</span>
                </label>
                <select
                  id="cs-select-model"
                  className="cs-select"
                  value={selection.modelCode}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  <option value="">请选择产品型号（可选）</option>
                  {filteredModels.map((item) => (
                    <option key={item.modelCode} value={item.modelCode}>
                      {item.name} ({item.modelCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tier 4: 硬件版本 */}
              {hardwareVersions.length > 0 && (
                <div className="cs-form-group">
                  <label className="cs-form-label" htmlFor="cs-select-hw">
                    <span className="cs-tier-tag">4级</span>
                    <Cpu
                      size={13}
                      style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
                    />
                    <span>硬件版本 (HW Version)</span>
                  </label>
                  <select
                    id="cs-select-hw"
                    className="cs-select"
                    value={selection.hardwareVersionCode}
                    onChange={(e) => handleHardwareChange(e.target.value)}
                  >
                    <option value="">全部硬件版本</option>
                    {hardwareVersions.map((item) => (
                      <option key={item.versionCode} value={item.versionCode}>
                        {item.name} ({item.versionCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tier 4: 软件/固件版本 */}
              {softwareVersions.length > 0 && (
                <div className="cs-form-group">
                  <label className="cs-form-label" htmlFor="cs-select-sw">
                    <span className="cs-tier-tag">4级</span>
                    <Code2
                      size={13}
                      style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
                    />
                    <span>固件/软件版本 (SW Version)</span>
                  </label>
                  <select
                    id="cs-select-sw"
                    className="cs-select"
                    value={selection.softwareVersionCode}
                    onChange={(e) => handleSoftwareChange(e.target.value)}
                  >
                    <option value="">全部软件版本</option>
                    {softwareVersions.map((item) => (
                      <option key={item.versionCode} value={item.versionCode}>
                        {item.name} ({item.versionCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. FastGPT 原生风格: 新建对话全宽胶囊按钮与清空图标 */}
      <div className="cs-sidebar-menu-row">
        <button type="button" className="cs-btn-new-chat" onClick={() => onNewConversation?.()}>
          <Plus size={16} />
          <span>新建对话</span>
        </button>
        {sessions.length > 0 && onClearAllSessions && (
          <button
            type="button"
            className="cs-btn-clear-history"
            onClick={() => {
              if (window.confirm('确认清空所有历史对话记录吗？')) {
                onClearAllSessions();
              }
            }}
            title="清空全部历史记录"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* 3. 历史对话记录列表 (侧边栏主体 100% 空间) */}
      <div className="cs-sidebar-history-section">
        <div className="cs-sidebar-history-header">
          <span>历史会话</span>
          <span className="cs-history-count-tag">{sessions.length}</span>
        </div>

        {sessions.length === 0 ? (
          <div className="cs-history-empty-hint">暂无历史对话记录</div>
        ) : (
          <div className="cs-history-list">
            {groupedSessions.map((group, gIdx) => (
              <div key={gIdx} className="cs-history-group">
                <div className="cs-history-group-label">{group.label}</div>
                {group.list.map((sess) => {
                  const isActive = sess.id === currentSessionId;
                  return (
                    <div
                      key={sess.id}
                      className={`cs-history-item ${isActive ? 'active' : ''}`}
                      onClick={() => onSelectSession?.(sess.id)}
                    >
                      <MessageSquare size={13} className="cs-history-item-icon" />
                      <div className="cs-history-item-text">
                        <span className="cs-history-item-title">{sess.title}</span>
                      </div>
                      {onDeleteSession && (
                        <button
                          type="button"
                          className="cs-history-item-del-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSession(sess.id);
                          }}
                          title="删除会话"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. 底部极简人工客服热线与在线指示 */}
      {humanContact && (
        <div className="cs-human-contact-card">
          <div className="cs-human-contact-title">
            <Headphones size={15} />
            <span>{humanContact.name || '人工支持'}</span>
          </div>

          {humanContact.workTime && (
            <div className="cs-human-contact-time">
              <Clock
                size={12}
                style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}
              />
              服务时间：{humanContact.workTime}
            </div>
          )}

          <div className="cs-human-contact-actions">
            {humanContact.phone && (
              <a
                href={`tel:${humanContact.phone}`}
                className="cs-contact-btn cs-contact-btn-primary"
              >
                <PhoneCall size={13} />
                <span>{humanContact.phone}</span>
              </a>
            )}

            {humanContact.url && (
              <a
                href={humanContact.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cs-contact-btn cs-contact-btn-outline"
              >
                <ExternalLink size={13} />
                <span>转人工服务</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
