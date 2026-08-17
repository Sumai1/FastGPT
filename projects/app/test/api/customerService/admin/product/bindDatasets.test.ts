import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authCustomerServiceAdmin: vi.fn(),
  authCustomerServiceAppManage: vi.fn(),
  authCustomerServiceDatasets: vi.fn(),
  bindCustomerServiceModelDatasets: vi.fn(),
  listCustomerServiceProjectsByModelId: vi.fn(),
  listProductModelsByIds: vi.fn(),
  syncManagedCustomerServiceWorkflowDatasets: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceAdmin: mocks.authCustomerServiceAdmin,
  authCustomerServiceAppManage: mocks.authCustomerServiceAppManage,
  authCustomerServiceDatasets: mocks.authCustomerServiceDatasets
}));
vi.mock('@fastgpt/service/core/customerService/product/service', () => ({
  bindCustomerServiceModelDatasets: mocks.bindCustomerServiceModelDatasets
}));
vi.mock('@fastgpt/service/core/customerService/project/entity', () => ({
  listCustomerServiceProjectsByModelId: mocks.listCustomerServiceProjectsByModelId
}));
vi.mock('@fastgpt/service/core/customerService/product/entity', () => ({
  listProductModelsByIds: mocks.listProductModelsByIds
}));
vi.mock('@/service/customerService/managedProject', () => ({
  syncManagedCustomerServiceWorkflowDatasets: mocks.syncManagedCustomerServiceWorkflowDatasets
}));

import { handler } from '@/pages/api/customer-service/admin/product/bindDatasets';

const modelId = '68ad85a7463006c963799a01';
const newDatasetId = '68ad85a7463006c963799a02';
const oldDatasetId = '68ad85a7463006c963799a03';
const projectAId = '68ad85a7463006c963799a04';
const projectBId = '68ad85a7463006c963799a05';
const appAId = '68ad85a7463006c963799a06';
const appBId = '68ad85a7463006c963799a07';

const body = {
  modelId,
  datasetIds: [newDatasetId]
};

const createRequest = (requestBody = body) => ({ body: requestBody }) as unknown as NextApiRequest;

describe('customer service product bindDatasets API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCustomerServiceAdmin.mockResolvedValue({
      teamId: 'team-1',
      tmbId: 'member-1',
      isRoot: false
    });
    mocks.authCustomerServiceDatasets.mockResolvedValue(undefined);
    mocks.listCustomerServiceProjectsByModelId.mockResolvedValue([
      {
        _id: projectAId,
        appId: appAId,
        modelIds: [modelId],
        name: '客服 A'
      },
      {
        _id: projectBId,
        appId: appBId,
        modelIds: [modelId],
        name: '客服 B'
      }
    ]);
    mocks.listProductModelsByIds.mockResolvedValue([
      {
        _id: modelId,
        datasetIds: [oldDatasetId]
      }
    ]);
    mocks.authCustomerServiceAppManage.mockResolvedValue(undefined);
    mocks.bindCustomerServiceModelDatasets.mockResolvedValue({ _id: modelId });
    mocks.syncManagedCustomerServiceWorkflowDatasets.mockResolvedValue(undefined);
  });

  it('checks new and old Dataset Manage scopes plus every affected App before mutation', async () => {
    const req = createRequest();

    await expect(handler(req)).resolves.toEqual({
      syncedProjects: 2,
      failedProjects: []
    });

    expect(mocks.authCustomerServiceDatasets).toHaveBeenNthCalledWith(1, {
      tmbId: 'member-1',
      isRoot: false,
      datasetIds: [newDatasetId],
      mode: 'manage'
    });
    expect(mocks.authCustomerServiceDatasets).toHaveBeenNthCalledWith(2, {
      tmbId: 'member-1',
      isRoot: false,
      datasetIds: [oldDatasetId],
      mode: 'manage'
    });
    expect(mocks.authCustomerServiceAppManage).toHaveBeenCalledTimes(2);
    expect(mocks.authCustomerServiceAppManage).toHaveBeenCalledWith({
      tmbId: 'member-1',
      appId: appAId,
      isRoot: false
    });
    expect(mocks.authCustomerServiceAppManage).toHaveBeenCalledWith({
      tmbId: 'member-1',
      appId: appBId,
      isRoot: false
    });

    const mutationOrder = mocks.bindCustomerServiceModelDatasets.mock.invocationCallOrder[0];
    expect(
      mocks.authCustomerServiceDatasets.mock.invocationCallOrder.every(
        (order) => order < mutationOrder
      )
    ).toBe(true);
    expect(
      mocks.authCustomerServiceAppManage.mock.invocationCallOrder.every(
        (order) => order < mutationOrder
      )
    ).toBe(true);
    expect(mocks.bindCustomerServiceModelDatasets).toHaveBeenCalledWith({
      teamId: 'team-1',
      tmbId: 'member-1',
      ...body
    });
  });

  it('does not change the model when an affected App is not manageable', async () => {
    mocks.authCustomerServiceAppManage.mockRejectedValueOnce(new Error('App manage denied'));

    await expect(handler(createRequest())).rejects.toThrow('App manage denied');

    expect(mocks.bindCustomerServiceModelDatasets).not.toHaveBeenCalled();
    expect(mocks.syncManagedCustomerServiceWorkflowDatasets).not.toHaveBeenCalled();
  });
});
