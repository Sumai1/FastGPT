import React, { useState } from 'react';
import { Search, Hash, ArrowRight, CornerDownLeft } from './icons';
import type { ErrorCodeItem } from '../types';

interface ErrorCodeQuickSearchProps {
  onSearchErrorCode: (code: string, queryPrompt?: string) => void;
  compact?: boolean;
}

const COMMON_ERROR_CODES: ErrorCodeItem[] = [
  {
    code: 'E-01',
    name: '打印机卡纸',
    category: 'photo',
    prompt: '设备屏幕报错代码 [E-01]，显示打印机卡纸，请给出标准清理卡纸与复位步骤。'
  },
  {
    code: 'E-02',
    name: '相纸耗尽',
    category: 'photo',
    prompt: '设备报错代码 [E-02]，相纸或色带耗尽，请提供耗材更换与装填指南。'
  },
  {
    code: 'E-03',
    name: '裁切刀卡阻',
    category: 'photo',
    prompt: '设备报错代码 [E-03]，相纸裁切刀卡阻或未归位，请指导如何安全断电排查。'
  },
  {
    code: 'E-05',
    name: '闪光灯失联',
    category: 'photo',
    prompt: '设备报错代码 [E-05]，闪光灯/补光控制器通信失联，请提供排查指引。'
  },
  {
    code: 'V-101',
    name: '货道电机堵转',
    category: 'vending',
    prompt: '售货机报错代码 [V-101]，货道电机堵转或卡货，请提供安全清阻与测试步骤。'
  },
  {
    code: 'V-102',
    name: '掉货光电异常',
    category: 'vending',
    prompt: '售货机报错代码 [V-102]，红外掉货传感器未检测到掉落，请指导如何清洁探头与校准。'
  },
  {
    code: 'V-201',
    name: '温控传感器故障',
    category: 'vending',
    prompt: '售货机报错代码 [V-201]，冷藏温控传感器开路或超温报警，请提供排查建议。'
  },
  {
    code: 'ERR-NET',
    name: '网络通信中断',
    category: 'system',
    prompt: '设备屏幕报错代码 [ERR-NET]，4G/以太网网络连接中断，请指导网络模块排障。'
  }
];

export const ErrorCodeQuickSearch: React.FC<ErrorCodeQuickSearchProps> = ({
  onSearchErrorCode,
  compact = false
}) => {
  const [queryCode, setQueryCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = queryCode.trim().toUpperCase();
    if (!code) return;

    const matched = COMMON_ERROR_CODES.find((item) => item.code.toUpperCase() === code);
    const prompt = matched
      ? matched.prompt
      : `设备屏幕出现错误代码 [${code}]，请提供该故障代码的标准排查方案、可能的原因与安全注意事项。`;

    onSearchErrorCode(code, prompt);
    setQueryCode('');
  };

  const handleChipClick = (item: ErrorCodeItem) => {
    onSearchErrorCode(item.code, item.prompt);
  };

  return (
    <div className={`cs-error-search-card ${compact ? 'compact' : ''}`}>
      <div className="cs-error-search-header">
        <div className="cs-error-search-title">
          <Hash size={14} className="cs-text-primary" />
          <span>错误代码速查小工具</span>
        </div>
        <span className="cs-error-search-sub">
          输入设备屏幕报错代码（如 E-01 / V-101）秒级调取排障方案
        </span>
      </div>

      <form className="cs-error-search-form" onSubmit={handleSubmit}>
        <div className="cs-error-search-input-wrap">
          <Search size={15} className="cs-error-search-icon" />
          <input
            type="text"
            className="cs-error-search-input"
            value={queryCode}
            onChange={(e) => setQueryCode(e.target.value)}
            placeholder="输入错误代码，例如：E-01、V-102、ERR-NET..."
            aria-label="输入设备错误代码"
          />
          {queryCode.trim() && (
            <button type="submit" className="cs-error-search-submit-btn" title="立即查询">
              <span>查询</span>
              <CornerDownLeft size={13} />
            </button>
          )}
        </div>
      </form>

      {/* 常见错误代码快速点击标签 */}
      <div className="cs-error-chips-wrap">
        <span className="cs-error-chips-label">常见代码：</span>
        <div className="cs-error-chips-list">
          {COMMON_ERROR_CODES.map((item) => (
            <button
              key={item.code}
              type="button"
              className={`cs-error-chip cs-error-chip-${item.category}`}
              onClick={() => handleChipClick(item)}
              title={item.name}
            >
              <strong className="cs-error-chip-code">{item.code}</strong>
              <span className="cs-error-chip-name">{item.name}</span>
              <ArrowRight size={11} className="cs-error-chip-arrow" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
