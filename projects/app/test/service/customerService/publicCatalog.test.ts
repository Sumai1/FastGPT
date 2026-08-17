import { describe, expect, it } from 'vitest';
import { Types } from '@fastgpt/service/common/mongo';
import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import {
  MongoCustomerServiceProductCategory,
  MongoCustomerServiceProductModel,
  MongoCustomerServiceProductSeries,
  MongoCustomerServiceProductVersion
} from '@fastgpt/service/core/customerService/product/schema';
import { listActiveProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import { formatCustomerServicePublicProductCatalog } from '@/service/customerService/format';

describe('formatCustomerServicePublicProductCatalog', () => {
  it('uses business codes for relations and removes every internal resource id', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const datasetId = new Types.ObjectId();
    const category = await MongoCustomerServiceProductCategory.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      code: 'PHOTO',
      name: '拍照设备',
      status: CustomerServiceResourceStatusEnum.active
    });
    const series = await MongoCustomerServiceProductSeries.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      categoryId: category._id,
      code: 'DESKTOP',
      name: '桌面系列',
      status: CustomerServiceResourceStatusEnum.active
    });
    const model = await MongoCustomerServiceProductModel.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      seriesId: series._id,
      modelCode: 'DT-2026A',
      name: 'DT-2026A 拍照机',
      status: CustomerServiceProductStatusEnum.active,
      datasetIds: [datasetId]
    });
    const version = await MongoCustomerServiceProductVersion.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      modelId: model._id,
      type: CustomerServiceVersionTypeEnum.software,
      versionCode: 'V3.1',
      name: '软件 V3.1',
      status: CustomerServiceResourceStatusEnum.active
    });

    const result = formatCustomerServicePublicProductCatalog(
      await listActiveProductCatalog({
        teamId: String(teamId),
        modelIds: [String(model._id)]
      })
    );

    expect(result.models).toEqual([
      expect.objectContaining({
        categoryCode: 'PHOTO',
        seriesCode: 'DESKTOP',
        modelCode: 'DT-2026A'
      })
    ]);
    expect(result.versions).toEqual([
      expect.objectContaining({ modelCode: 'DT-2026A', versionCode: 'V3.1' })
    ]);

    const serialized = JSON.stringify(result);
    [teamId, tmbId, datasetId, category._id, series._id, model._id, version._id].forEach((id) =>
      expect(serialized).not.toContain(String(id))
    );
    expect(serialized).not.toMatch(/"(?:_id|id|categoryId|seriesId|modelId|datasetIds|teamId)"/);
  });

  it('treats an empty project model scope as no visible products', async () => {
    const [categories, series, models, versions] = await listActiveProductCatalog({
      teamId: String(new Types.ObjectId()),
      modelIds: []
    });

    expect({ categories, series, models, versions }).toEqual({
      categories: [],
      series: [],
      models: [],
      versions: []
    });
  });
});
