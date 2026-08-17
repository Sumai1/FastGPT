import { describe, expect, it } from 'vitest';
import {
  hashCustomerServiceExternalUserId,
  redactCustomerServiceSensitiveText
} from '@fastgpt/service/core/customerService/privacy';

describe('customer service privacy', () => {
  it('creates a stable project-scoped pseudonymous user id', () => {
    const first = hashCustomerServiceExternalUserId({
      teamId: 'team-a',
      projectId: 'project-a',
      externalUserId: 'user@example.com'
    });
    const second = hashCustomerServiceExternalUserId({
      teamId: 'team-a',
      projectId: 'project-a',
      externalUserId: 'user@example.com'
    });
    const otherProject = hashCustomerServiceExternalUserId({
      teamId: 'team-a',
      projectId: 'project-b',
      externalUserId: 'user@example.com'
    });
    expect(first).toBe(second);
    expect(first).not.toBe(otherProject);
    expect(first).not.toContain('user@example.com');
  });

  it('redacts common sensitive values from feedback and exports', () => {
    expect(
      redactCustomerServiceSensitiveText(
        '手机 13800138000，邮箱 user@example.com，身份证 110101199001011234'
      )
    ).toBe('手机 [PHONE]，邮箱 [EMAIL]，身份证 [ID_CARD]');
  });

  it('redacts labeled customer, address, order, payment and API key values', () => {
    expect(
      redactCustomerServiceSensitiveText(
        '姓名：张三，地址：上海市浦东新区测试路 88 号\n订单号: ORD-20260811-001\n银行卡号：6222 0000 0000 0000\nKey fastgpt-secret_12345678'
      )
    ).toBe('姓名: [NAME]，地址: [ADDRESS]\n订单号: [ORDER_ID]\n银行卡号: [PAYMENT]\nKey [API_KEY]');
  });
});
