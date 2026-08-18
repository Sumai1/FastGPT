import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authRoles: vi.fn(),
  authDatasets: vi.fn(),
  findKnowledge: vi.fn(),
  publishKnowledge: vi.fn(),
  rejectKnowledge: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceRoles: mocks.authRoles,
  authCustomerServiceDatasets: mocks.authDatasets
}));
vi.mock('@fastgpt/service/core/customerService/knowledge/entity', () => ({
  findCustomerServiceKnowledgeById: mocks.findKnowledge
}));
vi.mock('@fastgpt/service/core/customerService/knowledge/service', () => ({
  publishCustomerServiceKnowledge: mocks.publishKnowledge,
  rejectCustomerServiceKnowledge: mocks.rejectKnowledge
}));

import { default as handler } from '@/pages/api/customer-service/admin/knowledge/review';

describe('customer service knowledge review API', () => {
  const teamId = '68ad85a7463006c963799a01';
  const tmbId = '68ad85a7463006c963799a02';
  const knowledgeId = '68ad85a7463006c963799a15';
  const datasetId = '68ad85a7463006c963799a20';

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authRoles.mockResolvedValue({ teamId, tmbId, isRoot: false });
    mocks.authDatasets.mockResolvedValue(undefined);
    mocks.publishKnowledge.mockResolvedValue({});
    mocks.rejectKnowledge.mockResolvedValue({});
  });

  it('forbids submitter from reviewing their own knowledge draft', async () => {
    mocks.findKnowledge.mockResolvedValue({
      _id: knowledgeId,
      datasetId,
      submitterTmbId: tmbId,
      status: 'pending'
    });

    const req = {
      body: { knowledgeId, action: 'publish' }
    } as unknown as NextApiRequest;

    await expect(handler(req)).rejects.toThrow(
      '双人复核原则：您是该知识草稿的提交人，禁止自审，请交由其他审核员审批'
    );
  });

  it('allows a different reviewer to publish knowledge draft', async () => {
    const otherSubmitterTmbId = '68ad85a7463006c963799a99';
    mocks.findKnowledge.mockResolvedValue({
      _id: knowledgeId,
      datasetId,
      submitterTmbId: otherSubmitterTmbId,
      status: 'pending'
    });

    const req = {
      body: { knowledgeId, action: 'publish' }
    } as unknown as NextApiRequest;

    const result = await handler(req);
    expect(result).toBeUndefined();
    expect(mocks.publishKnowledge).toHaveBeenCalledWith({
      teamId,
      reviewerTmbId: tmbId,
      knowledgeId
    });
  });
});
