/**
 * 阻断级高危电气与机械安全关键词拦截正则
 */
export const HIGH_DANGER_SAFETY_REGEX =
  /220V|高压电|带电拆机|带电检修|触电危险|严禁拆卸|强电总成|压缩机高压|主板强电|漏电触电|制冷剂泄漏|冷媒泄漏|R290|R134a|开关电源裸露|高压打火|强电接线/i;

export interface SafetyRuleDetail {
  category: 'high_voltage' | 'refrigerant' | 'live_disassembly' | 'mechanical_hazard';
  level: 'critical' | 'danger' | 'warning';
  title: string;
  warningMessage: string;
  prohibitedActions: string[];
}

export const SAFETY_RULES: SafetyRuleDetail[] = [
  {
    category: 'high_voltage',
    level: 'critical',
    title: '阻断级高压电气安全警示',
    warningMessage:
      '检测到当前排查涉及 220V 交流高压市电或强电总成部件。严禁非专业持特种作业电工证人员带电操作！',
    prohibitedActions: [
      '严禁在未彻底切断设备市电总开关并拔下插头的情况下拆卸机箱后背板',
      '严禁使用万用表直接触碰裸露的 220V 开关电源铜排或大容量储能电容',
      '严禁在潮湿地面或双手潮湿状态下接触机箱内部金属构件'
    ]
  },
  {
    category: 'live_disassembly',
    level: 'critical',
    title: '严禁带电开箱拆机警示',
    warningMessage:
      '设备主控板、相机供电模组与打印机总成在通电状态下拆卸极易引发芯片静电击穿或瞬间短路！',
    prohibitedActions: [
      '必须先关闭设备后侧总电源开关，并从墙面插座拔下电源线',
      '拔下电源插头后请静置 60 秒以上，等待主板储能电容完全放电完毕',
      '如无厂家授权工具与备件，请立即联系售后工程师处理'
    ]
  },
  {
    category: 'refrigerant',
    level: 'danger',
    title: '制冷系统与易燃冷媒安全警告',
    warningMessage:
      '智能售货机冷藏模块采用环保制冷剂（如 R290），具有易燃易爆特性，严禁明火检漏或私自割管！',
    prohibitedActions: [
      '严禁在密闭无通风环境下拆修制冷压缩机或冷凝器铜管总成',
      '严禁使用打火机或明火进行制冷剂管路泄漏排查',
      '若发现刺鼻异味或白雾溢出，请立即开窗通风、切断市电并联系专业制冷售后'
    ]
  }
];

/**
 * 检测内容是否触发阻断级高危安全拦截
 */
export const checkHighDangerWarning = (content: string, safetyWarning?: string): boolean => {
  const target = `${safetyWarning || ''} ${content || ''}`;
  return HIGH_DANGER_SAFETY_REGEX.test(target);
};

/**
 * 获取命中匹配的高危安全规则详情
 */
export const getMatchedSafetyRule = (content: string, safetyWarning?: string): SafetyRuleDetail => {
  const target = `${safetyWarning || ''} ${content || ''}`.toLowerCase();

  if (/制冷剂|冷媒|r290|r134a|压缩机高压/i.test(target)) {
    return SAFETY_RULES[2]; // refrigerant
  }
  if (/带电拆机|带电检修|通电拆卸|开箱检修/i.test(target)) {
    return SAFETY_RULES[1]; // live_disassembly
  }
  return SAFETY_RULES[0]; // high_voltage (default critical)
};

export type CitationTypeLabel = '故障排查卡' | '操作手册' | '产品主档' | '服务政策' | '标准资料';

export interface CitationClassification {
  typeLabel: CitationTypeLabel;
  typeColor: string;
  typeBg: string;
  borderColor: string;
}

/**
 * 依据知识库资料标题与内容切片，智能分类为四大标准知识库卡片类型
 */
export const classifyCitationType = (
  title: string,
  summary: string = ''
): CitationClassification => {
  const text = `${title} ${summary}`.toLowerCase();

  if (/故障|排查|卡纸|报错|sop|排障|异常|维修|报警/i.test(text)) {
    return {
      typeLabel: '故障排查卡',
      typeColor: '#d97706',
      typeBg: '#fef3c7',
      borderColor: '#fde68a'
    };
  }
  if (/手册|说明书|指南|安装|使用|保养|更换|装填/i.test(text)) {
    return {
      typeLabel: '操作手册',
      typeColor: '#2563eb',
      typeBg: '#eff6ff',
      borderColor: '#bfdbfe'
    };
  }
  if (/主档|规格|参数|硬件|尺寸|接口|额定|型号/i.test(text)) {
    return {
      typeLabel: '产品主档',
      typeColor: '#0891b2',
      typeBg: '#ecfeff',
      borderColor: '#a5f3fc'
    };
  }
  if (/政策|保修|退款|质保|条款|售后政策|时效|争议/i.test(text)) {
    return {
      typeLabel: '服务政策',
      typeColor: '#16a34a',
      typeBg: '#f0fdf4',
      borderColor: '#bbf7d0'
    };
  }

  return {
    typeLabel: '标准资料',
    typeColor: '#64748b',
    typeBg: '#f8fafc',
    borderColor: '#e2e8f0'
  };
};
