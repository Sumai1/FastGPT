import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteRuntimeStop: vi.fn()
}));

vi.mock('@fastgpt/service/core/workflow/dispatch/workflowStatus', () => ({
  delAgentRuntimeStopSign: mocks.deleteRuntimeStop
}));

import { clearCustomerServiceRuntimeStop } from '@/service/customerService/context';

describe('customer service runtime stop context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteRuntimeStop.mockResolvedValue(undefined);
  });

  it('clears the fixed app stop marker before delegated completion starts', async () => {
    await clearCustomerServiceRuntimeStop({
      appId: 'app-id',
      chatId: 'chat-id'
    });

    expect(mocks.deleteRuntimeStop).toHaveBeenCalledWith({
      sourceType: 'app',
      sourceId: 'app-id',
      chatId: 'chat-id'
    });
  });
});
