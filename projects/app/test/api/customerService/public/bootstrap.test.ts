import type { NextApiRequest } from 'next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';

const mocks = vi.hoisted(() => ({
  authPublicProject: vi.fn(),
  listActiveProductCatalog: vi.fn(),
  formatPublicCatalog: vi.fn()
}));

vi.mock('@/service/customerService/publicAuth', () => ({
  authCustomerServicePublicProject: mocks.authPublicProject
}));
vi.mock('@fastgpt/service/core/customerService/product/entity', () => ({
  listActiveProductCatalog: mocks.listActiveProductCatalog
}));
vi.mock('@/service/customerService/format', () => ({
  formatCustomerServicePublicProductCatalog: mocks.formatPublicCatalog
}));

import { handler } from '@/pages/api/customer-service/public/bootstrap';

const publicId = 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8';
const projectId = '68ad85a7463006c963799a01';
const modelId = '68ad85a7463006c963799a02';
const datasetId = '68ad85a7463006c963799a03';

describe('customer service public bootstrap API boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authPublicProject.mockResolvedValue({
      teamId: '68ad85a7463006c963799a04',
      project: {
        _id: projectId,
        publicId,
        modelIds: [modelId],
        name: '产品智能客服',
        welcomeText: '您好，请选择产品型号。',
        recommendedQuestions: ['设备报错怎么排查？'],
        humanContact: { name: '人工客服', phone: '400-000-0000' }
      }
    });
    mocks.listActiveProductCatalog.mockResolvedValue(['internal-catalog']);
    mocks.formatPublicCatalog.mockReturnValue({
      categories: [
        {
          code: 'PHOTO',
          name: '拍照机',
          aliases: [],
          description: '',
          status: CustomerServiceResourceStatusEnum.active,
          sortOrder: 0
        }
      ],
      series: [
        {
          categoryCode: 'PHOTO',
          code: 'DESKTOP',
          name: '桌面系列',
          aliases: [],
          description: '',
          status: CustomerServiceResourceStatusEnum.active,
          sortOrder: 0
        }
      ],
      models: [
        {
          categoryCode: 'PHOTO',
          seriesCode: 'DESKTOP',
          modelCode: 'DT-2026A',
          name: 'DT-2026A',
          aliases: [],
          description: '',
          status: CustomerServiceProductStatusEnum.active,
          discontinuedAt: null,
          sortOrder: 0,
          datasetIds: [datasetId]
        }
      ],
      versions: []
    });
  });

  it('loads only the addressed project and strips internal catalog fields', async () => {
    const response = await handler({ query: { publicId } } as unknown as NextApiRequest);

    expect(mocks.authPublicProject).toHaveBeenCalledWith({ publicId });
    expect(mocks.listActiveProductCatalog).toHaveBeenCalledWith({
      teamId: '68ad85a7463006c963799a04',
      modelIds: [modelId]
    });
    expect(mocks.formatPublicCatalog).toHaveBeenCalledWith(['internal-catalog']);
    expect(response.project).toEqual({
      publicId,
      name: '产品智能客服',
      welcomeText: '您好，请选择产品型号。',
      recommendedQuestions: ['设备报错怎么排查？'],
      humanContact: { name: '人工客服', phone: '400-000-0000' }
    });
    expect(response.catalog.models).toEqual([
      expect.objectContaining({ modelCode: 'DT-2026A' })
    ]);
    expect(JSON.stringify(response)).not.toMatch(/projectId|datasetIds/);
    expect(JSON.stringify(response)).not.toContain(projectId);
    expect(JSON.stringify(response)).not.toContain(datasetId);
  });
});
