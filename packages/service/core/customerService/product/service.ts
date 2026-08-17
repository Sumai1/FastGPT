import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import type { ClientSession } from '../../../common/mongo';
import {
  createProductCategory,
  createProductModel,
  createProductSeries,
  createProductVersion,
  findProductCategoryById,
  findProductModelById,
  findProductSeriesById,
  findProductVersionById,
  updateProductCategoryById,
  updateProductModelById,
  updateProductModelDatasets,
  updateProductSeriesById,
  updateProductVersionById
} from './entity';
import type { CustomerServiceVersionTypeEnum } from '@fastgpt/global/core/customerService/constants';

const normalizeCode = (code: string) => code.trim().toUpperCase();
const normalizeAliases = (aliases: string[] = []) =>
  Array.from(new Set(aliases.map((item) => item.trim()).filter(Boolean)));

/** 创建产品大类并统一规范编码、名称和别名。 */
export const createCustomerServiceProductCategory = ({
  teamId,
  tmbId,
  code,
  name,
  aliases = [],
  description = '',
  sortOrder = 0,
  session
}: {
  teamId: string;
  tmbId: string;
  code: string;
  name: string;
  aliases?: string[];
  description?: string;
  sortOrder?: number;
  session?: ClientSession;
}) =>
  createProductCategory(
    {
      teamId,
      tmbId,
      updateTmbId: tmbId,
      code: normalizeCode(code),
      name: name.trim(),
      aliases: normalizeAliases(aliases),
      description: description.trim(),
      status: CustomerServiceResourceStatusEnum.active,
      sortOrder
    },
    session
  );

/** 创建产品系列，并确认父级大类属于同一团队。 */
export const createCustomerServiceProductSeries = async ({
  teamId,
  tmbId,
  categoryId,
  code,
  name,
  aliases = [],
  description = '',
  sortOrder = 0,
  session
}: {
  teamId: string;
  tmbId: string;
  categoryId: string;
  code: string;
  name: string;
  aliases?: string[];
  description?: string;
  sortOrder?: number;
  session?: ClientSession;
}) => {
  if (!(await findProductCategoryById({ teamId, id: categoryId }))) {
    throw new UserError('Product category not found');
  }

  return createProductSeries(
    {
      teamId,
      tmbId,
      updateTmbId: tmbId,
      categoryId,
      code: normalizeCode(code),
      name: name.trim(),
      aliases: normalizeAliases(aliases),
      description: description.trim(),
      status: CustomerServiceResourceStatusEnum.active,
      sortOrder
    },
    session
  );
};

/** 创建产品型号，并确认系列归属；dataset 权限在 API 鉴权层叠加校验。 */
export const createCustomerServiceProductModel = async ({
  teamId,
  tmbId,
  seriesId,
  modelCode,
  name,
  aliases = [],
  description = '',
  datasetIds = [],
  sortOrder = 0,
  session
}: {
  teamId: string;
  tmbId: string;
  seriesId: string;
  modelCode: string;
  name: string;
  aliases?: string[];
  description?: string;
  datasetIds?: string[];
  sortOrder?: number;
  session?: ClientSession;
}) => {
  if (!(await findProductSeriesById({ teamId, id: seriesId }))) {
    throw new UserError('Product series not found');
  }

  return createProductModel(
    {
      teamId,
      tmbId,
      updateTmbId: tmbId,
      seriesId,
      modelCode: normalizeCode(modelCode),
      name: name.trim(),
      aliases: normalizeAliases(aliases),
      description: description.trim(),
      status: CustomerServiceProductStatusEnum.active,
      datasetIds: Array.from(new Set(datasetIds)),
      sortOrder
    },
    session
  );
};

