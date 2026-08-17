import type {
  CustomerServiceProductCategoryType,
  CustomerServiceProductModelType,
  CustomerServiceProductSeriesType,
  CustomerServiceProductVersionType
} from '@fastgpt/global/core/customerService/type';
import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type { ClientSession } from '../../../common/mongo';
import {
  MongoCustomerServiceProductCategory,
  MongoCustomerServiceProductModel,
  MongoCustomerServiceProductSeries,
  MongoCustomerServiceProductVersion
} from './schema';

type CreateProductCategoryData = Omit<
  CustomerServiceProductCategoryType,
  '_id' | 'createTime' | 'updateTime'
>;
type CreateProductSeriesData = Omit<
  CustomerServiceProductSeriesType,
  '_id' | 'createTime' | 'updateTime'
>;
type CreateProductModelData = Omit<
  CustomerServiceProductModelType,
  '_id' | 'createTime' | 'updateTime'
>;
type CreateProductVersionData = Omit<
  CustomerServiceProductVersionType,
  '_id' | 'createTime' | 'updateTime'
>;

export const createProductCategory = (data: CreateProductCategoryData, session?: ClientSession) =>
  MongoCustomerServiceProductCategory.create([data], { session }).then(([item]) => item);

export const createProductSeries = (data: CreateProductSeriesData, session?: ClientSession) =>
  MongoCustomerServiceProductSeries.create([data], { session }).then(([item]) => item);

export const createProductModel = (data: CreateProductModelData, session?: ClientSession) =>
  MongoCustomerServiceProductModel.create([data], { session }).then(([item]) => item);

export const createProductVersion = (data: CreateProductVersionData, session?: ClientSession) =>
  MongoCustomerServiceProductVersion.create([data], { session }).then(([item]) => item);

export const findProductCategoryById = ({ teamId, id }: { teamId: string; id: string }) =>
  MongoCustomerServiceProductCategory.findOne({ _id: id, teamId }).lean();

export const findProductSeriesById = ({ teamId, id }: { teamId: string; id: string }) =>
  MongoCustomerServiceProductSeries.findOne({ _id: id, teamId }).lean();

export const findProductModelById = ({ teamId, id }: { teamId: string; id: string }) =>
  MongoCustomerServiceProductModel.findOne({ _id: id, teamId }).lean();

export const findProductVersionById = ({ teamId, id }: { teamId: string; id: string }) =>
  MongoCustomerServiceProductVersion.findOne({ _id: id, teamId }).lean();

export const listProductModelsByIds = ({ teamId, ids }: { teamId: string; ids: string[] }) =>
  MongoCustomerServiceProductModel.find({ teamId, _id: { $in: ids } }).lean();

export const listProductVersionsByIds = ({ teamId, ids }: { teamId: string; ids: string[] }) =>
  MongoCustomerServiceProductVersion.find({ teamId, _id: { $in: ids } }).lean();

export const updateProductModelDatasets = ({
  teamId,
  id,
  datasetIds,
  updateTmbId,
  session
}: {
  teamId: string;
  id: string;
  datasetIds: string[];
  updateTmbId: string;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProductModel.findOneAndUpdate(
    { _id: id, teamId },
    {
      $set: {
        datasetIds,
        updateTmbId,
        updateTime: new Date()
      }
    },
    { new: true, runValidators: true, session }
  ).lean();

export const updateProductCategoryById = ({
  teamId,
  id,
  update,
  session
}: {
  teamId: string;
  id: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProductCategory.findOneAndUpdate(
    { _id: id, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const updateProductSeriesById = ({
  teamId,
  id,
  update,
  session
}: {
  teamId: string;
  id: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProductSeries.findOneAndUpdate(
    { _id: id, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const updateProductModelById = ({
  teamId,
  id,
  update,
  session
}: {
  teamId: string;
  id: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProductModel.findOneAndUpdate(
    { _id: id, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const updateProductVersionById = ({
  teamId,
  id,
  update,
  session
}: {
  teamId: string;
  id: string;
  update: Record<string, unknown>;
  session?: ClientSession;
}) =>
  MongoCustomerServiceProductVersion.findOneAndUpdate(
    { _id: id, teamId },
    { $set: { ...update, updateTime: new Date() } },
    { new: true, runValidators: true, session }
  ).lean();

export const listProductCatalog = ({ teamId }: { teamId: string }) =>
  Promise.all([
    MongoCustomerServiceProductCategory.find({ teamId }).sort({ sortOrder: 1, _id: 1 }).lean(),
    MongoCustomerServiceProductSeries.find({ teamId }).sort({ sortOrder: 1, _id: 1 }).lean(),
    MongoCustomerServiceProductModel.find({ teamId }).sort({ sortOrder: 1, _id: 1 }).lean(),
    MongoCustomerServiceProductVersion.find({ teamId }).sort({ type: 1, versionCode: 1 }).lean()
  ]);

/** 返回实际可问答的产品树，只保留项目型号的祖先节点和当前有效版本。 */
export const listActiveProductCatalog = async ({
  teamId,
  modelIds,
  now = new Date()
}: {
  teamId: string;
  modelIds?: string[];
  now?: Date;
}) => {
  const models = await MongoCustomerServiceProductModel.find({
    teamId,
    status: CustomerServiceProductStatusEnum.active,
    ...(modelIds && { _id: { $in: modelIds } })
  })
    .sort({ sortOrder: 1, _id: 1 })
    .lean();
  const series = await MongoCustomerServiceProductSeries.find({
    teamId,
    status: CustomerServiceResourceStatusEnum.active,
    _id: { $in: models.map((item) => item.seriesId) }
  })
    .sort({ sortOrder: 1, _id: 1 })
    .lean();
  const [categories, versions] = await Promise.all([
    MongoCustomerServiceProductCategory.find({
      teamId,
      status: CustomerServiceResourceStatusEnum.active,
      _id: { $in: series.map((item) => item.categoryId) }
    })
      .sort({ sortOrder: 1, _id: 1 })
      .lean(),
    MongoCustomerServiceProductVersion.find({
      teamId,
      status: CustomerServiceResourceStatusEnum.active,
      modelId: { $in: models.map((item) => item._id) },
      $and: [
        {
          $or: [
            { effectiveFrom: { $exists: false } },
            { effectiveFrom: null },
            { effectiveFrom: { $lte: now } }
          ]
        },
        {
          $or: [
            { effectiveTo: { $exists: false } },
            { effectiveTo: null },
            { effectiveTo: { $gte: now } }
          ]
        }
      ]
    })
      .sort({ type: 1, versionCode: 1 })
      .lean()
  ]);

  return [categories, series, models, versions] as const;
};
