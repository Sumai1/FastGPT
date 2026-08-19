import { describe, it, expect } from 'vitest';
import type { CustomerServicePublicProductCatalogResponse } from '../../src/types';

describe('Product 4-Tier Hierarchy Cascade Logic', () => {
  const mockCatalog: CustomerServicePublicProductCatalogResponse = {
    categories: [
      {
        code: 'PHOTO',
        name: '自助拍照机专区',
        aliases: [],
        description: '',
        status: 'active',
        sortOrder: 1
      },
      {
        code: 'VENDING',
        name: '智能售货机专区',
        aliases: [],
        description: '',
        status: 'active',
        sortOrder: 2
      }
    ],
    series: [
      {
        categoryCode: 'PHOTO',
        code: 'PHOTO_DESKTOP',
        name: '桌面立式系列',
        aliases: [],
        description: '',
        status: 'active',
        sortOrder: 1
      },
      {
        categoryCode: 'PHOTO',
        code: 'PHOTO_BOOTH',
        name: '沉浸亭式系列',
        aliases: [],
        description: '',
        status: 'active',
        sortOrder: 2
      },
      {
        categoryCode: 'VENDING',
        code: 'VEND_SPRING',
        name: '弹簧履带零售系列',
        aliases: [],
        description: '',
        status: 'active',
        sortOrder: 1
      }
    ],
    models: [
      {
        categoryCode: 'PHOTO',
        seriesCode: 'PHOTO_DESKTOP',
        modelCode: 'PHOTO-DT2026',
        name: 'DT-2026 桌面拍照机',
        aliases: [],
        description: '',
        status: 'active',
        discontinuedAt: null,
        sortOrder: 1
      },
      {
        categoryCode: 'PHOTO',
        seriesCode: 'PHOTO_BOOTH',
        modelCode: 'PHOTO-BT400',
        name: 'BT-400 沉浸拍照亭',
        aliases: [],
        description: '',
        status: 'active',
        discontinuedAt: null,
        sortOrder: 2
      },
      {
        categoryCode: 'VENDING',
        seriesCode: 'VEND_SPRING',
        modelCode: 'VEND-SP60',
        name: 'SP-60 综合售货机',
        aliases: [],
        description: '',
        status: 'active',
        discontinuedAt: null,
        sortOrder: 1
      }
    ],
    versions: [
      {
        modelCode: 'PHOTO-DT2026',
        type: 'hardware',
        versionCode: 'HW-V1.0',
        name: '硬件 V1.0',
        aliases: [],
        description: '',
        status: 'active',
        effectiveFrom: null,
        effectiveTo: null
      },
      {
        modelCode: 'PHOTO-DT2026',
        type: 'hardware',
        versionCode: 'HW-V2.0',
        name: '硬件 V2.0',
        aliases: [],
        description: '',
        status: 'active',
        effectiveFrom: null,
        effectiveTo: null
      },
      {
        modelCode: 'PHOTO-DT2026',
        type: 'software',
        versionCode: 'SW-V3.5.0',
        name: '软件 V3.5.0',
        aliases: [],
        description: '',
        status: 'active',
        effectiveFrom: null,
        effectiveTo: null
      }
    ]
  };

  it('should filter series by category', () => {
    const photoSeries = mockCatalog.series.filter((s) => s.categoryCode === 'PHOTO');
    expect(photoSeries.length).toBe(2);
    expect(photoSeries.map((s) => s.code)).toEqual(['PHOTO_DESKTOP', 'PHOTO_BOOTH']);

    const vendSeries = mockCatalog.series.filter((s) => s.categoryCode === 'VENDING');
    expect(vendSeries.length).toBe(1);
    expect(vendSeries[0].code).toBe('VEND_SPRING');
  });

  it('should filter models by series and category', () => {
    const desktopModels = mockCatalog.models.filter((m) => m.seriesCode === 'PHOTO_DESKTOP');
    expect(desktopModels.length).toBe(1);
    expect(desktopModels[0].modelCode).toBe('PHOTO-DT2026');
  });

  it('should filter versions by model and distinguish HW and SW versions', () => {
    const dtVersions = mockCatalog.versions.filter((v) => v.modelCode === 'PHOTO-DT2026');
    expect(dtVersions.length).toBe(3);

    const hwVersions = dtVersions.filter((v) => v.type === 'hardware');
    expect(hwVersions.length).toBe(2);
    expect(hwVersions.map((v) => v.versionCode)).toEqual(['HW-V1.0', 'HW-V2.0']);

    const swVersions = dtVersions.filter((v) => v.type === 'software');
    expect(swVersions.length).toBe(1);
    expect(swVersions[0].versionCode).toBe('SW-V3.5.0');
  });
});
