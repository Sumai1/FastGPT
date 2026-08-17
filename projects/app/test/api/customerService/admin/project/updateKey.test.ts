import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authCustomerServiceAdmin: vi.fn(),
  authCustomerServiceAppManage: vi.fn(),
  authOpenApiKeyCrud: vi.fn(),
  findCustomerServiceKeyBindingById: vi.fn(),
  findCustomerServiceProjectById: vi.fn(),
  updateCustomerServiceKeyBindingStatus: vi.fn()
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: unknown) => handler
}));
vi.mock('@/service/customerService/adminAuth', () => ({
  authCustomerServiceAdmin: mocks.authCustomerServiceAdmin,
  authCustomerServiceAppManage: mocks.authCustomerServiceAppManage
}));
vi.mock('@fastgpt/service/support/permission/auth/openapi', () => ({
  authOpenApiKeyCrud: mocks.authOpenApiKeyCrud
}));
vi.mock('@fastgpt/service/core/customerService/project/entity', () => ({
  findCustomerServiceKeyBindingById: mocks.findCustomerServiceKeyBindingById,
  findCustomerServiceProjectById: mocks.findCustomerServiceProjectById
}));
vi.mock('@fastgpt/service/core/customerService/project/service', () => ({
  updateCustomerServiceKeyBindingStatus: mocks.updateCustomerServiceKeyBindingStatus
}));

import { handler } from '@/pages/api/customer-service/admin/project/updateKey';

const bindingId = '68ad85a7463006c963799a01';
const projectId = '68ad85a7463006c963799a02';
const appId = '68ad85a7463006c963799a03';
const openApiKeyId = '68ad85a7463006c963799a04';

const createRequest = () =>
  ({
    body: {
      bindingId,
      status: 'inactive',
      reason: 'Key 已轮换'
    }
  }) as unknown as NextApiRequest;

describe('customer service project updateKey API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authCustomerServiceAdmin.mockResolvedValue({
      teamId: 'team-1',
      tmbId: 'member-1',
      isRoot: false
    });
    mocks.findCustomerServiceKeyBindingById.mockResolvedValue({
      _id: bindingId,
      projectId,
      openApiKeyId
    });
    mocks.findCustomerServiceProjectById.mockResolvedValue({
      _id: projectId,
      appId
    });
    mocks.authCustomerServiceAppManage.mockResolvedValue(undefined);
    mocks.authOpenApiKeyCrud.mockResolvedValue({
      teamId: 'team-1',
      tmbId: 'member-1',
      openapi: { _id: openApiKeyId }
    });
    mocks.updateCustomerServiceKeyBindingStatus.mockResolvedValue({ _id: bindingId });
  });

  it('checks native OpenAPI Key ownership before changing the binding', async () => {
    const req = createRequest();

    await expect(handler(req)).resolves.toBeUndefined();

    expect(mocks.authOpenApiKeyCrud).toHaveBeenCalledWith({
      req,
      authToken: true,
      id: openApiKeyId
    });
    expect(mocks.authOpenApiKeyCrud.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.updateCustomerServiceKeyBindingStatus.mock.invocationCallOrder[0]
    );
    expect(mocks.updateCustomerServiceKeyBindingStatus).toHaveBeenCalledWith({
      teamId: 'team-1',
      tmbId: 'member-1',
      bindingId,
      status: 'inactive',
      reason: 'Key 已轮换'
    });
  });

  it('does not mutate a binding when native Key ownership is denied', async () => {
    mocks.authOpenApiKeyCrud.mockRejectedValueOnce(new Error('OpenAPI Key is not owned'));

    await expect(handler(createRequest())).rejects.toThrow('OpenAPI Key is not owned');

    expect(mocks.updateCustomerServiceKeyBindingStatus).not.toHaveBeenCalled();
  });
});
