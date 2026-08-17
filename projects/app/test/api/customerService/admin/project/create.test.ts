import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authCustomerServiceAdmin: vi.fn(),
  authCustomerServiceAppManage: vi.fn(),
  authCustomerServiceDatasets: vi.fn(),
  findProductModelById: vi.fn(),
  createCustomerServiceProjectWithApp: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceAdmin: mocks.authCustomerServiceAdmin,
  authCustomerServiceAppManage: mocks.authCustomerServiceAppManage,
  authCustomerServiceDatasets: mocks.authCustomerServiceDatasets
}));
vi.mock('@fastgpt/service/core/customerService/product/entity', () => ({
  findProductModelById: mocks.findProductModelById
}));
vi.mock('@fastgpt/service/core/customerService/project/service', () => ({
  createCustomerServiceProjectWithApp: mocks.createCustomerServiceProjectWithApp
}));

import { handler } from '@/pages/api/customer-service/admin/project/create';

const appId = '68ad85a7463006c963799a01';
const modelA = '68ad85a7463006c963799a02';
const modelB = '68ad85a7463006c963799a03';
const datasetA = '68ad85a7463006c963799a04';
const datasetB = '68ad85a7463006c963799a05';

const body = {
  appId,
  projectCode: 'PHOTO_SUPPORT',
  name: '拍照机客服',
  modelIds: [modelA, modelB]
};

const createRequest = (requestBody = body) => ({ body: requestBody }) as unknown as NextApiRequest;

describe('customer service project create API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCustomerServiceAdmin.mockResolvedValue({
      teamId: 'team-1',
      tmbId: 'member-1',
      isRoot: false
    });
    mocks.authCustomerServiceAppManage.mockResolvedValue(undefined);
    mocks.findProductModelById.mockImplementation(async ({ id }: { id: string }) =>
      id === modelA
        ? { _id: modelA, datasetIds: [datasetA] }
        : { _id: modelB, datasetIds: [datasetB] }
    );
    mocks.authCustomerServiceDatasets.mockResolvedValue(undefined);
    mocks.createCustomerServiceProjectWithApp.mockResolvedValue({
      _id: '68ad85a7463006c963799a06'
    });
  });

  it('requires native Dataset Manage permission for every selected model dataset', async () => {
    const req = createRequest();

    await expect(handler(req)).resolves.toEqual({ id: '68ad85a7463006c963799a06' });

    expect(mocks.authCustomerServiceAppManage).toHaveBeenCalledWith({
      tmbId: 'member-1',
      appId,
      isRoot: false
    });
    expect(mocks.authCustomerServiceDatasets).toHaveBeenCalledWith({
      tmbId: 'member-1',
      isRoot: false,
      datasetIds: [datasetA, datasetB],
      mode: 'manage'
    });
    expect(mocks.authCustomerServiceDatasets.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.createCustomerServiceProjectWithApp.mock.invocationCallOrder[0]
    );
    expect(mocks.createCustomerServiceProjectWithApp).toHaveBeenCalledWith(
      expect.objectContaining({
        teamId: 'team-1',
        tmbId: 'member-1',
        ...body,
        sessionRetentionDays: undefined
      })
    );
  });

  it('does not create a project when a selected Dataset cannot be managed', async () => {
    mocks.authCustomerServiceDatasets.mockRejectedValueOnce(new Error('Dataset manage denied'));

    await expect(handler(createRequest())).rejects.toThrow('Dataset manage denied');

    expect(mocks.createCustomerServiceProjectWithApp).not.toHaveBeenCalled();
  });
});
