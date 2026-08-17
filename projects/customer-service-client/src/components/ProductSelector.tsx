import React, { useMemo } from 'react';
import { Bot, Layers, Cpu, Code2, Headphones, PhoneCall, ExternalLink, Clock } from './icons';
import type {
  CustomerServicePublicBootstrapResponse,
  CustomerServicePublicProductCatalogResponse,
  ProductSelection
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
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  catalog,
  selection,
  onSelectProduct,
  humanContact,
  hasActiveMessages
}) => {
  // 可选系列列表
  const seriesList = useMemo(() => catalog?.series ?? [], [catalog]);

  // 根据当前系列筛选可用型号
  const filteredModels = useMemo(() => {
    if (!catalog?.models) return [];
    if (!selection.seriesCode) return catalog.models;
    return catalog.models.filter((m) => m.seriesCode === selection.seriesCode);
  }, [catalog, selection.seriesCode]);

  // 根据当前型号筛选软硬件版本
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

  /** 切换前提示用户确认清理旧会话，避免型号上下文混淆 */
  const checkSwitchAllowed = (): boolean => {
    if (!hasActiveMessages) return true;
    if (typeof window !== 'undefined') {
      return window.confirm('切换产品型号将重置当前会话记录，是否继续？');
    }
    return true;
  };

  const handleSeriesChange = (seriesCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      seriesCode,
      modelCode: '',
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
  };

  const handleModelChange = (modelCode: string) => {
    if (!checkSwitchAllowed()) return;
    const model = catalog?.models.find((m) => m.modelCode === modelCode);
    onSelectProduct({
      seriesCode: model ? model.seriesCode : selection.seriesCode,
      modelCode,
      hardwareVersionCode: '',
      softwareVersionCode: ''
    });
  };

  const handleHardwareChange = (hardwareVersionCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      ...selection,
      hardwareVersionCode
    });
  };

  const handleSoftwareChange = (softwareVersionCode: string) => {
    if (!checkSwitchAllowed()) return;
    onSelectProduct({
      ...selection,
      softwareVersionCode
    });
  };

  return (
    <div className="cs-sidebar-body">
      {/* 系列选择 */}
      {seriesList.length > 0 && (
        <div className="cs-form-group">
          <label className="cs-form-label" htmlFor="cs-select-series">
            <Layers
              size={14}
              style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
            />
            产品系列
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

      {/* 型号选择 */}
      <div className="cs-form-group">
        <label className="cs-form-label" htmlFor="cs-select-model">
          <Bot
            size={14}
            style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
          />
          设备型号
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

      {/* 硬件版本 */}
      {hardwareVersions.length > 0 && (
        <div className="cs-form-group">
          <label className="cs-form-label" htmlFor="cs-select-hw">
            <Cpu
              size={14}
              style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
            />
            硬件版本
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

      {/* 软件版本 */}
      {softwareVersions.length > 0 && (
        <div className="cs-form-group">
          <label className="cs-form-label" htmlFor="cs-select-sw">
            <Code2
              size={14}
              style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }}
            />
            固件/软件版本
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

      {/* 人工客服联系卡片 */}
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
