import React, { useState, useMemo } from 'react';
import { Search, Hash, ArrowRight, CornerDownLeft, AlertCircle, ShieldAlert } from './icons';
import type { ErrorCodeItem } from '../types';

export interface ExtendedErrorCodeItem extends ErrorCodeItem {
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isDanger?: boolean;
  categoryLabel?: string;
  quickResolution?: string;
}

export const ERROR_CODES_DATABASE: ExtendedErrorCodeItem[] = [
  // 拍照机专区 (E-01 ~ E-12)
  {
    code: 'E-01',
    name: '打印机相纸卡阻',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'medium',
    quickResolution: '断电打开打印仓前盖，顺着滚轴方向平稳拉出卡纸',
    prompt:
      '设备屏幕报错代码 [E-01]，显示打印机卡纸（相纸卡阻），请给出标准清理卡纸、复位切刀与恢复打印步骤。'
  },
  {
    code: 'E-02',
    name: '相纸/色带耗尽',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'low',
    quickResolution: '更换同规格热升华相纸卷与色带，关闭仓门后复位',
    prompt: '设备报错代码 [E-02]，相纸或色带耗尽，请提供热升华耗材更换与装填校准指南。'
  },
  {
    code: 'E-03',
    name: '裁切刀机械卡阻',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'high',
    isDanger: true,
    quickResolution: '切断电源后清理刀槽碎纸屑，严禁用手直接触碰刀刃',
    prompt: '设备报错代码 [E-03]，相纸裁切刀卡阻或未归位原点，请指导如何安全断电排查并防夹防割伤。'
  },
  {
    code: 'E-05',
    name: '闪光灯/补光失联',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'medium',
    quickResolution: '检查热靴同步线及 12V 补光灯驱动模块接线端子',
    prompt: '设备报错代码 [E-05]，闪光灯/补光控制器通信失联，请提供灯光触发与供电排查指引。'
  },
  {
    code: 'E-08',
    name: '相机通讯连接超时',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'medium',
    quickResolution: '检查相机 USB 数据线及电池假电适配器供电状态',
    prompt: '设备报错代码 [E-08]，微单相机 USB 通信超时或未识别，请指导如何重启相机与检查供电。'
  },
  {
    code: 'E-12',
    name: '触摸屏触控失灵',
    category: 'photo',
    categoryLabel: '拍照机',
    severity: 'low',
    quickResolution: '擦拭屏幕边框防尘条，重新插拔主板触控 USB 接口',
    prompt: '设备报错代码 [E-12]，电容触控屏局部失灵或漂移，请提供屏幕清洁与驱动校准步骤。'
  },

  // 售货机专区 (V-101 ~ V-305)
  {
    code: 'V-101',
    name: '货道电机堵转/卡货',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'medium',
    quickResolution: '检查商品尺寸是否超宽，清除弹簧异物并在后台复位',
    prompt:
      '售货机报错代码 [V-101]，货道电机发生堵转或商品卡在导轨中间，请提供安全清阻与单动测试步骤。'
  },
  {
    code: 'V-102',
    name: '红外掉货传感器异常',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'low',
    quickResolution: '擦拭出货口两侧红外探头灰尘，检查 5V 供电线',
    prompt:
      '售货机报错代码 [V-102]，掉货光电检测探头异常未感应掉落，请指导如何清洁探头与灵敏度校准。'
  },
  {
    code: 'V-201',
    name: '冷藏温控传感器开路',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'medium',
    quickResolution: '检查温控 NTC 探头插头，确认传感器阻值标准',
    prompt: '售货机报错代码 [V-201]，冷藏柜温控传感器开路或超温报警，请提供温控探头排查与测量建议。'
  },
  {
    code: 'V-205',
    name: '压缩机过热/冷媒报警',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'critical',
    isDanger: true,
    quickResolution: '压缩机过载保护跳闸或冷媒泄漏，严禁通电私拆！',
    prompt:
      '售货机报错代码 [V-205]，制冷压缩机高温报警或冷媒压力异常。请提供安全断电与专业售后检修说明。'
  },
  {
    code: 'V-301',
    name: '投币器卡币/拒收',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'low',
    quickResolution: '拆开硬币通道清理变形硬币，使用无水酒精擦拭光电识币头',
    prompt: '售货机报错代码 [V-301]，投币器卡币拒收或无法找零，请提供通道异物清理与识币器保养步骤。'
  },
  {
    code: 'V-305',
    name: '升降机防夹光幕阻挡',
    category: 'vending',
    categoryLabel: '售货机',
    severity: 'high',
    isDanger: true,
    quickResolution: '检查出货防夹光幕是否被卡住商品遮挡，手动复位升降斗',
    prompt:
      '售货机报错代码 [V-305]，升降机防夹光幕阻挡或升降机构卡死，请提供安全断电与机械复位指南。'
  },

  // 通用系统与电气 (ERR-NET, ERR-PWR)
  {
    code: 'ERR-NET',
    name: '4G/以太网通信中断',
    category: 'system',
    categoryLabel: '系统',
    severity: 'medium',
    quickResolution: '检查机身 4G 天线紧固度、SIM 卡资费及路由器 WAN 口',
    prompt: '设备屏幕报错代码 [ERR-NET]，4G/以太网云端连接中断，请指导网络天线、SIM卡与路由器排障。'
  },
  {
    code: 'ERR-PWR',
    name: '强电总成供电异常',
    category: 'system',
    categoryLabel: '电气',
    severity: 'critical',
    isDanger: true,
    quickResolution: '市电电压异常或开关电源保护，切断总电源，禁止通电！',
    prompt:
      '设备屏幕报错代码 [ERR-PWR]，强电总成供电欠压/过流。请提供高压断电安全警示与售后检测 SOP。'
  }
];

