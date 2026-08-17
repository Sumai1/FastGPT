import React, { useState } from 'react';
import {
  Camera,
  ShoppingBag,
  FileText,
  Monitor,
  Printer,
  Zap,
  QrCode,
  Package,
  CreditCard,
  AlertTriangle,
  Coins,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ThermometerSnowflake
} from './icons';
import type { DiagnosticItem } from '../types';

interface DiagnosticGuideTreeProps {
  onSelectGuide: (prompt: string, categoryLabel?: string) => void;
  defaultExpanded?: boolean;
}

const DIAGNOSTIC_DATA: DiagnosticItem[] = [
  // 拍照机专区
  {
    id: 'photo-paper-jam',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '卡纸 / 卡相片',
    desc: '相纸卡在出片口、裁切刀处或滚轮卷入',
    prompt: '自助拍照机出现相纸卡在出片口或切刀处卡阻，请给出标准排查与清卡纸步骤。',
    iconName: 'FileText',
    badge: '高频'
  },
  {
    id: 'photo-screen-black',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '黑屏 / 触摸无反应',
    desc: '屏幕黑屏、无信号输入或触控失灵',
    prompt: '自助拍照机屏幕出现黑屏、无显示信号或触控按键无响应，请指导如何排查供电与信号线。',
    iconName: 'Monitor'
  },
  {
    id: 'photo-print-error',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '不打印 / 打印白片',
    desc: '打印机亮红灯、无动作或吐出空白纸',
    prompt: '拍照机程序提示打印异常、打印机亮红灯或吐出空白相纸，请提供排查方案。',
    iconName: 'Printer',
    badge: '故障'
  },
  {
    id: 'photo-flash-fault',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '闪光灯故障 / 照片偏暗',
    desc: '补光灯不亮、频闪或照片曝光不足',
    prompt: '拍照机闪光灯/常亮补光灯不亮或拍出的照片过暗偏色，请提供灯光与触发器排查指南。',
    iconName: 'Zap'
  },
  {
    id: 'photo-pay-unstart',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '扫码后未启动拍照',
    desc: '顾客付款成功但拍照程序未调起',
    prompt: '顾客扫码支付成功已扣款，但拍照机界面未进入拍照流程，如何排查订单状态与应急处理？',
    iconName: 'QrCode'
  },

  // 售货机专区
  {
    id: 'vending-no-drop',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '扣费未出货 / 掉货失败',
    desc: '已成功扣款但货道未掉落商品',
    prompt: '顾客在售货机购买商品已扣款但货道未出货，请提供掉货检测与退款/补发排查指引。',
    iconName: 'Package',
    badge: '客诉多'
  },
  {
    id: 'vending-pay-fail',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '支付失败 / 扫码无响应',
    desc: '二维码无法生成或扫码后提示超时',
    prompt: '售货机屏幕支付二维码无法加载或扫码后频繁提示支付超时/网络异常，如何排查？',
    iconName: 'CreditCard'
  },
  {
    id: 'vending-slot-jam',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '货道卡货 / 电机堵转',
    desc: '弹簧/履带货道卡阻，电机异响',
    prompt: '售货机货道弹簧转动但商品卡在导轨中间或电机发生堵转报警，请提供安全清障步骤。',
    iconName: 'AlertTriangle',
    badge: '机械卡阻'
  },
  {
    id: 'vending-cooling-fault',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '制冷异常 / 温控偏高',
    desc: '冷藏柜不制冷、风机停转或温度报警',
    prompt: '售货机冷藏柜箱体内温度偏高、压缩机不启动或风道结霜，请提供制冷系统基础排查方案。',
    iconName: 'ThermometerSnowflake'
  },
  {
    id: 'vending-coin-fault',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '投币不识别 / 找零异常',
    desc: '硬币器卡币、拒收真币或无法找零',
    prompt: '售货机投币器拒收硬币/纸币或找零电机未吐出零钱，请提供清洁与排障步骤。',
    iconName: 'Coins'
  }
];

const renderIcon = (name: string) => {
  switch (name) {
    case 'FileText':
      return <FileText size={15} />;
    case 'Monitor':
      return <Monitor size={15} />;
    case 'Printer':
      return <Printer size={15} />;
    case 'Zap':
      return <Zap size={15} />;
    case 'QrCode':
      return <QrCode size={15} />;
    case 'Package':
      return <Package size={15} />;
    case 'CreditCard':
      return <CreditCard size={15} />;
    case 'AlertTriangle':
      return <AlertTriangle size={15} />;
    case 'ThermometerSnowflake':
      return <ThermometerSnowflake size={15} />;
    case 'Coins':
      return <Coins size={15} />;
    default:
      return <Sparkles size={15} />;
  }
};

export const DiagnosticGuideTree: React.FC<DiagnosticGuideTreeProps> = ({
  onSelectGuide,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'all' | 'photo' | 'vending'>('all');

  const filteredItems = DIAGNOSTIC_DATA.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  return (
    <div className="cs-guide-tree-card">
      <div className="cs-guide-tree-header">
        <div className="cs-guide-tree-title-row">
          <div className="cs-guide-tree-icon-badge">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="cs-guide-tree-title">设备场景化故障诊断引导</div>
            <div className="cs-guide-tree-sub">
              点击常见故障快捷胶囊，智能助手将立即为您提供精准排查方案
            </div>
          </div>
        </div>

        <button
          type="button"
          className="cs-guide-tree-toggle-btn"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          title={isExpanded ? '收起诊断树' : '展开诊断树'}
        >
          <span>{isExpanded ? '收起' : '展开'}</span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {isExpanded && (
        <div className="cs-guide-tree-body">
          {/* 设备大类切换 Tabs */}
          <div className="cs-guide-tabs">
            <button
              type="button"
              className={`cs-guide-tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              全部场景 ({DIAGNOSTIC_DATA.length})
            </button>
            <button
              type="button"
              className={`cs-guide-tab ${activeTab === 'photo' ? 'active' : ''}`}
              onClick={() => setActiveTab('photo')}
            >
              <Camera size={13} style={{ marginRight: 4 }} />
              📷 拍照机专区
            </button>
            <button
              type="button"
              className={`cs-guide-tab ${activeTab === 'vending' ? 'active' : ''}`}
              onClick={() => setActiveTab('vending')}
            >
              <ShoppingBag size={13} style={{ marginRight: 4 }} />
              🥤 售货机专区
            </button>
          </div>

          {/* 胶囊网格 */}
          <div className="cs-guide-capsules-grid">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`cs-guide-capsule cs-guide-capsule-${item.category}`}
                onClick={() => onSelectGuide(item.prompt, item.categoryLabel)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectGuide(item.prompt, item.categoryLabel);
                  }
                }}
              >
                <div className="cs-guide-capsule-icon">{renderIcon(item.iconName)}</div>
                <div className="cs-guide-capsule-content">
                  <div className="cs-guide-capsule-title-row">
                    <span className="cs-guide-capsule-title">{item.title}</span>
                    {item.badge && <span className="cs-guide-capsule-badge">{item.badge}</span>}
                  </div>
                  <span className="cs-guide-capsule-desc">{item.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
