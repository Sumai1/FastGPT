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
  ThermometerSnowflake,
  ArrowRight,
  GitBranch,
  X,
  CheckCircle2,
  Headphones
} from './icons';
import type { DiagnosticItem } from '../types';

export interface DecisionNode {
  nodeId: string;
  question: string;
  hint?: string;
  options: {
    label: string;
    description?: string;
    nextAction: 'branch' | 'solve' | 'send_prompt' | 'handoff';
    targetNodeId?: string;
    solutionMarkdown?: string;
    prompt?: string;
    isDanger?: boolean;
  }[];
}

export interface ScenarioTreeDefinition {
  id: string;
  category: 'photo' | 'vending';
  title: string;
  categoryLabel: string;
  desc: string;
  badge?: string;
  iconName: string;
  prompt: string;
  rootNodeId: string;
  nodes: Record<string, DecisionNode>;
}

export const SCENARIO_TREES: ScenarioTreeDefinition[] = [
  // 1. 拍照机 - 卡纸与切刀卡阻
  {
    id: 'photo-paper-jam',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '卡纸 / 切刀卡阻',
    desc: '相纸卡在出片口、裁切刀处或滚轮卷入',
    prompt: '自助拍照机出现相纸卡在出片口或切刀处卡阻，请给出标准排查与清卡纸步骤。',
    iconName: 'FileText',
    badge: '高频',
    rootNodeId: 'node-paper-1',
    nodes: {
      'node-paper-1': {
        nodeId: 'node-paper-1',
        question: '打印机当前状态指示灯为何种状态？',
        hint: '请观察机身右侧打印仓面板的指示灯颜色与闪烁频率',
        options: [
          {
            label: '红灯慢闪（相纸或色带耗尽）',
            description: '通常为耗材耗尽，需装填新相纸卷与色带',
            nextAction: 'send_prompt',
            prompt: '拍照机提示相纸/色带耗尽（红灯慢闪），请给出热升华打印机耗材安装与校准步骤。'
          },
          {
            label: '红灯快闪或常亮（内部机械卡阻）',
            description: '相纸卡在导轨、滚轮或裁切刀位置',
            nextAction: 'branch',
            targetNodeId: 'node-paper-2'
          },
          {
            label: '绿灯常亮但吐出全白相纸',
            description: '色带安装反向或图像驱动色彩配置异常',
            nextAction: 'solve',
            solutionMarkdown:
              '【排查要领】：\n1. 切断电源打开前仓，检查色带是否正反面颠倒安装；\n2. 检查控制软件内的色彩配置文件是否被重置为默认值；\n3. 重新安装色带卡槽并执行测试打印。'
          }
        ]
      },
      'node-paper-2': {
        nodeId: 'node-paper-2',
        question: '卡纸发生在哪个物理位置？',
        hint: '请在完全切断电源后再拉开打印仓进行观察',
        options: [
          {
            label: '在出纸口可见相纸边缘',
            description: '相纸顺利通过切刀但在出纸滚轮处停滞',
            nextAction: 'solve',
            solutionMarkdown:
              '【安全清卡纸指引】：\n1. **关闭总电源开关**并拔掉电源线；\n2. 顺着进纸反方向双手平稳拉出卡纸，切勿使用金属刀具撬刮滚轴；\n3. 盖紧前仓门后通电，等待打印机自检就绪。'
          },
          {
            label: '卡在裁切刀槽深处，伴有齿轮咔咔异响',
            description: '切刀机械卡死，强行拉拽可能损坏切刀电机或割伤手指',
            nextAction: 'handoff',
            isDanger: true,
            solutionMarkdown:
              '【高危提示】：切刀总成机械阻滞，严禁用手强行扳动刀刃。建议立即切断电源并转人工售后工程师处理。'
          }
        ]
      }
    }
  },

  // 2. 拍照机 - 黑屏 / 触摸无反应
  {
    id: 'photo-screen-black',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '黑屏 / 触摸无反应',
    desc: '屏幕黑屏、无信号输入或触控失灵',
    prompt: '自助拍照机屏幕出现黑屏、无显示信号或触控按键无响应，请指导如何排查供电与信号线。',
    iconName: 'Monitor',
    badge: '显示',
    rootNodeId: 'node-screen-1',
    nodes: {
      'node-screen-1': {
        nodeId: 'node-screen-1',
        question: '主机风扇与机身电源指示灯是否正常点亮？',
        hint: '观察机身总电源开关与内部工控机指示灯',
        options: [
          {
            label: '整机全无反应，电源总开关指示灯不亮',
            description: '市电未通或漏电保护器跳闸',
            nextAction: 'send_prompt',
            prompt: '自助拍照机整机断电无反应，总开关指示灯不亮，请指导排查 220V 供电与漏保开关。'
          },
          {
            label: '主机风扇转动，但屏幕显示 "No Signal" (无信号)',
            description: 'HDMI/DP 视频线松动或显卡输出异常',
            nextAction: 'solve',
            solutionMarkdown:
              '【排查步骤】：\n1. 断电后检查屏幕背板 HDMI/DP 信号线是否插紧；\n2. 检查工控机主机背部显卡/主板接口连接；\n3. 重启主机观察 BIOS 自检画面。'
          },
          {
            label: '屏幕正常显示画面，但手指点击完全无触控响应',
            description: 'USB 触控盒通信中断或触控驱动失联',
            nextAction: 'send_prompt',
            prompt: '拍照机屏幕有显示但触摸完全失效，如何排查 USB 触控板连线与驱动？'
          }
        ]
      }
    }
  },

  // 3. 拍照机 - 不打印 / 打印白片
  {
    id: 'photo-print-error',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '不打印 / 打印白片',
    desc: '打印机亮红灯、无动作或吐出空白纸',
    prompt: '拍照机程序提示打印异常、打印机亮红灯或吐出空白相纸，请提供排查方案。',
    iconName: 'Printer',
    badge: '故障',
    rootNodeId: 'node-print-1',
    nodes: {
      'node-print-1': {
        nodeId: 'node-print-1',
        question: '打印任务提交后，打印机有何具体动作？',
        options: [
          {
            label: '打印机完全无进纸动作，软件提示 "Printer Offline"',
            nextAction: 'send_prompt',
            prompt: '拍照机打印机显示离线且无进纸动作，请提供 USB 通信与驱动排查步骤。'
          },
          {
            label: '正常走纸但吐出的照片全白或严重偏色',
            nextAction: 'send_prompt',
            prompt: '热升华打印机吐出空白相纸或严重偏色，如何排查热敏头与色带规格匹配？'
          }
        ]
      }
    }
  },

  // 4. 拍照机 - 闪光灯故障 / 照片偏暗
  {
    id: 'photo-flash-fault',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '闪光灯故障 / 照片偏暗',
    desc: '补光灯不亮、频闪或照片曝光不足',
    prompt: '拍照机闪光灯/常亮补光灯不亮或拍出的照片过暗偏色，请提供灯光与触发器排查指南。',
    iconName: 'Zap',
    badge: '成像',
    rootNodeId: 'node-flash-1',
    nodes: {
      'node-flash-1': {
        nodeId: 'node-flash-1',
        question: '闪光灯或补光灯的异常表现为：',
        options: [
          {
            label: '拍照瞬间闪光灯完全不闪光',
            nextAction: 'send_prompt',
            prompt: '拍照机按下快门闪光灯不触发，请指导排查相机热靴引闪器与同步线。'
          },
          {
            label: '常亮美颜补光灯不亮或剧烈频闪',
            nextAction: 'send_prompt',
            prompt: '拍照机常亮 LED 柔光箱不亮或频闪，请指导排查 12V 恒流驱动电源。'
          }
        ]
      }
    }
  },

  // 5. 拍照机 - 扫码后未启动拍照
  {
    id: 'photo-pay-unstart',
    category: 'photo',
    categoryLabel: '拍照机专区',
    title: '扫码后未启动拍照',
    desc: '顾客付款成功但拍照程序未调起',
    prompt: '顾客扫码支付成功已扣款，但拍照机界面未进入拍照流程，如何排查订单状态与应急处理？',
    iconName: 'QrCode',
    badge: '客诉',
    rootNodeId: 'node-photo-pay-1',
    nodes: {
      'node-photo-pay-1': {
        nodeId: 'node-photo-pay-1',
        question: '扫码支付后的屏幕反馈与订单状态：',
        options: [
          {
            label: '顾客手机已扣款，但屏幕仍停留在二维码页面',
            nextAction: 'send_prompt',
            prompt: '顾客扣款成功但拍照机未收到支付回调通知，请提供网络检查与手动补单/退款指引。'
          },
          {
            label: '页面提示 "设备被占用" 或 "正在重置中"',
            nextAction: 'send_prompt',
            prompt: '拍照机提示设备被占用或未就绪，如何重启后台管理服务并释放锁机状态？'
          }
        ]
      }
    }
  },

  // 6. 售货机 - 扣费未出货 / 掉货失败
  {
    id: 'vending-no-drop',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '扣费未出货 / 掉货失败',
    desc: '已成功扣款但货道未掉落商品',
    prompt: '顾客在售货机购买商品已扣款但货道未出货，请提供掉货检测与退款/补发排查指引。',
    iconName: 'Package',
    badge: '高频客诉',
    rootNodeId: 'node-vend-drop-1',
    nodes: {
      'node-vend-drop-1': {
        nodeId: 'node-vend-drop-1',
        question: '顾客扣款后，机器货道是否有运转反应？',
        options: [
          {
            label: '弹簧/履带完全无动作，屏幕提示支付成功',
            nextAction: 'send_prompt',
            prompt: '售货机扣款成功但货道电机完全不转动，请指导排查主控板驱动与 MDB 协议通讯。'
          },
          {
            label: '弹簧转动但商品卡在货道出口处未掉落',
            nextAction: 'branch',
            targetNodeId: 'node-vend-drop-2'
          },
          {
            label: '商品已掉入取物口，但系统判定掉货失败并自动退款',
            nextAction: 'solve',
            solutionMarkdown:
              '【光幕排查要领】：\n1. 擦拭出货口红外对射光幕探头的灰尘；\n2. 检查红外线是否被包装袋碎屑遮挡；\n3. 在运维后台执行掉货传感器自检校准。'
          }
        ]
      },
      'node-vend-drop-2': {
        nodeId: 'node-vend-drop-2',
        question: '观察卡货货道的物理状态：',
        options: [
          {
            label: '商品尺寸偏大被两圈弹簧夹住',
            nextAction: 'solve',
            solutionMarkdown:
              '【处理方案】：\n1. 进入管理后台执行该货道“单动退货/正转”；\n2. 重新调整该货道的弹簧间距与仰角；\n3. 及时为顾客办理原路退款或扫码补发。'
          },
          {
            label: '主控板报警电机过载堵转 (报错 V-101)',
            nextAction: 'send_prompt',
            prompt: '售货机报错 V-101 电机堵转，如何安全断开货道供电并清理异物？'
          }
        ]
      }
    }
  },

  // 7. 售货机 - 支付失败 / 扫码无响应
  {
    id: 'vending-pay-fail',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '支付失败 / 扫码无响应',
    desc: '二维码无法生成或扫码后提示超时',
    prompt: '售货机屏幕支付二维码无法加载或扫码后频繁提示支付超时/网络异常，如何排查？',
    iconName: 'CreditCard',
    badge: '支付',
    rootNodeId: 'node-vend-pay-1',
    nodes: {
      'node-vend-pay-1': {
        nodeId: 'node-vend-pay-1',
        question: '支付异常的具体表象为：',
        options: [
          {
            label: '屏幕显示 "网络异常，无法获取支付二维码" (ERR-NET)',
            nextAction: 'send_prompt',
            prompt: '售货机无法生成支付二维码，提示网络异常 ERR-NET，请指导排查 4G 工业路由器。'
          },
          {
            label: '微信/支付宝扫码后提示 "商户未配置或交易超时"',
            nextAction: 'send_prompt',
            prompt: '售货机扫码提示商户配置异常或交易超时，如何检查支付网关与设备绑定状态？'
          }
        ]
      }
    }
  },

  // 8. 售货机 - 货道卡货 / 电机堵转
  {
    id: 'vending-slot-jam',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '货道卡货 / 电机堵转',
    desc: '弹簧/履带货道卡阻，电机异响',
    prompt: '售货机货道弹簧转动但商品卡在导轨中间或电机发生堵转报警，请提供安全清障步骤。',
    iconName: 'AlertTriangle',
    badge: '机械卡阻',
    rootNodeId: 'node-slot-1',
    nodes: {
      'node-slot-1': {
        nodeId: 'node-slot-1',
        question: '发生卡货的货道类型为：',
        options: [
          {
            label: '弹簧货道（饮料瓶/零食袋）',
            nextAction: 'send_prompt',
            prompt: '售货机弹簧货道卡货，请给出弹簧规格选型、仰角调整与防倾倒挡板设置指南。'
          },
          {
            label: '履带货道（盒装生鲜/日用品）',
            nextAction: 'send_prompt',
            prompt: '售货机履带货道卡货或皮带打滑，请指导如何调节张紧轮与清理导轨。'
          }
        ]
      }
    }
  },

  // 9. 售货机 - 制冷异常 / 温控偏高
  {
    id: 'vending-cooling-fault',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '制冷异常 / 温控偏高',
    desc: '冷藏柜不制冷、风机停转或温度报警',
    prompt: '售货机冷藏柜箱体内温度偏高、压缩机不启动或风道结霜，请提供制冷系统基础排查方案。',
    iconName: 'ThermometerSnowflake',
    badge: '温控',
    rootNodeId: 'node-cooling-1',
    nodes: {
      'node-cooling-1': {
        nodeId: 'node-cooling-1',
        question: '观察箱体后方压缩机与风机运行状态：',
        options: [
          {
            label: '压缩机持续运转，但箱体内部不降温，散热片积灰严重',
            nextAction: 'solve',
            solutionMarkdown:
              '【冷凝器清理指引】：\n1. 切断电源，使用毛刷与吸尘器彻底清除后侧冷凝器防尘网积灰；\n2. 确保机箱后部距离墙面保持至少 15cm 散热间距；\n3. 检查门封磁条是否密封良好无漏冷气。'
          },
          {
            label: '压缩机频繁起跳嗡嗡异响，伴随异味或报错 V-205',
            nextAction: 'handoff',
            isDanger: true,
            solutionMarkdown:
              '【高危警告】：检测到压缩机过载保护或易燃冷媒（R290）泄漏风险。严禁非专业人员带电拆检，请立即切断总电源并联系售后工程师！'
          }
        ]
      }
    }
  },

  // 10. 售货机 - 投币不识别 / 找零异常
  {
    id: 'vending-coin-fault',
    category: 'vending',
    categoryLabel: '售货机专区',
    title: '投币不识别 / 找零异常',
    desc: '硬币器卡币、拒收真币或无法找零',
    prompt: '售货机投币器拒收硬币/纸币或找零电机未吐出零钱，请提供清洁与排障步骤。',
    iconName: 'Coins',
    badge: '现金模块',
    rootNodeId: 'node-coin-1',
    nodes: {
      'node-coin-1': {
        nodeId: 'node-coin-1',
        question: '现金模块的异常情况为：',
        options: [
          {
            label: '硬币投入后直接从退币口滑出（拒收）',
            nextAction: 'send_prompt',
            prompt: '售货机投币器拒收硬币，请指导如何使用无水酒精棉球清洁光电识币探头与校准。'
          },
          {
            label: '找零电机咔咔响但未吐出硬币（找零卡币）',
            nextAction: 'send_prompt',
            prompt: '售货机找零硬币筒卡币，如何打开找零滑道清除变形硬币并复位？'
          }
        ]
      }
    }
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

interface DiagnosticGuideTreeProps {
  onSelectGuide: (prompt: string, categoryLabel?: string) => void;
  onRequestHumanHandoff?: (faultSummary: string) => void;
  defaultExpanded?: boolean;
}

export const DiagnosticGuideTree: React.FC<DiagnosticGuideTreeProps> = ({
  onSelectGuide,
  onRequestHumanHandoff,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<'all' | 'photo' | 'vending'>('all');

  // 向导决策树弹窗状态
  const [activeWizardTree, setActiveWizardTree] = useState<ScenarioTreeDefinition | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [wizardHistory, setWizardHistory] = useState<string[]>([]);

  const filteredItems = SCENARIO_TREES.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const handleOpenWizard = (tree: ScenarioTreeDefinition, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveWizardTree(tree);
    setCurrentNodeId(tree.rootNodeId);
    setWizardHistory([tree.rootNodeId]);
  };

  const handleCloseWizard = () => {
    setActiveWizardTree(null);
    setCurrentNodeId('');
    setWizardHistory([]);
  };

  const handleOptionClick = (option: DecisionNode['options'][number]) => {
    if (!activeWizardTree) return;

    if (option.nextAction === 'branch' && option.targetNodeId) {
      setCurrentNodeId(option.targetNodeId);
      setWizardHistory((prev) => [...prev, option.targetNodeId!]);
    } else if (option.nextAction === 'send_prompt' && option.prompt) {
      onSelectGuide(option.prompt, activeWizardTree.categoryLabel);
      handleCloseWizard();
    } else if (option.nextAction === 'handoff') {
      if (onRequestHumanHandoff) {
        onRequestHumanHandoff(`触发场景决策转人工：${activeWizardTree.title} - ${option.label}`);
      } else {
        onSelectGuide(
          `设备出现严重故障：${activeWizardTree.title}，请转接人工售后客服处理。`,
          activeWizardTree.categoryLabel
        );
      }
      handleCloseWizard();
    }
  };

  const currentNode = activeWizardTree?.nodes[currentNodeId];

  return (
    <div className="cs-guide-tree-card">
      <div className="cs-guide-tree-header">
        <div className="cs-guide-tree-title-row">
          <div className="cs-guide-tree-icon-badge">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="cs-guide-tree-title">
              <span>设备场景化故障诊断向导</span>
              <span className="cs-sr-only" style={{ display: 'none' }}>
                设备场景化故障诊断引导
              </span>
            </div>
            <div className="cs-guide-tree-sub">
              点击故障胶囊秒级调取排查，或点击「向导决策」开启多分支交互排障
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
              全部高频场景 ({SCENARIO_TREES.length})
            </button>
            <button
              type="button"
              className={`cs-guide-tab ${activeTab === 'photo' ? 'active' : ''}`}
              onClick={() => setActiveTab('photo')}
            >
              <Camera size={13} style={{ marginRight: 4 }} />
              拍照机专区
            </button>
            <button
              type="button"
              className={`cs-guide-tab ${activeTab === 'vending' ? 'active' : ''}`}
              onClick={() => setActiveTab('vending')}
            >
              <ShoppingBag size={13} style={{ marginRight: 4 }} />
              售货机专区
            </button>
          </div>

          {/* 场景故障胶囊网格 */}
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

                {/* 交互式向导按钮 */}
                <button
                  type="button"
                  className="cs-guide-wizard-btn"
                  onClick={(e) => handleOpenWizard(item, e)}
                  title="打开多分支决策向导"
                >
                  <GitBranch size={12} />
                  <span>向导</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 交互式多分支排障决策向导弹窗 (Interactive Decision Tree Wizard Modal) */}
      {activeWizardTree && currentNode && (
        <div className="cs-modal-overlay" onClick={handleCloseWizard}>
          <div className="cs-modal-card cs-wizard-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="cs-modal-header">
              <div
                className="cs-modal-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div className="cs-wizard-badge-icon">
                  <GitBranch size={16} />
                </div>
                <span>排障决策向导：{activeWizardTree.title}</span>
              </div>
              <button
                type="button"
                className="cs-btn cs-btn-secondary cs-btn-icon"
                onClick={handleCloseWizard}
                aria-label="关闭"
              >
                <X size={16} />
              </button>
            </div>

            <div className="cs-modal-body cs-wizard-modal-body">
              <div className="cs-wizard-question-box">
                <div className="cs-wizard-step-tag">步骤向导 ({wizardHistory.length})</div>
                <h3 className="cs-wizard-question-text">{currentNode.question}</h3>
                {currentNode.hint && <p className="cs-wizard-hint-text">{currentNode.hint}</p>}
              </div>

              <div className="cs-wizard-options-list">
                {currentNode.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`cs-wizard-option-item ${opt.isDanger ? 'danger' : ''}`}
                    onClick={() => handleOptionClick(opt)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cs-wizard-option-main">
                      <div className="cs-wizard-option-label-row">
                        <span className="cs-wizard-option-label">{opt.label}</span>
                        {opt.isDanger && (
                          <span className="cs-troubleshoot-danger-tag">高危安全</span>
                        )}
                      </div>
                      {opt.description && (
                        <p className="cs-wizard-option-desc">{opt.description}</p>
                      )}
                      {opt.solutionMarkdown && (
                        <div className="cs-wizard-solution-box">
                          <CheckCircle2 size={14} className="cs-text-success" />
                          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                            {opt.solutionMarkdown}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="cs-wizard-option-action">
                      {opt.nextAction === 'branch' && <ArrowRight size={15} />}
                      {opt.nextAction === 'send_prompt' && (
                        <span className="cs-wizard-action-pill">
                          <span>提问 AI</span>
                          <Sparkles size={12} />
                        </span>
                      )}
                      {opt.nextAction === 'handoff' && (
                        <span className="cs-wizard-action-pill danger">
                          <span>转人工</span>
                          <Headphones size={12} />
                        </span>
                      )}
                      {opt.nextAction === 'solve' && (
                        <span className="cs-wizard-action-pill success">
                          <span>解决指引</span>
                          <CheckCircle2 size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cs-modal-footer">
              <button type="button" className="cs-btn cs-btn-secondary" onClick={handleCloseWizard}>
                关闭
              </button>
              <button
                type="button"
                className="cs-btn cs-btn-primary"
                onClick={() => {
                  onSelectGuide(activeWizardTree.prompt, activeWizardTree.categoryLabel);
                  handleCloseWizard();
                }}
              >
                <Sparkles size={14} />
                <span>直接向 AI 发送排障提问</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