interface ErrorCodeQuickSearchProps {
  onSearchErrorCode: (code: string, queryPrompt?: string) => void;
  compact?: boolean;
}

/**
 * 模糊匹配搜索引擎函数：
 * 支持归一化匹配 (E01 -> E-01, V101 -> V-101, ERRNET -> ERR-NET)
 * 支持前缀与关键词模糊匹配 (卡纸, 温控, 电机, 闪光, 网络, 电源)
 */
export const searchErrorCodes = (
  query: string,
  database: ExtendedErrorCodeItem[] = ERROR_CODES_DATABASE
): ExtendedErrorCodeItem[] => {
  const clean = query
    .trim()
    .toUpperCase()
    .replace(/[\s\-_]/g, '');
  if (!clean) return [];

  // 1. 精确归一化代码匹配
  const exact = database.filter((item) => {
    const itemNorm = item.code.toUpperCase().replace(/[\s\-_]/g, '');
    return itemNorm === clean;
  });
  if (exact.length > 0) return exact;

  // 2. 代码前缀包含与关键词模糊匹配
  return database.filter((item) => {
    const itemNorm = item.code.toUpperCase().replace(/[\s\-_]/g, '');
    const nameNorm = item.name.toUpperCase();
    const promptNorm = item.prompt.toUpperCase();
    const resNorm = (item.quickResolution || '').toUpperCase();

    return (
      itemNorm.includes(clean) ||
      nameNorm.includes(clean) ||
      promptNorm.includes(clean) ||
      resNorm.includes(clean)
    );
  });
};

export const ErrorCodeQuickSearch: React.FC<ErrorCodeQuickSearchProps> = ({
  onSearchErrorCode,
  compact = false
}) => {
  const [queryCode, setQueryCode] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // 实时模糊搜索候选列表
  const searchResults = useMemo(() => {
    if (!queryCode.trim()) return [];
    return searchErrorCodes(queryCode);
  }, [queryCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = queryCode.trim().toUpperCase();
    if (!raw) return;

    const matched =
      searchResults.length > 0
        ? searchResults[0]
        : ERROR_CODES_DATABASE.find(
            (item) => item.code.replace(/[\s\-_]/g, '') === raw.replace(/[\s\-_]/g, '')
          );

    const code = matched ? matched.code : raw;
    const prompt = matched
      ? matched.prompt
      : `设备屏幕出现错误代码 [${code}]，请提供该故障代码的标准排查方案、可能的原因与安全注意事项。`;

    onSearchErrorCode(code, prompt);
    setQueryCode('');
    setIsFocused(false);
  };

  const handleSelectCode = (item: ExtendedErrorCodeItem) => {
    onSearchErrorCode(item.code, item.prompt);
    setQueryCode('');
    setIsFocused(false);
  };

  return (
    <div className={`cs-error-search-card ${compact ? 'compact' : ''}`}>
      <div className="cs-error-search-header">
        <div className="cs-error-search-title">
          <Hash size={15} className="cs-text-primary" />
          <span>设备错误代码秒级速查</span>
          <span className="cs-sr-only" style={{ display: 'none' }}>
            错误代码速查小工具
          </span>
        </div>
        <span className="cs-error-search-sub">
          支持 E-01~E-12、V-101~V-305、ERR-NET 等代码与模糊容错检索
        </span>
      </div>

      <div className="cs-error-search-form-wrap">
        <form className="cs-error-search-form" onSubmit={handleSubmit}>
          <div className="cs-error-search-input-wrap">
            <Search size={15} className="cs-error-search-icon" />
            <input
              type="text"
              className="cs-error-search-input"
              value={queryCode}
              onChange={(e) => setQueryCode(e.target.value)}
              onFocus={() => setIsFocused(true)}
              placeholder="输入错误代码或故障词，例如：E-01、V101、卡纸、温控、ERR-NET..."
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

        {/* 实时模糊搜索下拉联想列表 */}
        {isFocused && queryCode.trim() && (
          <div className="cs-error-search-dropdown">
            {searchResults.length > 0 ? (
              <div className="cs-error-dropdown-list">
                {searchResults.map((item) => (
                  <div
                    key={item.code}
                    className="cs-error-dropdown-item"
                    onClick={() => handleSelectCode(item)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cs-error-dropdown-item-left">
                      <strong className="cs-error-dropdown-code">{item.code}</strong>
                      <span className="cs-error-dropdown-name">{item.name}</span>
                      {item.isDanger && (
                        <span className="cs-error-dropdown-danger-tag">
                          <ShieldAlert size={11} />
                          <span>高危</span>
                        </span>
                      )}
                    </div>
                    <span className="cs-error-dropdown-res">{item.quickResolution}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="cs-error-dropdown-empty"
                onClick={handleSubmit}
                role="button"
                tabIndex={0}
              >
                <AlertCircle size={14} className="cs-text-primary" />
                <span>
                  未命中预设代码，点击将以 <strong>[{queryCode.trim().toUpperCase()}]</strong> 发起
                  AI 精准排查
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 常见高频错误代码快速点击标签 */}
      <div className="cs-error-chips-wrap">
        <span className="cs-error-chips-label">常见代码速查：</span>
        <div className="cs-error-chips-list">
          {ERROR_CODES_DATABASE.slice(0, 8).map((item) => (
            <button
              key={item.code}
              type="button"
              className={`cs-error-chip cs-error-chip-${item.category}`}
              onClick={() => handleSelectCode(item)}
              title={`${item.code} - ${item.name} (${item.quickResolution || ''})`}
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
