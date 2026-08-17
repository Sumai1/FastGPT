import { describe, expect, it } from 'vitest';
import { CustomerServiceAudienceEnum } from '@fastgpt/global/core/customerService/constants';
import { buildCustomerServicePublicProxyBody } from '@/service/customerService/publicAuth';

describe('buildCustomerServicePublicProxyBody', () => {
  it('forces public audience and derives a stable browser identity from the session', () => {
    const body = buildCustomerServicePublicProxyBody({
      body: {
        requestId: 'browser-request',
        sessionId: 'browser-session',
        message: '设备怎么使用？',
        stream: true
      }
    });

    expect(body.audience).toBe(CustomerServiceAudienceEnum.public);
    expect(body.externalUserId).toBe('public:browser-session');
    expect(body.requestId).toMatch(/^[a-f0-9]{32}$/);
  });

  it('keeps requests without a caller idempotency key free of a generated request id', () => {
    const body = buildCustomerServicePublicProxyBody({
      body: {
        message: '设备怎么使用？',
        stream: false
      }
    });

    expect(body.requestId).toBeUndefined();
    expect(body.externalUserId).toBe('public:new-session');
  });
});
