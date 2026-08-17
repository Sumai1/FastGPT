import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  projectLean: vi.fn(),
  aggregate: vi.fn(),
  deleteMany: vi.fn(),
  deleteChatResourcesBySource: vi.fn()
}));

vi.mock('@fastgpt/service/core/customerService/project/schema', () => ({
  MongoCustomerServiceProject: {
    find: vi.fn(() => ({
      select: vi.fn(() => ({ lean: mocks.projectLean }))
    }))
  }
}));

vi.mock('@fastgpt/service/core/customerService/request/schema', () => ({
  MongoCustomerServiceRequest: {
    aggregate: mocks.aggregate,
    deleteMany: mocks.deleteMany
  }
}));

vi.mock('@fastgpt/service/core/chat/delete', () => ({
  deleteChatResourcesBySource: mocks.deleteChatResourcesBySource
}));

import { cleanupCustomerServiceExpiredSessions } from '@fastgpt/service/core/customerService/request/retention';

describe('customer service session retention cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mocks.deleteChatResourcesBySource.mockResolvedValue(undefined);
  });

  it('deletes only complete sessions selected by their latest activity', async () => {
    mocks.projectLean.mockResolvedValue([
      { _id: 'project-1', appId: 'app-1', sessionRetentionDays: 30 }
    ]);
    mocks.aggregate.mockResolvedValue([{ _id: 'expired-chat-1' }, { _id: 'expired-chat-2' }]);

    await expect(
      cleanupCustomerServiceExpiredSessions({
        now: new Date('2026-08-11T00:00:00.000Z'),
        batchSize: 10
      })
    ).resolves.toEqual({ deletedSessions: 2 });

    expect(mocks.aggregate).toHaveBeenCalledWith([
      { $match: { projectId: 'project-1' } },
      { $group: { _id: '$internalChatId', lastUpdateTime: { $max: '$updateTime' } } },
      { $match: { lastUpdateTime: { $lt: new Date('2026-07-12T00:00:00.000Z') } } },
      { $limit: 10 }
    ]);
    expect(mocks.deleteChatResourcesBySource).toHaveBeenCalledWith({
      sourceType: 'app',
      sourceId: 'app-1',
      chatIds: ['expired-chat-1', 'expired-chat-2']
    });
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      projectId: 'project-1',
      internalChatId: { $in: ['expired-chat-1', 'expired-chat-2'] }
    });
  });

  it('does not call the destructive chat cleanup when no session expired', async () => {
    mocks.projectLean.mockResolvedValue([
      { _id: 'project-1', appId: 'app-1', sessionRetentionDays: 30 }
    ]);
    mocks.aggregate.mockResolvedValue([]);

    await expect(cleanupCustomerServiceExpiredSessions()).resolves.toEqual({
      deletedSessions: 0
    });
    expect(mocks.deleteChatResourcesBySource).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
