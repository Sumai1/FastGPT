import type { CustomerServiceProjectType } from '@fastgpt/global/core/customerService/type';

export type CustomerServiceHumanRuleReason =
  | 'dangerous_operation'
  | 'dispute'
  | 'complaint'
  | 'human_requested';

const DEFAULT_DANGEROUS_KEYWORDS = [
  '冒烟',
  '焦味',
  '烧焦',
  '漏电',
  '触电',
  '高压',
  '拆机',
  '制冷剂',
  '内部密码',
  '严重异响'
];
const DEFAULT_DISPUTE_KEYWORDS = ['退款', '退货', '赔偿', '支付争议', '扣款', '保修责任', '拒保'];
const DEFAULT_COMPLAINT_KEYWORDS = ['投诉', '举报', '消协', '12315'];
const DEFAULT_HUMAN_REQUEST_KEYWORDS = ['转人工', '人工客服', '真人客服', '联系人工'];

const includesKeyword = (message: string, keywords: string[]) => {
  const normalizedMessage = message.toLocaleLowerCase();
  return keywords.some((keyword) => {
    const normalizedKeyword = keyword.trim().toLocaleLowerCase();
    return normalizedKeyword.length > 0 && normalizedMessage.includes(normalizedKeyword);
  });
};

/**
 * 执行模型调用前的强制转人工规则。服务端规则优先于工作流 Prompt，模型不能撤销结果。
 */
export const resolveCustomerServiceHumanRule = ({
  message,
  ruleConfig
}: {
  message: string;
  ruleConfig: CustomerServiceProjectType['ruleConfig'];
}): CustomerServiceHumanRuleReason | undefined => {
  if (includesKeyword(message, [...DEFAULT_DANGEROUS_KEYWORDS, ...ruleConfig.dangerousKeywords])) {
    return 'dangerous_operation';
  }
  if (includesKeyword(message, [...DEFAULT_DISPUTE_KEYWORDS, ...ruleConfig.disputeKeywords])) {
    return 'dispute';
  }
  if (includesKeyword(message, [...DEFAULT_COMPLAINT_KEYWORDS, ...ruleConfig.complaintKeywords])) {
    return 'complaint';
  }
  if (
    includesKeyword(message, [
      ...DEFAULT_HUMAN_REQUEST_KEYWORDS,
      ...ruleConfig.humanRequestKeywords
    ])
  ) {
    return 'human_requested';
  }
};

/** 返回稳定、可直接展示的转人工说明。 */
export const getCustomerServiceHumanAnswer = (reason: CustomerServiceHumanRuleReason) => {
  if (reason === 'dangerous_operation') {
    return {
      answer: '该情况可能涉及人身或设备安全，请立即停止操作并断开设备电源，等待专业人员处理。',
      safetyWarning: '请勿继续拆机、带电检查或自行处理高压部件。'
    };
  }
  if (reason === 'dispute') {
    return { answer: '该问题涉及退款、支付、赔偿或保修责任，需要人工客服核实订单和服务记录。' };
  }
  if (reason === 'complaint') {
    return { answer: '已识别到投诉诉求，请通过人工客服渠道继续处理。' };
  }
  return { answer: '好的，已为您提供人工客服联系方式。' };
};

const VERSION_SENSITIVE_KEYWORDS = [
  '参数',
  '错误码',
  '故障码',
  '维修',
  '升级',
  '固件',
  '版本',
  '兼容',
  '驱动'
];

/** 判断问题是否需要在存在多版本时先补充版本信息。 */
export const isCustomerServiceVersionSensitiveQuestion = (message: string) =>
  includesKeyword(message, VERSION_SENSITIVE_KEYWORDS);
