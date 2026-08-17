import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 客户页目前没有在测试环境中挂载 Chakra/Next 页面所需的浏览器运行时，因此这里固定检查
 * 关键源码契约。该测试是静态回归，不替代真实浏览器、移动端或 axe 无障碍测试。
 */
const source = readFileSync(
  resolve(process.cwd(), 'src/pageComponents/customerService/CustomerServiceChat.tsx'),
  'utf8'
);

describe('customer service chat retry and timeout contract', () => {
  it('keeps independent inactivity and total generation limits', () => {
    expect(source).toContain('const SSE_INACTIVITY_TIMEOUT_MS = 35_000;');
    expect(source).toContain('const SSE_TOTAL_TIMEOUT_MS = 120_000;');
    expect(source).toContain('const WAITING_TIME_TICK_MS = 1_000;');
    expect(source).toContain('const STOP_REQUEST_TIMEOUT_MS = 3_000;');
    expect(source).toContain('totalTimeout = setTimeout');
    expect(source).toContain(
      'waitingInterval = setInterval(updateWaitingTime, WAITING_TIME_TICK_MS)'
    );
  });

  it('persists and reuses request/session identity for an in-place retry', () => {
    expect(source).toContain('requestId?: string;');
    expect(source).toContain('sessionId?: string;');
    expect(source).toContain('const requestId = retryAssistant?.requestId');
    expect(source).toContain('retryAssistant?.sessionId ?? previousMessage?.sessionId');
    expect(source).toContain('onClick={() => void sendMessage(undefined, index)}');
    expect(source).toContain('不再追加一组消息');
    expect(source).toContain('activeRequestRef.current?.token !== request.token');
  });

  it('uses the public/internal stop proxy for user stop and timeout paths', () => {
    expect(source).toContain("'/api/customer-service/public/stop'");
    expect(source).toContain("'/api/customer-service/internal/stop'");
    expect(source).toContain('requestStop(request, true);');
    expect(source).toContain('requestStop(request);');
    expect(source).toContain('stopPending?: boolean;');
    expect(source).toContain('await request.stopPromise');
    expect(source).toContain('isLoading={message.stopPending}');

    const stopHandler = source.slice(source.indexOf('const stopGeneration'));
    expect(stopHandler.indexOf('requestStop(request, true);')).toBeLessThan(
      stopHandler.indexOf('request.controller.abort();')
    );
  });

  it('exposes elapsed waiting time while the assistant is processing', () => {
    expect(source).toContain('waitingSeconds?: number;');
    expect(source).toContain('message.waitingSeconds !== undefined');
    expect(source).toContain("{t('generating_answer')} ({message.waitingSeconds}s)");
  });
});