/** 创建软/硬件版本，时间范围非法时直接拒绝。 */
export const createCustomerServiceProductVersion = async ({
  teamId,
  tmbId,
  modelId,
  type,
  versionCode,
  name,
  aliases = [],
  description = '',
  effectiveFrom,
  effectiveTo,
  session
}: {
  teamId: string;
  tmbId: string;
  modelId: string;
  type: CustomerServiceVersionTypeEnum;
  versionCode: string;
  name: string;
  aliases?: string[];
  description?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  session?: ClientSession;
}) => {
  if (!(await findProductModelById({ teamId, id: modelId }))) {
    throw new UserError('Product model not found');
  }
  if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    throw new UserError('Version effective time range is invalid');
  }

  return createProductVersion(
    {
      teamId,
      tmbId,
      updateTmbId: tmbId,
      modelId,
      type,
      versionCode: normalizeCode(versionCode),
      name: name.trim(),
      aliases: normalizeAliases(aliases),
      description: description.trim(),
      status: CustomerServiceResourceStatusEnum.active,
      effectiveFrom,
      effectiveTo
    },
    session
  );
};

/** 替换型号绑定的 dataset；调用方必须先逐个完成 dataset manage 权限校验。 */
export const bindCustomerServiceModelDatasets = ({
  teamId,
  tmbId,
  modelId,
  datasetIds,
  session
}: {
  teamId: string;
  tmbId: string;
  modelId: string;
  datasetIds: string[];
  session?: ClientSession;
}) =>
  updateProductModelDatasets({
    teamId,
    id: modelId,
    datasetIds: Array.from(new Set(datasetIds)),
    updateTmbId: tmbId,
    session
  });

/** 更新产品资源的公共可编辑字段；父级归属和 dataset 权限由调用方提前校验。 */
export const updateCustomerServiceProductResource = async ({
  teamId,
  tmbId,
  resourceType,
  id,
  code,
  name,
  aliases,
  description,
  status,
  sortOrder,
  discontinuedAt,
  effectiveFrom,
  effectiveTo,
  session
}: {
  teamId: string;
  tmbId: string;
  resourceType: 'category' | 'series' | 'model' | 'version';
  id: string;
  code?: string;
  name?: string;
  aliases?: string[];
  description?: string;
  status?: CustomerServiceResourceStatusEnum | CustomerServiceProductStatusEnum;
  sortOrder?: number;
  discontinuedAt?: Date | null;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  session?: ClientSession;
}) => {
  if (
    resourceType !== 'model' &&
    status !== undefined &&
    status === CustomerServiceProductStatusEnum.discontinued
  ) {
    throw new UserError('Only product model can be discontinued');
  }
  if (resourceType === 'version' && (effectiveFrom !== undefined || effectiveTo !== undefined)) {
    const current = await findProductVersionById({ teamId, id });
    if (!current) throw new UserError('Product version not found');
    const nextEffectiveFrom = effectiveFrom === undefined ? current.effectiveFrom : effectiveFrom;
    const nextEffectiveTo = effectiveTo === undefined ? current.effectiveTo : effectiveTo;
    if (nextEffectiveFrom && nextEffectiveTo && nextEffectiveFrom > nextEffectiveTo) {
      throw new UserError('Version effective time range is invalid');
    }
  }
  const commonUpdate = {
    ...(name !== undefined && { name: name.trim() }),
    ...(aliases !== undefined && { aliases: normalizeAliases(aliases) }),
    ...(description !== undefined && { description: description.trim() }),
    ...(status !== undefined && { status }),
    ...(sortOrder !== undefined && { sortOrder }),
    updateTmbId: tmbId
  };

  if (resourceType === 'category') {
    return updateProductCategoryById({
      teamId,
      id,
      update: {
        ...commonUpdate,
        ...(code !== undefined && { code: normalizeCode(code) })
      },
      session
    });
  }
  if (resourceType === 'series') {
    return updateProductSeriesById({
      teamId,
      id,
      update: {
        ...commonUpdate,
        ...(code !== undefined && { code: normalizeCode(code) })
      },
      session
    });
  }
  if (resourceType === 'model') {
    return updateProductModelById({
      teamId,
      id,
      update: {
        ...commonUpdate,
        ...(code !== undefined && { modelCode: normalizeCode(code) }),
        ...(discontinuedAt !== undefined && { discontinuedAt })
      },
      session
    });
  }

  return updateProductVersionById({
    teamId,
    id,
    update: {
      ...commonUpdate,
      ...(code !== undefined && { versionCode: normalizeCode(code) }),
      ...(effectiveFrom !== undefined && { effectiveFrom }),
      ...(effectiveTo !== undefined && { effectiveTo })
    },
    session
  });
};
