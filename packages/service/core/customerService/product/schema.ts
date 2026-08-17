import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceProductCategoryType,
  CustomerServiceProductModelType,
  CustomerServiceProductSeriesType,
  CustomerServiceProductVersionType
} from '@fastgpt/global/core/customerService/type';
import {
  TeamCollectionName,
  TeamMemberCollectionName
} from '@fastgpt/global/support/user/team/constant';
import { defineIndex, Schema, getMongoModel } from '../../../common/mongo';
import { DatasetCollectionName } from '../../dataset/schema';

export const CustomerServiceProductCategoryCollectionName = 'customer_service_product_categories';
export const CustomerServiceProductSeriesCollectionName = 'customer_service_product_series';
export const CustomerServiceProductModelCollectionName = 'customer_service_product_models';
export const CustomerServiceProductVersionCollectionName = 'customer_service_product_versions';

const commonProductFields = {
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  aliases: {
    type: [String],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  updateTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  createTime: {
    type: Date,
    default: () => new Date()
  },
  updateTime: {
    type: Date,
    default: () => new Date()
  }
};

const ProductCategorySchema = new Schema({
  ...commonProductFields,
  code: { type: String, required: true },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    default: CustomerServiceResourceStatusEnum.active
  }
});

defineIndex(ProductCategorySchema, {
  key: { teamId: 1, code: 1 },
  options: { unique: true }
});
defineIndex(ProductCategorySchema, { key: { teamId: 1, status: 1, sortOrder: 1 } });

const ProductSeriesSchema = new Schema({
  ...commonProductFields,
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProductCategoryCollectionName,
    required: true
  },
  code: { type: String, required: true },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    default: CustomerServiceResourceStatusEnum.active
  }
});

defineIndex(ProductSeriesSchema, {
  key: { teamId: 1, categoryId: 1, code: 1 },
  options: { unique: true }
});
defineIndex(ProductSeriesSchema, {
  key: { teamId: 1, categoryId: 1, status: 1, sortOrder: 1 }
});

const ProductModelSchema = new Schema({
  ...commonProductFields,
  seriesId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProductSeriesCollectionName,
    required: true
  },
  modelCode: { type: String, required: true },
  name: { type: String, required: true },
  status: {
    type: String,
    enum: Object.values(CustomerServiceProductStatusEnum),
    default: CustomerServiceProductStatusEnum.active
  },
  datasetIds: {
    type: [Schema.Types.ObjectId],
    ref: DatasetCollectionName,
    default: []
  },
  discontinuedAt: Date
});

defineIndex(ProductModelSchema, {
  key: { teamId: 1, modelCode: 1 },
  options: { unique: true }
});
defineIndex(ProductModelSchema, { key: { teamId: 1, seriesId: 1, status: 1, sortOrder: 1 } });
defineIndex(ProductModelSchema, { key: { teamId: 1, datasetIds: 1 } });

const ProductVersionSchema = new Schema({
  teamId: {
    type: Schema.Types.ObjectId,
    ref: TeamCollectionName,
    required: true
  },
  modelId: {
    type: Schema.Types.ObjectId,
    ref: CustomerServiceProductModelCollectionName,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(CustomerServiceVersionTypeEnum),
    required: true
  },
  versionCode: { type: String, required: true },
  name: { type: String, required: true },
  aliases: { type: [String], default: [] },
  description: { type: String, default: '' },
  status: {
    type: String,
    enum: Object.values(CustomerServiceResourceStatusEnum),
    default: CustomerServiceResourceStatusEnum.active
  },
  effectiveFrom: Date,
  effectiveTo: Date,
  tmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  updateTmbId: {
    type: Schema.Types.ObjectId,
    ref: TeamMemberCollectionName,
    required: true
  },
  createTime: { type: Date, default: () => new Date() },
  updateTime: { type: Date, default: () => new Date() }
});

defineIndex(ProductVersionSchema, {
  key: { teamId: 1, modelId: 1, type: 1, versionCode: 1 },
  options: { unique: true }
});
defineIndex(ProductVersionSchema, { key: { teamId: 1, modelId: 1, status: 1 } });

export const MongoCustomerServiceProductCategory =
  getMongoModel<CustomerServiceProductCategoryType>(
    CustomerServiceProductCategoryCollectionName,
    ProductCategorySchema
  );
export const MongoCustomerServiceProductSeries = getMongoModel<CustomerServiceProductSeriesType>(
  CustomerServiceProductSeriesCollectionName,
  ProductSeriesSchema
);
export const MongoCustomerServiceProductModel = getMongoModel<CustomerServiceProductModelType>(
  CustomerServiceProductModelCollectionName,
  ProductModelSchema
);
export const MongoCustomerServiceProductVersion = getMongoModel<CustomerServiceProductVersionType>(
  CustomerServiceProductVersionCollectionName,
  ProductVersionSchema
);
