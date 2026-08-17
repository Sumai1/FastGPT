import { beforeAll, describe, expect, it } from 'vitest';
import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { listActiveProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import {
  MongoCustomerServiceProductCategory,
  MongoCustomerServiceProductModel,
  MongoCustomerServiceProductSeries,
  MongoCustomerServiceProductVersion
} from '@fastgpt/service/core/customerService/product/schema';
import { updateCustomerServiceProductResource } from '@fastgpt/service/core/customerService/product/service';

const id = () => new Types.ObjectId();

describe('customer service product catalog', () => {
  beforeAll(async () => {
    await Promise.all([
      MongoCustomerServiceProductCategory.syncIndexes(),
      MongoCustomerServiceProductSeries.syncIndexes(),
      MongoCustomerServiceProductModel.syncIndexes(),
      MongoCustomerServiceProductVersion.syncIndexes()
    ]);
  });

  it('returns only selected model ancestors and currently effective versions', async () => {
    const teamId = id();
    const tmbId = id();
    const [selectedCategory, otherCategory] = await MongoCustomerServiceProductCategory.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        code: `CATEGORY_${String(id())}`,
        name: 'Selected category',
        status: CustomerServiceResourceStatusEnum.active
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        code: `CATEGORY_${String(id())}`,
        name: 'Other category',
        status: CustomerServiceResourceStatusEnum.active
      }
    ]);
    const [selectedSeries, otherSeries] = await MongoCustomerServiceProductSeries.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        categoryId: selectedCategory._id,
        code: `SERIES_${String(id())}`,
        name: 'Selected series',
        status: CustomerServiceResourceStatusEnum.active
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        categoryId: otherCategory._id,
        code: `SERIES_${String(id())}`,
        name: 'Other series',
        status: CustomerServiceResourceStatusEnum.active
      }
    ]);
    const [selectedModel] = await MongoCustomerServiceProductModel.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId: selectedSeries._id,
        modelCode: `MODEL_${String(id())}`,
        name: 'Selected model',
        status: CustomerServiceProductStatusEnum.active
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        seriesId: otherSeries._id,
        modelCode: `MODEL_${String(id())}`,
        name: 'Other model',
        status: CustomerServiceProductStatusEnum.active
      }
    ]);
    const [activeVersion, expiredVersion] = await MongoCustomerServiceProductVersion.create([
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        modelId: selectedModel._id,
        type: CustomerServiceVersionTypeEnum.software,
        versionCode: 'V1',
        name: 'V1',
        status: CustomerServiceResourceStatusEnum.active,
        effectiveFrom: new Date('2026-01-01T00:00:00.000Z')
      },
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        modelId: selectedModel._id,
        type: CustomerServiceVersionTypeEnum.software,
        versionCode: 'V0',
        name: 'V0',
        status: CustomerServiceResourceStatusEnum.active,
        effectiveTo: new Date('2025-12-31T00:00:00.000Z')
      }
    ]);

    const [categories, series, models, versions] = await listActiveProductCatalog({
      teamId: String(teamId),
      modelIds: [String(selectedModel._id)],
      now: new Date('2026-08-11T00:00:00.000Z')
    });
    expect(categories.map((item) => String(item._id))).toEqual([String(selectedCategory._id)]);
    expect(categories.map((item) => String(item._id))).not.toContain(String(otherCategory._id));
    expect(series.map((item) => String(item._id))).toEqual([String(selectedSeries._id)]);
    expect(models.map((item) => String(item._id))).toEqual([String(selectedModel._id)]);
    expect(versions.map((item) => String(item._id))).toEqual([String(activeVersion._id)]);
    expect(versions.map((item) => String(item._id))).not.toContain(String(expiredVersion._id));
  });

  it('validates a partial version effective-range update against the stored boundary', async () => {
    const teamId = id();
    const tmbId = id();
    const version = await MongoCustomerServiceProductVersion.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      modelId: id(),
      type: CustomerServiceVersionTypeEnum.hardware,
      versionCode: `HW_${String(id())}`,
      name: 'Hardware version',
      status: CustomerServiceResourceStatusEnum.active,
      effectiveTo: new Date('2026-06-01T00:00:00.000Z')
    });

    await expect(
      updateCustomerServiceProductResource({
        teamId: String(teamId),
        tmbId: String(tmbId),
        resourceType: 'version',
        id: String(version._id),
        effectiveFrom: new Date('2026-07-01T00:00:00.000Z')
      })
    ).rejects.toThrow('Version effective time range is invalid');
  });
});
