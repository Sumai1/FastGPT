/**
 * 清理客服反馈、评测导出和资料预处理中的常见身份、订单、付款、地址和 Key 信息。地址等
 * 非结构化字段只处理带标签的值，避免误删普通产品说明。
 */
export const redactCustomerServiceSensitiveText = (text: string) =>
  text
    .replace(/\bfastgpt-[A-Z0-9_-]{8,}\b/gi, '[API_KEY]')
    .replace(/\b1[3-9]\d{9}\b/g, '[PHONE]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[EMAIL]')
    .replace(/\b\d{17}[\dXx]\b/g, '[ID_CARD]')
    .replace(/((?:客户)?姓名|customer\s*name|name)\s*[:：]\s*[^\s,，;；]{2,50}/giu, '$1: [NAME]')
    .replace(
      /(收货地址|联系地址|地址|shipping\s*address|address)\s*[:：]\s*[^\n]{4,200}/giu,
      '$1: [ADDRESS]'
    )
    .replace(
      /(订单号|訂單號|order\s*(?:id|no\.?|number))\s*[:：#]?\s*[A-Z0-9_-]{6,100}/giu,
      '$1: [ORDER_ID]'
    )
    .replace(
      /(银行卡号|銀行卡號|付款账号|付款帳號|支付账号|支付帳號|bank\s*card|payment\s*account)\s*[:：]?\s*[A-Z0-9 _-]{6,100}/giu,
      '$1: [PAYMENT]'
    );
