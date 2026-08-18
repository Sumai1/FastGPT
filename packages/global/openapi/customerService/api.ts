import z from 'zod';
import { ObjectIdSchema } from '../../common/type/mongo';
import { BoolSchema, IntSchema, NumSchema } from '../../common/zod';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum,
  CustomerServiceKnowledgeAuditActionEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceMemberRoleAuditActionEnum,
  CustomerServiceMemberRoleEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '../../core/customerService/constants';
import { CustomerServicePublicIdSchema } from '../../core/customerService/type';

const IdSchema = ObjectIdSchema.meta({
  example: '68ad85a7463006c963799a05',
  description: 'MongoDB ObjectId'
});
const OptionalDateSchema = z.coerce.date().nullish().meta({
  example: '2026-08-11T00:00:00.000Z',
  description: 'ISO 8601 时间；null 表示清空'
});
const AliasesSchema = z
  .array(z.string().trim().min(1).max(100))
  .max(100)
  .default([])
  .meta({
    example: ['DT2026', '桌面拍照机'],
    description: '别名列表'
  });

export const CustomerServiceProductCategoryApiSchema = z.object({
  id: IdSchema,
  code: z.string().meta({ example: 'PHOTO', description: '产品大类编码' }),
  name: z.string().meta({ example: '拍照机', description: '产品大类名称' }),
  aliases: AliasesSchema,
  description: z.string().meta({ example: '桌面拍照设备', description: '产品大类说明' }),
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.active,
    description: '启停状态'
  }),
  sortOrder: IntSchema.meta({ example: 0, description: '排序值' })
});

export const CustomerServiceProductSeriesApiSchema = z.object({
  id: IdSchema,
  categoryId: IdSchema.meta({
    example: '68ad85a7463006c963799a06',
    description: '所属产品大类 ID'
  }),
  code: z.string().meta({ example: 'DESKTOP', description: '产品系列编码' }),
  name: z.string().meta({ example: '桌面系列', description: '产品系列名称' }),
  aliases: AliasesSchema,
  description: z.string().meta({ example: '桌面机型', description: '产品系列说明' }),
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.active,
    description: '启停状态'
  }),
  sortOrder: IntSchema.meta({ example: 0, description: '排序值' })
});

export const CustomerServiceProductModelApiSchema = z.object({
  id: IdSchema,
  seriesId: IdSchema.meta({
    example: '68ad85a7463006c963799a07',
    description: '所属产品系列 ID'
  }),
  modelCode: z.string().meta({ example: 'DT-2026A', description: '唯一型号编码' }),
  name: z.string().meta({ example: 'DT-2026A 拍照机', description: '型号名称' }),
  aliases: AliasesSchema,
  description: z.string().meta({ example: '2026 款桌面机型', description: '型号说明' }),
  status: z.enum(CustomerServiceProductStatusEnum).meta({
    example: CustomerServiceProductStatusEnum.active,
    description: '型号状态'
  }),
  discontinuedAt: z.coerce.date().nullish().meta({
    example: '2028-01-01T00:00:00.000Z',
    description: '停产时间'
  }),
  datasetIds: z.array(IdSchema).meta({
    example: ['68ad85a7463006c963799a08'],
    description: '绑定的 FastGPT dataset ID'
  }),
  sortOrder: IntSchema.meta({ example: 0, description: '排序值' })
});

export const CustomerServiceProductVersionApiSchema = z.object({
  id: IdSchema,
  modelId: IdSchema.meta({
    example: '68ad85a7463006c963799a09',
    description: '所属型号 ID'
  }),
  type: z.enum(CustomerServiceVersionTypeEnum).meta({
    example: CustomerServiceVersionTypeEnum.software,
    description: '版本类型'
  }),
  versionCode: z.string().meta({ example: 'V3.1', description: '版本编码' }),
  name: z.string().meta({ example: '软件 V3.1', description: '版本名称' }),
  aliases: AliasesSchema,
  description: z.string().meta({ example: '正式发布版本', description: '版本说明' }),
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.active,
    description: '启停状态'
  }),
  effectiveFrom: z.coerce.date().nullish().meta({
    example: '2026-01-01T00:00:00.000Z',
    description: '生效时间'
  }),
  effectiveTo: z.coerce.date().nullish().meta({
    example: '2028-01-01T00:00:00.000Z',
    description: '失效时间'
  })
});

export const CustomerServiceProductCatalogResponseSchema = z.object({
  categories: z.array(CustomerServiceProductCategoryApiSchema).meta({
    example: [],
    description: '产品大类列表'
  }),
  series: z.array(CustomerServiceProductSeriesApiSchema).meta({
    example: [],
    description: '产品系列列表'
  }),
  models: z.array(CustomerServiceProductModelApiSchema).meta({
    example: [],
    description: '产品型号列表'
  }),
  versions: z.array(CustomerServiceProductVersionApiSchema).meta({
    example: [],
    description: '软硬件版本列表'
  })
});
export type CustomerServiceProductCatalogResponse = z.infer<
  typeof CustomerServiceProductCatalogResponseSchema
>;

/** 对问答客户端隐藏内部 dataset 绑定 ID，只公开产品选择所需字段。 */
export const CustomerServicePublicProductCatalogResponseSchema = z.object({
  categories: z.array(
    CustomerServiceProductCategoryApiSchema.omit({ id: true }).meta({
      description: '公开产品大类；不包含内部资源 ID'
    })
  ),
  series: z.array(
    CustomerServiceProductSeriesApiSchema.omit({ id: true, categoryId: true })
      .extend({
        categoryCode: z.string().meta({
          example: 'PHOTO',
          description: '所属产品大类编码'
        })
      })
      .meta({ description: '公开产品系列；通过业务编码关联大类' })
  ),
  models: z.array(
    CustomerServiceProductModelApiSchema.omit({ id: true, seriesId: true, datasetIds: true })
      .extend({
        categoryCode: z.string().meta({
          example: 'PHOTO',
          description: '所属产品大类编码'
        }),
        seriesCode: z.string().meta({
          example: 'DESKTOP',
          description: '所属产品系列编码'
        })
      })
      .meta({ description: '公开产品型号；通过业务编码关联系列' })
  ),
  versions: z.array(
    CustomerServiceProductVersionApiSchema.omit({ id: true, modelId: true })
      .extend({
        modelCode: z.string().meta({
          example: 'DT-2026A',
          description: '所属产品型号编码'
        })
      })
      .meta({ description: '公开软硬件版本；通过型号编码关联型号' })
  )
});
export type CustomerServicePublicProductCatalogResponse = z.infer<
  typeof CustomerServicePublicProductCatalogResponseSchema
>;

/* ============================================================================
 * API: 获取客服管理产品目录
 * Route: GET /api/customer-service/admin/product/list
 * Method: GET
 * Description: 获取当前团队完整产品树和版本
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminProductListResponseSchema =
  CustomerServiceProductCatalogResponseSchema.meta({
    description: '当前团队完整产品目录'
  });
export type CustomerServiceAdminProductListResponse = z.infer<
  typeof CustomerServiceAdminProductListResponseSchema
>;

/* ============================================================================
 * API: 创建客服产品资源
 * Route: POST /api/customer-service/admin/product/create
 * Method: POST
 * Description: 创建产品大类、系列、型号或版本
 * Tags: ['Customer Service']
 * ============================================================================ */
const ProductCreateCommonSchema = z.object({
  name: z.string().trim().min(1).max(200).meta({
    example: 'DT-2026A',
    description: '资源名称'
  }),
  aliases: AliasesSchema,
  description: z.string().max(2000).default('').meta({
    example: '产品说明',
    description: '资源说明'
  })
});
export const CustomerServiceAdminProductCreateBodySchema = z.discriminatedUnion('resourceType', [
  ProductCreateCommonSchema.extend({
    resourceType: z.literal('category').meta({
      example: 'category',
      description: '产品大类'
    }),
    code: z.string().trim().min(1).max(100).meta({
      example: 'PHOTO',
      description: '大类编码'
    }),
    sortOrder: IntSchema.default(0).meta({ example: 0, description: '排序值' })
  }),
  ProductCreateCommonSchema.extend({
    resourceType: z.literal('series').meta({
      example: 'series',
      description: '产品系列'
    }),
    categoryId: IdSchema.meta({
      example: '68ad85a7463006c963799a05',
      description: '所属大类 ID'
    }),
    code: z.string().trim().min(1).max(100).meta({
      example: 'DESKTOP',
      description: '系列编码'
    }),
    sortOrder: IntSchema.default(0).meta({ example: 0, description: '排序值' })
  }),
  ProductCreateCommonSchema.extend({
    resourceType: z.literal('model').meta({
      example: 'model',
      description: '产品型号'
    }),
    seriesId: IdSchema.meta({
      example: '68ad85a7463006c963799a06',
      description: '所属系列 ID'
    }),
    modelCode: z.string().trim().min(1).max(100).meta({
      example: 'DT-2026A',
      description: '唯一型号编码'
    }),
    datasetIds: z
      .array(IdSchema)
      .max(100)
      .default([])
      .meta({
        example: ['68ad85a7463006c963799a08'],
        description: '初始绑定 dataset ID'
      }),
    sortOrder: IntSchema.default(0).meta({ example: 0, description: '排序值' })
  }),
  ProductCreateCommonSchema.extend({
    resourceType: z.literal('version').meta({
      example: 'version',
      description: '产品版本'
    }),
    modelId: IdSchema.meta({
      example: '68ad85a7463006c963799a09',
      description: '所属型号 ID'
    }),
    type: z.enum(CustomerServiceVersionTypeEnum).meta({
      example: CustomerServiceVersionTypeEnum.software,
      description: '软硬件版本类型'
    }),
    versionCode: z.string().trim().min(1).max(100).meta({
      example: 'V3.1',
      description: '版本编码'
    }),
    effectiveFrom: OptionalDateSchema,
    effectiveTo: OptionalDateSchema
  })
]);
export type CustomerServiceAdminProductCreateBody = z.infer<
  typeof CustomerServiceAdminProductCreateBodySchema
>;
export const CustomerServiceAdminProductCreateResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a05', description: '新资源 ID' })
});
export type CustomerServiceAdminProductCreateResponse = z.infer<
  typeof CustomerServiceAdminProductCreateResponseSchema
>;

/* ============================================================================
 * API: 更新客服产品资源
 * Route: PUT /api/customer-service/admin/product/update
 * Method: PUT
 * Description: 更新产品资源公共字段、状态和有效期
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminProductUpdateBodySchema = z.object({
  resourceType: z.enum(['category', 'series', 'model', 'version']).meta({
    example: 'model',
    description: '资源类型'
  }),
  id: IdSchema,
  code: z.string().trim().min(1).max(100).optional().meta({
    example: 'DT-2026A',
    description: '编码；型号对应 modelCode，版本对应 versionCode'
  }),
  name: z.string().trim().min(1).max(200).optional().meta({
    example: 'DT-2026A 拍照机',
    description: '名称'
  }),
  aliases: AliasesSchema.optional(),
  description: z.string().max(2000).optional().meta({
    example: '更新后的说明',
    description: '说明'
  }),
  status: z
    .union([z.enum(CustomerServiceResourceStatusEnum), z.enum(CustomerServiceProductStatusEnum)])
    .optional()
    .meta({ example: 'active', description: '资源状态' }),
  sortOrder: IntSchema.optional().meta({ example: 0, description: '排序值' }),
  discontinuedAt: OptionalDateSchema,
  effectiveFrom: OptionalDateSchema,
  effectiveTo: OptionalDateSchema
});
export type CustomerServiceAdminProductUpdateBody = z.infer<
  typeof CustomerServiceAdminProductUpdateBodySchema
>;
export const CustomerServiceAdminProductUpdateResponseSchema = z.undefined().meta({
  description: '更新成功'
});
export type CustomerServiceAdminProductUpdateResponse = z.infer<
  typeof CustomerServiceAdminProductUpdateResponseSchema
>;

/* ============================================================================
 * API: 绑定型号知识库
 * Route: PUT /api/customer-service/admin/product/bindDatasets
 * Method: PUT
 * Description: 替换型号绑定的 FastGPT dataset 列表
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminBindDatasetsBodySchema = z.object({
  modelId: IdSchema.meta({
    example: '68ad85a7463006c963799a09',
    description: '产品型号 ID'
  }),
  datasetIds: z
    .array(IdSchema)
    .max(100)
    .meta({
      example: ['68ad85a7463006c963799a08'],
      description: '目标 dataset ID 列表'
    })
});
export type CustomerServiceAdminBindDatasetsBody = z.infer<
  typeof CustomerServiceAdminBindDatasetsBodySchema
>;
export const CustomerServiceAdminBindDatasetsResponseSchema = z.object({
  syncedProjects: IntSchema.nonnegative().meta({
    example: 2,
    description: '已经同步工作流的客服项目数'
  }),
  failedProjects: z
    .array(
      z.object({
        projectId: IdSchema,
        name: z.string(),
        message: z.string()
      })
    )
    .meta({ example: [], description: '同步失败但保留旧工作流的项目' })
});
export type CustomerServiceAdminBindDatasetsResponse = z.infer<
  typeof CustomerServiceAdminBindDatasetsResponseSchema
>;

export const CustomerServiceKnowledgeApiSchema = z.object({
  id: IdSchema,
  datasetId: IdSchema.meta({
    example: '68ad85a7463006c963799a08',
    description: 'FastGPT dataset ID'
  }),
  collectionId: IdSchema.meta({
    example: '68ad85a7463006c963799a10',
    description: 'FastGPT collection ID'
  }),
  title: z.string().meta({ example: '耗材更换说明', description: '知识标题' }),
  sourceName: z.string().meta({ example: '用户手册.pdf', description: '来源名称' }),
  sourceRequestRecordId: IdSchema.nullish().meta({ description: '来源客服请求记录' }),
  sourceSessionId: z.string().nullish().meta({ description: '来源客服会话' }),
  knowledgeType: z.enum(CustomerServiceKnowledgeTypeEnum).meta({
    example: CustomerServiceKnowledgeTypeEnum.manual,
    description: '知识类型'
  }),
  audienceLevel: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: '最高可见受众'
  }),
  modelIds: z.array(IdSchema).meta({ example: [], description: '适用型号；空数组表示通用' }),
  hardwareVersionIds: z
    .array(IdSchema)
    .meta({ example: [], description: '适用硬件版本；空数组表示全部' }),
  softwareVersionIds: z
    .array(IdSchema)
    .meta({ example: [], description: '适用软件版本；空数组表示全部' }),
  effectiveFrom: z.coerce.date().nullish().meta({
    example: '2026-01-01T00:00:00.000Z',
    description: '生效时间'
  }),
  effectiveTo: z.coerce.date().nullish().meta({
    example: '2028-01-01T00:00:00.000Z',
    description: '失效时间'
  }),
  status: z.enum(CustomerServiceKnowledgeStatusEnum).meta({
    example: CustomerServiceKnowledgeStatusEnum.pending,
    description: '治理状态'
  }),
  version: IntSchema.meta({ example: 1, description: '版本号' }),
  versionGroupId: IdSchema.meta({
    example: '68ad85a7463006c963799a11',
    description: '版本组 ID'
  }),
  previousKnowledgeId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a12',
    description: '上一治理版本 ID'
  }),
  supersededBy: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a15',
    description: '被替代下架的新版本 ID'
  }),
  supersededAt: z.coerce.date().nullish().meta({
    example: '2026-08-11T00:00:00.000Z',
    description: '被替代下架时间'
  }),
  structuredData: z.record(z.string(), z.unknown()).nullish().meta({
    description: '结构化模板参数'
  }),
  submitterTmbId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a13',
    description: '提交人团队成员 ID'
  }),
  reviewerTmbId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a14',
    description: '审核人团队成员 ID'
  }),
  reviewReason: z.string().meta({ example: '', description: '审核或下架原因' }),
  trainingStatus: z
    .enum(['running', 'ready', 'error', 'empty'])
    .default('empty')
    .meta({ example: 'ready', description: 'FastGPT 原生训练状态汇总' }),
  trainingAmount: IntSchema.nonnegative()
    .default(0)
    .meta({ example: 0, description: '仍待训练或处理的任务数' }),
  dataAmount: IntSchema.nonnegative()
    .default(0)
    .meta({ example: 12, description: '已经生成的知识分块数' }),
  trainingError: z
    .string()
    .default('')
    .meta({ example: '', description: '首个最终训练错误，空字符串表示无错误' }),
  updateTime: z.coerce.date().meta({
    example: '2026-08-11T00:00:00.000Z',
    description: '更新时间'
  })
});

export const CustomerServiceKnowledgeAuditApiSchema = z.object({
  id: IdSchema,
  knowledgeId: IdSchema,
  versionGroupId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a11',
    description: '版本组 ID'
  }),
  version: IntSchema.nullish().meta({ example: 1, description: '知识版本号' }),
  diffSummary: z.string().default('').meta({ example: '更新了适用型号', description: '变更摘要' }),
  action: z.enum(CustomerServiceKnowledgeAuditActionEnum).meta({
    example: CustomerServiceKnowledgeAuditActionEnum.publish,
    description: '审计动作'
  }),
  fromStatus: z.enum(CustomerServiceKnowledgeStatusEnum).nullish().meta({
    example: CustomerServiceKnowledgeStatusEnum.pending,
    description: '变更前状态'
  }),
  toStatus: z.enum(CustomerServiceKnowledgeStatusEnum).meta({
    example: CustomerServiceKnowledgeStatusEnum.published,
    description: '变更后状态'
  }),
  reason: z.string().meta({ example: '审核通过', description: '审核原因或变更说明' }),
  operatorTmbId: IdSchema.meta({
    example: '68ad85a7463006c963799a14',
    description: '操作人团队成员 ID'
  }),
  operatorName: z.string().default('已删除成员').meta({
    example: '张三',
    description: '操作人姓名'
  }),
  operatorAvatar: z.string().default('').meta({
    example: '/icon/defaultAvatar.svg',
    description: '操作人头像'
  }),
  createTime: z.coerce.date().meta({
    example: '2026-08-11T00:00:00.000Z',
    description: '审计记录创建时间'
  })
});
export type CustomerServiceKnowledgeAuditApi = z.infer<
  typeof CustomerServiceKnowledgeAuditApiSchema
>;

/* ============================================================================
 * API: 获取知识治理审计历史
 * Route: GET /api/customer-service/admin/knowledge/audits
 * Method: GET
 * Description: 查询知识或版本组的审核与流转审计历史
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeAuditListQuerySchema = z.object({
  knowledgeId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a15',
    description: '知识记录 ID'
  }),
  versionGroupId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a11',
    description: '版本组 ID'
  })
});
export type CustomerServiceAdminKnowledgeAuditListQuery = z.infer<
  typeof CustomerServiceAdminKnowledgeAuditListQuerySchema
>;
export const CustomerServiceAdminKnowledgeAuditListResponseSchema = z
  .array(CustomerServiceKnowledgeAuditApiSchema)
  .meta({ description: '知识治理审计历史列表' });
export type CustomerServiceAdminKnowledgeAuditListResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeAuditListResponseSchema
>;

/* ============================================================================
 * API: 获取知识治理列表
 * Route: POST /api/customer-service/admin/knowledge/list
 * Method: POST
 * Description: 按状态、知识库或型号筛选治理记录
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeListBodySchema = z.object({
  status: z.enum(CustomerServiceKnowledgeStatusEnum).optional().meta({
    example: CustomerServiceKnowledgeStatusEnum.pending,
    description: '治理状态筛选'
  }),
  datasetId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a08',
    description: 'dataset ID 筛选'
  }),
  modelId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a09',
    description: '型号 ID 筛选'
  })
});
export type CustomerServiceAdminKnowledgeListBody = z.infer<
  typeof CustomerServiceAdminKnowledgeListBodySchema
>;
export const CustomerServiceAdminKnowledgeListResponseSchema = z
  .array(CustomerServiceKnowledgeApiSchema)
  .meta({ example: [], description: '知识治理列表' });
export type CustomerServiceAdminKnowledgeListResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeListResponseSchema
>;

/* ============================================================================
 * API: 获取尚未登记治理信息的原生资料
 * Route: GET /api/customer-service/admin/knowledge/unregistered
 * Method: GET
 * Description: 发现已上传但尚未创建客服治理草稿的 collection
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminUnregisteredKnowledgeItemSchema = z.object({
  datasetId: IdSchema,
  datasetName: z.string(),
  datasetAvatar: z.string(),
  vectorModel: z.string(),
  collectionId: IdSchema,
  name: z.string(),
  trainingStatus: z.enum(['running', 'ready', 'error', 'empty']),
  trainingAmount: IntSchema.nonnegative(),
  dataAmount: IntSchema.nonnegative(),
  trainingError: z.string(),
  updateTime: z.coerce.date()
});
export const CustomerServiceAdminUnregisteredKnowledgeListResponseSchema = z.array(
  CustomerServiceAdminUnregisteredKnowledgeItemSchema
);
export type CustomerServiceAdminUnregisteredKnowledgeListResponse = z.infer<
  typeof CustomerServiceAdminUnregisteredKnowledgeListResponseSchema
>;

/* ============================================================================
 * API: 创建知识治理草稿
 * Route: POST /api/customer-service/admin/knowledge/create
 * Method: POST
 * Description: 为现有 collection 创建引用式治理记录并禁止检索
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeCreateBodySchema = z.object({
  datasetId: IdSchema,
  collectionId: IdSchema,
  title: z.string().trim().min(1).max(300).meta({
    example: '耗材更换说明',
    description: '知识标题'
  }),
  sourceName: z.string().max(300).default('').meta({
    example: '用户手册.pdf',
    description: '来源名称'
  }),
  knowledgeType: z.enum(CustomerServiceKnowledgeTypeEnum).meta({
    example: CustomerServiceKnowledgeTypeEnum.manual,
    description: '知识类型'
  }),
  audienceLevel: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: '最高可见受众'
  }),
  modelIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用型号；空数组表示通用'
  }),
  hardwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用硬件版本；空数组表示全部'
  }),
  softwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用软件版本；空数组表示全部'
  }),
  effectiveFrom: OptionalDateSchema,
  effectiveTo: OptionalDateSchema,
  previousKnowledgeId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a12',
    description: '上一治理版本 ID'
  }),
  structuredData: z.record(z.string(), z.unknown()).optional().meta({
    description: '结构化模板参数'
  })
});
export type CustomerServiceAdminKnowledgeCreateBody = z.infer<
  typeof CustomerServiceAdminKnowledgeCreateBodySchema
>;
export const CustomerServiceAdminKnowledgeCreateResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a15', description: '治理记录 ID' })
});
export type CustomerServiceAdminKnowledgeCreateResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeCreateResponseSchema
>;

/* ============================================================================
 * API: 知识试问沙盒与实时检索
 * Route: POST /api/customer-service/admin/knowledge/testSearch
 * Method: POST
 * Description: 在审核沙盒中执行混合检索与 Rerank 重排试问，返回匹配分与模型拟答
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeTestSearchBodySchema = z.object({
  datasetId: IdSchema.meta({
    example: '68ad85a7463006c963799a08',
    description: 'FastGPT dataset ID'
  }),
  collectionId: IdSchema.meta({
    example: '68ad85a7463006c963799a10',
    description: 'FastGPT collection ID'
  }),
  question: z.string().trim().min(1).max(2000).meta({
    example: '机器卡纸了怎么清理？',
    description: '试问问题文本'
  }),
  modelId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a09',
    description: '产品型号 ID'
  })
});
export type CustomerServiceAdminKnowledgeTestSearchBody = z.infer<
  typeof CustomerServiceAdminKnowledgeTestSearchBodySchema
>;

export const CustomerServiceAdminKnowledgeTestSearchResponseSchema = z.object({
  score: z.number().meta({ example: 0.92, description: '最高相似度匹配得分 (0-1)' }),
  matchCount: IntSchema.nonnegative().meta({ example: 2, description: '命中文档切片数' }),
  chunks: z
    .array(
      z.object({
        chunkId: z.string(),
        content: z.string(),
        score: z.number()
      })
    )
    .meta({ description: '命中文档切片列表' }),
  answerPreview: z.string().meta({
    example: '您好！针对机器卡纸问题，处理步骤如下：...',
    description: '模型生成的拟答预览'
  })
});
export type CustomerServiceAdminKnowledgeTestSearchResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeTestSearchResponseSchema
>;

/* ============================================================================
 * API: 4 大结构化模板录入知识
 * Route: POST /api/customer-service/admin/knowledge/createStructured
 * Method: POST
 * Description: 支持产品主档、SOP 操作说明、FAQ 与售后故障卡 4 大模板标准化录入
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeCreateStructuredBodySchema = z.object({
  datasetId: IdSchema.meta({
    example: '68ad85a7463006c963799a08',
    description: '目标 dataset ID'
  }),
  title: z.string().trim().min(1).max(300).meta({
    example: 'DT-2026A 产品主档与规格参数',
    description: '知识标题'
  }),
  templateType: z
    .enum(['productMaster', 'manual', 'faq', 'faultCard'])
    .meta({ example: 'productMaster', description: '结构化模板类型' }),
  audienceLevel: z
    .enum(CustomerServiceAudienceEnum)
    .default(CustomerServiceAudienceEnum.public)
    .meta({ example: CustomerServiceAudienceEnum.public, description: '最高受众等级' }),
  modelIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用产品型号'
  }),
  hardwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用硬件版本'
  }),
  softwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用软件版本'
  }),
  templateData: z.record(z.string(), z.unknown()).meta({
    description: '模板结构化表单对象数据'
  })
});
export type CustomerServiceAdminKnowledgeCreateStructuredBody = z.infer<
  typeof CustomerServiceAdminKnowledgeCreateStructuredBodySchema
>;

export const CustomerServiceAdminKnowledgeCreateStructuredResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a15', description: '治理记录 ID' }),
  collectionId: IdSchema.meta({
    example: '68ad85a7463006c963799a10',
    description: '创建的 dataset collection ID'
  })
});
export type CustomerServiceAdminKnowledgeCreateStructuredResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeCreateStructuredResponseSchema
>;

/* ============================================================================
 * API: FAQ 批量导入与多相似问
 * Route: POST /api/customer-service/admin/knowledge/importBatch
 * Method: POST
 * Description: 批量导入 FAQ 问答与多相似问扩展并生成标准化草稿
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminFaqBatchItemSchema = z.object({
  question: z.string().trim().min(1).max(500).meta({
    example: '设备如何退款？',
    description: '标准问'
  }),
  similarQuestions: z
    .array(z.string().trim().min(1).max(500))
    .default([])
    .meta({ example: ['没出货怎么退钱', '扣款了但东西没出来'], description: '相似问同义词列表' }),
  answer: z.string().trim().min(1).max(20000).meta({
    example: '请检查出货口，系统将在 3 分钟内自动退款。',
    description: '核心简答'
  }),
  detailedAnswer: z.string().max(20000).optional().meta({
    example: '详细排查指引...',
    description: '详细解答与原理指引'
  }),
  categoryTag: z.string().max(100).optional().meta({
    example: '出货退款',
    description: '分类标签'
  })
});
export type CustomerServiceAdminFaqBatchItem = z.infer<
  typeof CustomerServiceAdminFaqBatchItemSchema
>;

export const CustomerServiceAdminKnowledgeImportBatchBodySchema = z.object({
  datasetId: IdSchema.meta({
    example: '68ad85a7463006c963799a08',
    description: '目标 dataset ID'
  }),
  title: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .default('FAQ 批量导入')
    .meta({ example: '常见问题解答 (FAQ)', description: '知识集标题' }),
  audienceLevel: z
    .enum(CustomerServiceAudienceEnum)
    .default(CustomerServiceAudienceEnum.public)
    .meta({ example: CustomerServiceAudienceEnum.public, description: '最高受众等级' }),
  modelIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用产品型号'
  }),
  hardwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用硬件版本'
  }),
  softwareVersionIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '适用软件版本'
  }),
  items: z
    .array(CustomerServiceAdminFaqBatchItemSchema)
    .min(1)
    .max(500)
    .meta({ description: '批量 FAQ 列表' })
});
export type CustomerServiceAdminKnowledgeImportBatchBody = z.infer<
  typeof CustomerServiceAdminKnowledgeImportBatchBodySchema
>;

export const CustomerServiceAdminKnowledgeImportBatchResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a15', description: '治理记录 ID' }),
  collectionId: IdSchema.meta({
    example: '68ad85a7463006c963799a10',
    description: '创建的 dataset collection ID'
  }),
  importedCount: IntSchema.positive().meta({ example: 10, description: '成功导入的 FAQ 条目数' })
});
export type CustomerServiceAdminKnowledgeImportBatchResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeImportBatchResponseSchema
>;

/* ============================================================================
 * API: 更新知识治理草稿
 * Route: PUT /api/customer-service/admin/knowledge/update
 * Method: PUT
 * Description: 更新草稿或已驳回记录的治理字段，不改写正文和 collection 引用
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKnowledgeUpdateBodySchema =
  CustomerServiceAdminKnowledgeCreateBodySchema.omit({
    datasetId: true,
    collectionId: true,
    previousKnowledgeId: true
  })
    .partial()
    .extend({ knowledgeId: IdSchema });
export type CustomerServiceAdminKnowledgeUpdateBody = z.infer<
  typeof CustomerServiceAdminKnowledgeUpdateBodySchema
>;
export const CustomerServiceAdminKnowledgeUpdateResponseSchema = z.undefined().meta({
  description: '治理草稿更新成功'
});
export type CustomerServiceAdminKnowledgeUpdateResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeUpdateResponseSchema
>;

const KnowledgeActionBodySchema = z.object({
  knowledgeId: IdSchema.meta({
    example: '68ad85a7463006c963799a15',
    description: '治理记录 ID'
  })
});
export const CustomerServiceAdminKnowledgeSubmitBodySchema = KnowledgeActionBodySchema;
export type CustomerServiceAdminKnowledgeSubmitBody = z.infer<
  typeof CustomerServiceAdminKnowledgeSubmitBodySchema
>;
export const CustomerServiceAdminKnowledgeSubmitResponseSchema = z.undefined().meta({
  description: '提交成功'
});
export type CustomerServiceAdminKnowledgeSubmitResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeSubmitResponseSchema
>;

export const CustomerServiceAdminKnowledgeReviewBodySchema = KnowledgeActionBodySchema.extend({
  action: z.enum(['publish', 'reject']).meta({
    example: 'publish',
    description: '审核动作'
  }),
  reason: z.string().max(2000).default('').meta({
    example: '字段需要补充',
    description: '驳回原因；publish 可为空'
  })
});
export type CustomerServiceAdminKnowledgeReviewBody = z.infer<
  typeof CustomerServiceAdminKnowledgeReviewBodySchema
>;
export const CustomerServiceAdminKnowledgeReviewResponseSchema = z.undefined().meta({
  description: '审核成功'
});
export type CustomerServiceAdminKnowledgeReviewResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeReviewResponseSchema
>;

export const CustomerServiceAdminKnowledgeOfflineBodySchema = KnowledgeActionBodySchema.extend({
  reason: z.string().trim().min(1).max(2000).meta({
    example: '内容已失效',
    description: '下架原因'
  })
});
export type CustomerServiceAdminKnowledgeOfflineBody = z.infer<
  typeof CustomerServiceAdminKnowledgeOfflineBodySchema
>;
export const CustomerServiceAdminKnowledgeOfflineResponseSchema = z.undefined().meta({
  description: '下架成功'
});
export type CustomerServiceAdminKnowledgeOfflineResponse = z.infer<
  typeof CustomerServiceAdminKnowledgeOfflineResponseSchema
>;

export const CustomerServiceHumanContactApiSchema = z.object({
  name: z.string().min(1).max(100).default('人工客服').meta({
    example: '人工客服',
    description: '联系人名称'
  }),
  phone: z.string().max(100).optional().meta({
    example: '400-000-0000',
    description: '联系电话'
  }),
  url: z.string().url().optional().meta({
    example: 'https://support.example.com',
    description: '人工服务地址'
  }),
  workTime: z.string().max(200).optional().meta({
    example: '工作日 09:00-18:00',
    description: '服务时间'
  })
});

export const CustomerServiceRuleConfigApiSchema = z.object({
  lowConfidenceThreshold: NumSchema.min(0).max(1).default(0.45).meta({
    example: 0.45,
    description: '低置信度阈值'
  }),
  lowConfidenceMaxCount: IntSchema.positive().default(2).meta({
    example: 2,
    description: '连续低置信度转人工次数'
  }),
  maxAnswerTokens: IntSchema.positive().default(600).meta({
    example: 600,
    description: '建议回答 Token 上限'
  }),
  dangerousKeywords: z
    .array(z.string())
    .max(200)
    .default([])
    .meta({
      example: ['冒烟', '漏电'],
      description: '危险关键词扩展'
    }),
  disputeKeywords: z
    .array(z.string())
    .max(200)
    .default([])
    .meta({
      example: ['退款', '赔偿'],
      description: '争议关键词扩展'
    }),
  complaintKeywords: z
    .array(z.string())
    .max(200)
    .default([])
    .meta({
      example: ['投诉'],
      description: '投诉关键词扩展'
    }),
  humanRequestKeywords: z
    .array(z.string())
    .max(200)
    .default([])
    .meta({
      example: ['转人工'],
      description: '人工请求关键词扩展'
    })
});

export const CustomerServiceProjectApiSchema = z.object({
  id: IdSchema,
  appId: IdSchema.meta({ example: '68ad85a7463006c963799a20', description: 'FastGPT App ID' }),
  projectCode: z.string().meta({ example: 'PHOTO_SUPPORT', description: '项目编码' }),
  publicId: CustomerServicePublicIdSchema,
  name: z.string().meta({ example: '拍照机客服', description: '项目名称' }),
  status: z.enum(CustomerServiceProjectStatusEnum).meta({
    example: CustomerServiceProjectStatusEnum.active,
    description: '项目状态'
  }),
  modelIds: z.array(IdSchema).meta({ example: [], description: '项目允许的产品型号' }),
  defaultAudience: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: '默认受众'
  }),
  welcomeText: z.string().meta({ example: '您好，请问有什么可以帮您？', description: '欢迎语' }),
  recommendedQuestions: z.array(z.string()).meta({
    example: ['如何更换耗材？'],
    description: '推荐问题'
  }),
  humanContact: CustomerServiceHumanContactApiSchema,
  ruleConfig: CustomerServiceRuleConfigApiSchema,
  sessionRetentionDays: IntSchema.nullish().meta({
    example: 180,
    description: '会话保留天数；null 表示继承系统配置'
  }),
  workflowSync: z
    .object({
      status: z.enum(CustomerServiceWorkflowSyncStatusEnum),
      failureReason: z.string(),
      failureTime: z.coerce.date().nullish(),
      lastAttemptTime: z.coerce.date().nullish(),
      successTime: z.coerce.date().nullish()
    })
    .default({ status: CustomerServiceWorkflowSyncStatusEnum.idle, failureReason: '' })
    .meta({ description: '托管工作流知识范围最近一次同步状态' }),
  workflowReadiness: z
    .object({
      status: z.enum(['ready', 'outdated', 'error']),
      expectedDatasetCount: IntSchema.nonnegative(),
      workflowDatasetCount: IntSchema.nonnegative(),
      message: z.string(),
      checkedAt: z.coerce.date()
    })
    .meta({ description: '托管工作流与产品知识库绑定的一致性状态' }),
  deliveryReadiness: z.object({
    ready: z.boolean(),
    checks: z.object({
      projectActive: z.boolean(),
      appExists: z.boolean(),
      standardWorkflow: z.boolean(),
      datasetScope: z.boolean(),
      aiModel: z.boolean(),
      publishedKnowledge: z.boolean(),
      keyBinding: z.boolean()
    }),
    messages: z.array(z.string()),
    checkedAt: z.coerce.date()
  })
});

export const CustomerServiceKeyBindingApiSchema = z.object({
  id: IdSchema,
  projectId: IdSchema.meta({
    example: '68ad85a7463006c963799a21',
    description: '客服项目 ID'
  }),
  openApiKeyId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a22',
    description: '当前登录成员拥有原生管理权限时返回的 OpenAPI Key ID'
  }),
  maxAudience: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: 'Key 最高受众'
  }),
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.active,
    description: '绑定状态'
  }),
  allowedOrigins: z.array(z.string()).meta({
    example: ['https://shop.example.com'],
    description: '允许的 Origin；空数组表示不限制'
  }),
  rateLimit: z
    .object({
      seconds: IntSchema.positive().meta({ example: 60, description: '限流窗口秒数' }),
      limit: IntSchema.positive().meta({ example: 60, description: '窗口内最大请求数' })
    })
    .nullish()
    .meta({ example: { seconds: 60, limit: 60 }, description: '项目 Key 限流覆盖' }),
  disabledReason: z.string().meta({ example: '', description: '停用原因' })
});

/* ============================================================================
 * API: 获取客服项目和 Key 绑定
 * Route: GET /api/customer-service/admin/project/list
 * Method: GET
 * Description: 获取当前团队项目与客服 Key 绑定
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminProjectListResponseSchema = z.object({
  projects: z.array(CustomerServiceProjectApiSchema).meta({
    example: [],
    description: '客服项目列表'
  }),
  keyBindings: z.array(CustomerServiceKeyBindingApiSchema).meta({
    example: [],
    description: '客服 Key 绑定列表'
  })
});
export type CustomerServiceAdminProjectListResponse = z.infer<
  typeof CustomerServiceAdminProjectListResponseSchema
>;

/* ============================================================================
 * API: 同步客服工作流知识库
 * Route: POST /api/customer-service/admin/project/syncWorkflow
 * Method: POST
 * Description: 将项目当前产品型号绑定的知识库写入托管工作流并更新发布态
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminProjectSyncWorkflowBodySchema = z.object({
  projectId: IdSchema.meta({
    example: '68ad85a7463006c963799a21',
    description: '客服项目 ID'
  })
});
export type CustomerServiceAdminProjectSyncWorkflowBody = z.infer<
  typeof CustomerServiceAdminProjectSyncWorkflowBodySchema
>;
export const CustomerServiceAdminProjectSyncWorkflowResponseSchema =
  CustomerServiceProjectApiSchema.shape.workflowReadiness;
export type CustomerServiceAdminProjectSyncWorkflowResponse = z.infer<
  typeof CustomerServiceAdminProjectSyncWorkflowResponseSchema
>;

export const CustomerServiceAdminProjectCreateBodySchema = z.object({
  appId: IdSchema,
  projectCode: z.string().trim().min(1).max(100).meta({
    example: 'PHOTO_SUPPORT',
    description: '项目编码'
  }),
  name: z.string().trim().min(1).max(200).meta({
    example: '拍照机客服',
    description: '项目名称'
  }),
  modelIds: z.array(IdSchema).max(100).default([]).meta({
    example: [],
    description: '允许的型号 ID'
  }),
  defaultAudience: z
    .enum(CustomerServiceAudienceEnum)
    .default(CustomerServiceAudienceEnum.public)
    .meta({
      example: CustomerServiceAudienceEnum.public,
      description: '默认受众'
    }),
  welcomeText: z.string().max(2000).default('').meta({
    example: '您好，请选择产品型号。',
    description: '欢迎语'
  }),
  recommendedQuestions: z
    .array(z.string())
    .max(100)
    .default([])
    .meta({
      example: ['如何更换耗材？'],
      description: '推荐问题'
    }),
  humanContact: CustomerServiceHumanContactApiSchema.default({ name: '人工客服' }).meta({
    example: { name: '人工客服', phone: '400-000-0000' },
    description: '人工客服信息'
  }),
  ruleConfig: CustomerServiceRuleConfigApiSchema.default({
    lowConfidenceThreshold: 0.45,
    lowConfidenceMaxCount: 2,
    maxAnswerTokens: 600,
    dangerousKeywords: [],
    disputeKeywords: [],
    complaintKeywords: [],
    humanRequestKeywords: []
  }).meta({
    example: { lowConfidenceThreshold: 0.45, lowConfidenceMaxCount: 2, maxAnswerTokens: 600 },
    description: '客服规则配置'
  }),
  sessionRetentionDays: IntSchema.nonnegative().nullish().meta({
    example: 180,
    description: '会话保留天数'
  })
});
export type CustomerServiceAdminProjectCreateBody = z.infer<
  typeof CustomerServiceAdminProjectCreateBodySchema
>;
export const CustomerServiceAdminProjectCreateResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a21', description: '项目 ID' })
});
export type CustomerServiceAdminProjectCreateResponse = z.infer<
  typeof CustomerServiceAdminProjectCreateResponseSchema
>;

/* ============================================================================
 * API: 托管创建智能客服
 * Route: POST /api/customer-service/admin/project/createManaged
 * Method: POST
 * Description: 根据标准模板和产品绑定自动创建 Workflow App、客服项目及专用 Key
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminManagedProjectCreateBodySchema = z.object({
  name: CustomerServiceAdminProjectCreateBodySchema.shape.name,
  modelIds: z
    .array(IdSchema)
    .min(1)
    .max(100)
    .meta({
      example: ['68ad85a7463006c963799a09'],
      description: '客服适用的产品型号；每个型号必须已经绑定知识库'
    }),
  defaultAudience: CustomerServiceAdminProjectCreateBodySchema.shape.defaultAudience,
  welcomeText: CustomerServiceAdminProjectCreateBodySchema.shape.welcomeText,
  recommendedQuestions: CustomerServiceAdminProjectCreateBodySchema.shape.recommendedQuestions,
  humanContact: CustomerServiceAdminProjectCreateBodySchema.shape.humanContact,
  sessionRetentionDays:
    CustomerServiceAdminProjectCreateBodySchema.shape.sessionRetentionDays.default(180)
});
export type CustomerServiceAdminManagedProjectCreateBody = z.infer<
  typeof CustomerServiceAdminManagedProjectCreateBodySchema
>;
export const CustomerServiceAdminManagedProjectCreateResponseSchema = z.object({
  projectId: IdSchema.meta({
    example: '68ad85a7463006c963799a21',
    description: '已创建的客服项目 ID'
  }),
  appId: IdSchema.meta({
    example: '68ad85a7463006c963799a20',
    description: '自动创建的 Workflow App ID'
  })
});
export type CustomerServiceAdminManagedProjectCreateResponse = z.infer<
  typeof CustomerServiceAdminManagedProjectCreateResponseSchema
>;

export const CustomerServiceAdminProjectUpdateBodySchema =
  CustomerServiceAdminProjectCreateBodySchema.omit({ appId: true, projectCode: true })
    .partial()
    .extend({
      projectId: IdSchema,
      status: z.enum(CustomerServiceProjectStatusEnum).optional().meta({
        example: CustomerServiceProjectStatusEnum.active,
        description: '项目状态'
      })
    });
export type CustomerServiceAdminProjectUpdateBody = z.infer<
  typeof CustomerServiceAdminProjectUpdateBodySchema
>;
export const CustomerServiceAdminProjectUpdateResponseSchema = z.undefined().meta({
  description: '更新成功'
});
export type CustomerServiceAdminProjectUpdateResponse = z.infer<
  typeof CustomerServiceAdminProjectUpdateResponseSchema
>;

export const CustomerServiceAdminKeyBindBodySchema = z.object({
  projectId: IdSchema,
  openApiKeyId: IdSchema,
  maxAudience: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: 'Key 最高受众'
  }),
  allowedOrigins: z
    .array(z.string().url())
    .max(100)
    .default([])
    .meta({
      example: ['https://shop.example.com'],
      description: '允许的 Origin'
    }),
  rateLimit: z
    .object({
      seconds: IntSchema.positive().meta({ example: 60, description: '限流窗口秒数' }),
      limit: IntSchema.positive().meta({ example: 60, description: '窗口内最大请求数' })
    })
    .optional()
    .meta({ example: { seconds: 60, limit: 60 }, description: '项目 Key 限流覆盖' })
});
export type CustomerServiceAdminKeyBindBody = z.infer<typeof CustomerServiceAdminKeyBindBodySchema>;
export const CustomerServiceAdminKeyBindResponseSchema = z.object({
  id: IdSchema.meta({ example: '68ad85a7463006c963799a23', description: 'Key 绑定 ID' })
});
export type CustomerServiceAdminKeyBindResponse = z.infer<
  typeof CustomerServiceAdminKeyBindResponseSchema
>;

/* ============================================================================
 * API: 更新客服 Key 绑定状态
 * Route: PUT /api/customer-service/admin/project/updateKey
 * Method: PUT
 * Description: 启用或停用现有客服 Key 绑定
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminKeyUpdateBodySchema = z.object({
  bindingId: IdSchema,
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.inactive,
    description: '绑定状态'
  }),
  reason: z.string().max(1000).default('').meta({
    example: 'Key 已轮换',
    description: '停用原因；停用时必填'
  })
});
export type CustomerServiceAdminKeyUpdateBody = z.infer<
  typeof CustomerServiceAdminKeyUpdateBodySchema
>;
export const CustomerServiceAdminKeyUpdateResponseSchema = z.undefined().meta({
  description: '更新成功'
});
export type CustomerServiceAdminKeyUpdateResponse = z.infer<
  typeof CustomerServiceAdminKeyUpdateResponseSchema
>;

export const CustomerServiceMemberRoleApiSchema = z.object({
  id: IdSchema,
  tmbId: IdSchema.meta({ example: '68ad85a7463006c963799a13', description: '团队成员 ID' }),
  role: z.enum(CustomerServiceMemberRoleEnum).meta({
    example: CustomerServiceMemberRoleEnum.knowledgeEditor,
    description: '客服岗位'
  }),
  allowedCategoryIds: z.array(IdSchema).default([]).meta({
    example: [],
    description: '允许管理的产品大类 ID 列表'
  }),
  allowedModelIds: z.array(IdSchema).default([]).meta({
    example: [],
    description: '允许管理的产品型号 ID 列表'
  }),
  status: z.enum(CustomerServiceResourceStatusEnum).meta({
    example: CustomerServiceResourceStatusEnum.active,
    description: '岗位状态'
  }),
  reason: z.string().meta({ example: '负责产品资料维护', description: '最近变更原因' }),
  updateTime: z.coerce.date().meta({
    example: '2026-08-11T00:00:00.000Z',
    description: '更新时间'
  }),
  memberName: z.string().default('已删除成员').meta({
    example: '张三',
    description: '团队成员显示名称'
  }),
  memberAvatar: z.string().default('').meta({
    example: '/icon/defaultAvatar.svg',
    description: '团队成员头像'
  })
});
export const CustomerServiceAdminRoleListResponseSchema = z
  .array(CustomerServiceMemberRoleApiSchema)
  .meta({ example: [], description: '客服岗位列表' });
export type CustomerServiceAdminRoleListResponse = z.infer<
  typeof CustomerServiceAdminRoleListResponseSchema
>;
export const CustomerServiceAdminRoleMemberListResponseSchema = z.array(
  z.object({
    tmbId: IdSchema,
    name: z.string(),
    avatar: z.string(),
    teamRole: z.string(),
    status: z.string(),
    customerServiceRole: z.enum(CustomerServiceMemberRoleEnum).nullish(),
    customerServiceRoleStatus: z.enum(CustomerServiceResourceStatusEnum).nullish()
  })
);
export type CustomerServiceAdminRoleMemberListResponse = z.infer<
  typeof CustomerServiceAdminRoleMemberListResponseSchema
>;
export const CustomerServiceAdminRoleSetBodySchema = z.object({
  tmbId: IdSchema,
  role: z.enum(CustomerServiceMemberRoleEnum).meta({
    example: CustomerServiceMemberRoleEnum.knowledgeEditor,
    description: '目标岗位'
  }),
  allowedCategoryIds: z.array(IdSchema).default([]).optional().meta({
    example: [],
    description: '允许管理的产品大类 ID 列表'
  }),
  allowedModelIds: z.array(IdSchema).default([]).optional().meta({
    example: [],
    description: '允许管理的产品型号 ID 列表'
  }),
  status: z
    .enum(CustomerServiceResourceStatusEnum)
    .default(CustomerServiceResourceStatusEnum.active)
    .meta({
      example: CustomerServiceResourceStatusEnum.active,
      description: '岗位状态'
    }),
  reason: z.string().trim().min(1).max(1000).meta({
    example: '调整资料维护职责',
    description: '变更原因'
  })
});
export type CustomerServiceAdminRoleSetBody = z.infer<typeof CustomerServiceAdminRoleSetBodySchema>;
export const CustomerServiceAdminRoleSetResponseSchema = z.undefined().meta({
  description: '岗位设置成功'
});
export type CustomerServiceAdminRoleSetResponse = z.infer<
  typeof CustomerServiceAdminRoleSetResponseSchema
>;

/* ============================================================================
 * API: 创建客服独立账号并分配岗位
 * Route: POST /api/customer-service/admin/role/create-member
 * Method: POST
 * Description: 创建真实系统账号（用户名/密码），并加入团队绑定客服岗位
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminRoleCreateMemberBodySchema = z.object({
  username: z.string().trim().min(2).max(50).meta({
    example: 'editor1',
    description: '登录用户名'
  }),
  password: z.string().trim().min(4).max(50).meta({
    example: '1234',
    description: '登录密码'
  }),
  name: z.string().trim().min(1).max(50).meta({
    example: '采编员李明',
    description: '成员显示姓名'
  }),
  role: z.enum(CustomerServiceMemberRoleEnum).meta({
    example: CustomerServiceMemberRoleEnum.knowledgeEditor,
    description: '分配客服岗位'
  }),
  allowedCategoryIds: z.array(IdSchema).default([]).optional().meta({
    example: [],
    description: '允许管理的产品大类 ID 列表'
  }),
  allowedModelIds: z.array(IdSchema).default([]).optional().meta({
    example: [],
    description: '允许管理的产品型号 ID 列表'
  }),
  reason: z.string().trim().max(1000).default('管理员创建客服账号并分配岗位').meta({
    example: '客服新成员入职',
    description: '开通原因'
  })
});
export type CustomerServiceAdminRoleCreateMemberBody = z.infer<
  typeof CustomerServiceAdminRoleCreateMemberBodySchema
>;
export const CustomerServiceAdminRoleCreateMemberResponseSchema = z.object({
  tmbId: IdSchema,
  userId: IdSchema,
  username: z.string(),
  name: z.string(),
  role: z.enum(CustomerServiceMemberRoleEnum)
});
export type CustomerServiceAdminRoleCreateMemberResponse = z.infer<
  typeof CustomerServiceAdminRoleCreateMemberResponseSchema
>;

/* ============================================================================
 * API: 客服岗位流转审计历史
 * Route: GET /api/customer-service/admin/role/audits
 * Method: GET
 * Description: 查询团队客服岗位变更与启停流转审计日志
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceMemberRoleAuditApiSchema = z.object({
  id: IdSchema,
  tmbId: IdSchema,
  action: z.enum(CustomerServiceMemberRoleAuditActionEnum),
  fromRole: z.enum(CustomerServiceMemberRoleEnum).nullish(),
  toRole: z.enum(CustomerServiceMemberRoleEnum),
  fromStatus: z.enum(CustomerServiceResourceStatusEnum).nullish(),
  toStatus: z.enum(CustomerServiceResourceStatusEnum),
  reason: z.string(),
  operatorTmbId: IdSchema,
  operatorName: z.string().default('已删除成员'),
  operatorAvatar: z.string().default(''),
  memberName: z.string().default('已删除成员'),
  memberAvatar: z.string().default(''),
  createTime: z.coerce.date()
});
export type CustomerServiceMemberRoleAuditApi = z.infer<
  typeof CustomerServiceMemberRoleAuditApiSchema
>;

export const CustomerServiceAdminRoleAuditListResponseSchema = z.array(
  CustomerServiceMemberRoleAuditApiSchema
);
export type CustomerServiceAdminRoleAuditListResponse = z.infer<
  typeof CustomerServiceAdminRoleAuditListResponseSchema
>;

/* ============================================================================
 * API: 获取当前成员客服控制台权限
 * Route: GET /api/customer-service/admin/me
 * Method: GET
 * Description: 返回当前岗位及可见业务模块，供管理端按服务端授权裁剪导航
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminMeResponseSchema = z.object({
  role: z.enum(CustomerServiceMemberRoleEnum),
  isTeamOwner: z.boolean(),
  capabilities: z.object({
    manageProjects: z.boolean(),
    editKnowledge: z.boolean(),
    reviewKnowledge: z.boolean(),
    viewOperations: z.boolean(),
    manageRoles: z.boolean()
  })
});
export type CustomerServiceAdminMeResponse = z.infer<typeof CustomerServiceAdminMeResponseSchema>;

export const CustomerServiceAdminHealthResponseSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  mongoConnected: z.boolean(),
  llmModelCount: IntSchema.nonnegative(),
  embeddingModelCount: IntSchema.nonnegative(),
  messages: z.array(z.string()),
  checkedAt: z.coerce.date()
});
export type CustomerServiceAdminHealthResponse = z.infer<
  typeof CustomerServiceAdminHealthResponseSchema
>;

/* ============================================================================
 * API: 客服对话运营记录
 * Route: POST /api/customer-service/admin/operation/list
 * Method: POST
 * Description: 聚合客服请求、原生对话、反馈、引用和用量，供业务运营筛选
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminOperationListBodySchema = z.object({
  pageNum: IntSchema.positive().default(1),
  pageSize: IntSchema.positive().max(100).default(20),
  projectId: IdSchema.optional(),
  seriesId: IdSchema.optional(),
  modelId: IdSchema.optional(),
  resultStatus: z.enum(CustomerServiceChatStatusEnum).optional(),
  feedback: z.enum(['good', 'bad', 'unresolved', 'none']).optional(),
  keyword: z.string().trim().max(100).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional()
});
export type CustomerServiceAdminOperationListBody = z.infer<
  typeof CustomerServiceAdminOperationListBodySchema
>;
export const CustomerServiceAdminOperationItemSchema = z.object({
  id: IdSchema,
  projectId: IdSchema,
  projectName: z.string(),
  modelId: IdSchema.nullish(),
  modelName: z.string().nullish(),
  sessionId: z.string(),
  requestId: z.string(),
  question: z.string(),
  answer: z.string(),
  resultStatus: z.enum(CustomerServiceChatStatusEnum).nullish(),
  feedback: z.enum(['good', 'bad', 'unresolved', 'none']),
  lowConfidence: z.boolean(),
  citationCount: IntSchema.nonnegative(),
  citations: z.array(
    z.object({
      datasetId: IdSchema,
      collectionId: IdSchema,
      sourceName: z.string(),
      score: z.number().nullish()
    })
  ),
  humanReason: z.enum(CustomerServiceHumanHandoffReasonEnum).nullish(),
  durationSeconds: z.number().nonnegative().nullish(),
  tokens: IntSchema.nonnegative(),
  points: z.number().nonnegative(),
  createTime: z.coerce.date()
});
export const CustomerServiceAdminOperationListResponseSchema = z.object({
  total: IntSchema.nonnegative(),
  list: z.array(CustomerServiceAdminOperationItemSchema)
});
export type CustomerServiceAdminOperationListResponse = z.infer<
  typeof CustomerServiceAdminOperationListResponseSchema
>;

/* ============================================================================
 * API: 客服高频问题
 * Route: POST /api/customer-service/admin/operation/frequentQuestions
 * Method: POST
 * Description: 按客服项目、产品和时间聚合重复问题，供运营发现知识缺口
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminFrequentQuestionListBodySchema = z
  .object({
    limit: IntSchema.positive().max(100).default(10).meta({
      example: 10,
      description: '最多返回的高频问题数量'
    }),
    minimumCount: IntSchema.positive().max(100000).default(2).meta({
      example: 2,
      description: '最少出现次数'
    }),
    projectId: IdSchema.optional().meta({
      example: '68ad85a7463006c963799a21',
      description: '客服项目 ID'
    }),
    seriesId: IdSchema.optional().meta({
      example: '68ad85a7463006c963799a07',
      description: '产品系列 ID'
    }),
    modelId: IdSchema.optional().meta({
      example: '68ad85a7463006c963799a09',
      description: '产品型号 ID'
    }),
    startTime: z.coerce.date().optional().meta({
      example: '2026-07-16T00:00:00.000Z',
      description: '统计开始时间；不传时默认最近 30 天'
    }),
    endTime: z.coerce.date().optional().meta({
      example: '2026-08-16T23:59:59.999Z',
      description: '统计结束时间'
    })
  })
  .superRefine(({ startTime, endTime }, ctx) => {
    if (startTime && endTime && startTime > endTime) {
      ctx.addIssue({
        code: 'custom',
        path: ['endTime'],
        message: '结束时间不能早于开始时间'
      });
    }
  });
export type CustomerServiceAdminFrequentQuestionListBody = z.infer<
  typeof CustomerServiceAdminFrequentQuestionListBodySchema
>;
export const CustomerServiceAdminFrequentQuestionItemSchema = z.object({
  requestRecordId: IdSchema.meta({
    example: '68ad85a7463006c963799a30',
    description: '最近一条样例客服请求记录 ID'
  }),
  projectId: IdSchema.meta({
    example: '68ad85a7463006c963799a21',
    description: '客服项目 ID'
  }),
  projectName: z.string().meta({
    example: '拍照机客服',
    description: '客服项目名称'
  }),
  modelId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a09',
    description: '产品型号 ID'
  }),
  modelName: z.string().nullish().meta({
    example: 'DT-2026A',
    description: '产品型号名称'
  }),
  question: z.string().meta({
    example: '设备出现 E01 怎么处理？',
    description: '最近一次原始问题文本'
  }),
  answer: z.string().meta({
    example: '请先断电并检查电源连接。',
    description: '最近一次客服回答；转知识草稿前必须人工复核'
  }),
  count: IntSchema.positive().meta({ example: 12, description: '问题出现次数' }),
  unresolvedCount: IntSchema.nonnegative().meta({
    example: 3,
    description: '被客户标记为未解决的次数'
  }),
  clarificationRequiredCount: IntSchema.nonnegative().meta({
    example: 2,
    description: '因资料不足要求补充信息的次数'
  }),
  humanRequiredCount: IntSchema.nonnegative().meta({
    example: 1,
    description: '转人工次数'
  }),
  latestTime: z.coerce.date().meta({
    example: '2026-08-16T12:00:00.000Z',
    description: '最近出现时间'
  })
});
export const CustomerServiceAdminFrequentQuestionListResponseSchema = z.object({
  list: z.array(CustomerServiceAdminFrequentQuestionItemSchema).meta({
    example: [],
    description: '按次数、未解决次数和最近时间排序的高频问题'
  })
});
export type CustomerServiceAdminFrequentQuestionListResponse = z.infer<
  typeof CustomerServiceAdminFrequentQuestionListResponseSchema
>;

/* ============================================================================
 * API: 未解决问题转知识草稿
 * Route: POST /api/customer-service/admin/operation/toKnowledge
 * Method: POST
 * Description: 将客服问题与回答写入 FastGPT 文本 collection 并创建治理草稿
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminOperationToKnowledgeBodySchema = z.object({
  requestRecordId: IdSchema,
  datasetId: IdSchema,
  title: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(20000),
  knowledgeType: z
    .enum(CustomerServiceKnowledgeTypeEnum)
    .default(CustomerServiceKnowledgeTypeEnum.faq),
  audienceLevel: z.enum(CustomerServiceAudienceEnum).default(CustomerServiceAudienceEnum.public),
  modelIds: z.array(IdSchema).max(100).default([])
});
export type CustomerServiceAdminOperationToKnowledgeBody = z.infer<
  typeof CustomerServiceAdminOperationToKnowledgeBodySchema
>;
export const CustomerServiceAdminOperationToKnowledgeResponseSchema =
  CustomerServiceAdminKnowledgeCreateResponseSchema;
export type CustomerServiceAdminOperationToKnowledgeResponse = z.infer<
  typeof CustomerServiceAdminOperationToKnowledgeResponseSchema
>;

/* ============================================================================
 * API: 运营效能与消耗指标聚合
 * Route: POST /api/customer-service/admin/operation/metrics
 * Method: POST
 * Description: 按时间范围聚合 Token、积分费用、平均耗时、解决率与转人工原因归因
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminOperationMetricsBodySchema = z.object({
  timeRange: z
    .enum(['1d', '7d', '30d'])
    .default('7d')
    .meta({ example: '7d', description: '统计周期' }),
  projectId: IdSchema.optional().meta({ description: '客服项目 ID' }),
  seriesId: IdSchema.optional().meta({ description: '产品系列 ID' }),
  modelId: IdSchema.optional().meta({ description: '产品型号 ID' }),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional()
});
export type CustomerServiceAdminOperationMetricsBody = z.infer<
  typeof CustomerServiceAdminOperationMetricsBodySchema
>;

export const CustomerServiceAdminOperationMetricsResponseSchema = z.object({
  totalTokens: IntSchema.nonnegative().meta({ example: 124500, description: 'Token 消耗总量' }),
  totalPoints: z.number().nonnegative().meta({ example: 32.8, description: '总积分/费用消耗' }),
  avgDurationSeconds: z
    .number()
    .nonnegative()
    .meta({ example: 1.2, description: '平均响应耗时(秒)' }),
  goodFeedbackCount: IntSchema.nonnegative().meta({ example: 45, description: '好评/满意数' }),
  badFeedbackCount: IntSchema.nonnegative().meta({ example: 5, description: '差评/未解决数' }),
  totalFeedbackCount: IntSchema.nonnegative().meta({ example: 50, description: '总反馈数' }),
  resolutionRate: z
    .number()
    .min(0)
    .max(100)
    .meta({ example: 90.0, description: '问题解决率/满意率百分比' }),
  handoffCount: IntSchema.nonnegative().meta({ example: 8, description: '转人工事件数' }),
  handoffRate: z.number().min(0).max(100).meta({ example: 6.4, description: '转人工率百分比' }),
  trendBars: z
    .array(z.number())
    .meta({ example: [35, 48, 62, 55, 78, 85, 92], description: '趋势柱状图百分比' }),
  handoffAttributions: z
    .array(
      z.object({
        key: z.string(),
        label: z.string(),
        count: IntSchema.nonnegative(),
        percentage: z.number(),
        colorScheme: z.string(),
        description: z.string()
      })
    )
    .meta({ description: '转人工归因分类统计' })
});
export type CustomerServiceAdminOperationMetricsResponse = z.infer<
  typeof CustomerServiceAdminOperationMetricsResponseSchema
>;

/* ============================================================================
 * API: Badcase 与未解决问题聚类分析
 * Route: POST /api/customer-service/admin/operation/clusters
 * Method: POST
 * Description: 对点踩、未解决反馈、低置信度会话执行主题聚类并提供代表性案例
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceAdminOperationClustersBodySchema = z.object({
  projectId: IdSchema.optional(),
  seriesId: IdSchema.optional(),
  modelId: IdSchema.optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  limit: IntSchema.positive().max(100).default(20)
});
export type CustomerServiceAdminOperationClustersBody = z.infer<
  typeof CustomerServiceAdminOperationClustersBodySchema
>;

export const CustomerServiceAdminOperationClusterItemSchema = z.object({
  id: z.string(),
  clusterTitle: z
    .string()
    .meta({ example: '售货机支付扣款成功后出货口卡货未掉出', description: '聚类主题标题' }),
  clusterCount: IntSchema.nonnegative().meta({ example: 14, description: '聚类提问次数' }),
  sampleQuestions: z.array(z.string()).meta({ description: '代表性用户问法列表' }),
  latestTime: z.coerce.date().meta({ description: '最近发生时间' }),
  affectedModelIds: z.array(IdSchema).default([]),
  feedbackType: z.enum(['unresolved', 'bad', 'lowConfidence']),
  representativeItem: CustomerServiceAdminOperationItemSchema
});
export type CustomerServiceAdminOperationClusterItem = z.infer<
  typeof CustomerServiceAdminOperationClusterItemSchema
>;

export const CustomerServiceAdminOperationClustersResponseSchema = z.object({
  clusters: z.array(CustomerServiceAdminOperationClusterItemSchema)
});
export type CustomerServiceAdminOperationClustersResponse = z.infer<
  typeof CustomerServiceAdminOperationClustersResponseSchema
>;

/* ============================================================================
 * API: 获取客服可选产品
 * Route: GET /api/customer-service/v1/products
 * Method: GET
 * Description: 根据客服 Key 绑定项目返回可选产品、欢迎语和推荐问题
 * Tags: ['Customer Service', 'System OpenAPI']
 * ============================================================================ */
export const CustomerServiceProductsResponseSchema =
  CustomerServiceProductCatalogResponseSchema.extend({
    projectId: IdSchema,
    projectName: z.string().meta({ example: '拍照机客服', description: '客服项目名称' }),
    welcomeText: z.string().meta({ example: '您好，请选择产品。', description: '欢迎语' }),
    recommendedQuestions: z.array(z.string()).meta({
      example: ['如何更换耗材？'],
      description: '推荐问题'
    })
  });
export type CustomerServiceProductsResponse = z.infer<typeof CustomerServiceProductsResponseSchema>;

export const CustomerServiceChatStatusSchema = z.enum(CustomerServiceChatStatusEnum);
export const CustomerServiceResolvedProductSchema = z.object({
  modelId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a09',
    description: '已解析型号 ID'
  }),
  modelCode: z.string().nullish().meta({ example: 'DT-2026A', description: '已解析型号编码' }),
  hardwareVersionId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a24',
    description: '已解析硬件版本 ID'
  }),
  hardwareVersionCode: z.string().nullish().meta({
    example: 'V2',
    description: '已解析硬件版本编码'
  }),
  softwareVersionId: IdSchema.nullish().meta({
    example: '68ad85a7463006c963799a25',
    description: '已解析软件版本 ID'
  }),
  softwareVersionCode: z.string().nullish().meta({
    example: 'V3.1',
    description: '已解析软件版本编码'
  })
});

/* ============================================================================
 * API: 客服聊天
 * Route: POST /api/customer-service/v1/chat
 * Method: POST
 * Description: 带受众、产品版本、白名单、幂等和转人工规则的客服问答
 * Tags: ['Customer Service', 'System OpenAPI']
 * ============================================================================ */
export const CustomerServiceChatBodySchema = z.object({
  requestId: z.string().trim().min(1).max(128).optional().meta({
    example: 'order-page-request-001',
    description: '调用方幂等 ID'
  }),
  sessionId: z.string().trim().min(1).max(1024).optional().meta({
    example: 'customer-session-001',
    description: '会话 ID；未传时自动生成'
  }),
  message: z.string().trim().min(1).max(20000).meta({
    example: '设备如何更换打印耗材？',
    description: '用户问题'
  }),
  stream: BoolSchema.default(true).meta({ example: true, description: '是否使用 SSE 返回' }),
  externalUserId: z.string().trim().min(1).max(256).optional().meta({
    example: 'opaque-user-id',
    description: '不透明外部用户 ID'
  }),
  productModel: z.string().trim().min(1).max(200).optional().meta({
    example: 'DT-2026A',
    description: '型号编码、名称或别名'
  }),
  hardwareVersion: z.string().trim().min(1).max(200).optional().meta({
    example: 'V2',
    description: '硬件版本编码、名称或别名'
  }),
  softwareVersion: z.string().trim().min(1).max(200).optional().meta({
    example: 'V3.1',
    description: '软件版本编码、名称或别名'
  }),
  audience: z.enum(CustomerServiceAudienceEnum).optional().meta({
    example: CustomerServiceAudienceEnum.public,
    description: '请求受众；服务端会按 Key 最高受众收窄'
  })
});
export type CustomerServiceChatBody = z.infer<typeof CustomerServiceChatBodySchema>;

/* ============================================================================
 * API: 停止客服回答
 * Route: POST /api/customer-service/v1/stop
 * Method: POST
 * Description: 按幂等请求和外部会话定位正在执行的客服工作流并请求停止
 * Tags: ['Customer Service', 'System OpenAPI']
 * ============================================================================ */
export const CustomerServiceStopBodySchema = z.object({
  requestId: z.string().trim().min(1).max(128).meta({
    example: 'order-page-request-001',
    description: '开始聊天时使用的幂等请求 ID'
  }),
  sessionId: z.string().trim().min(1).max(1024).meta({
    example: 'customer-session-001',
    description: '开始聊天时使用的会话 ID'
  })
});
export type CustomerServiceStopBody = z.infer<typeof CustomerServiceStopBodySchema>;
export const CustomerServiceStopResponseSchema = z.object({
  stopped: z.literal(true).meta({
    example: true,
    description: '已向当前客服工作流提交停止信号'
  })
});
export type CustomerServiceStopResponse = z.infer<typeof CustomerServiceStopResponseSchema>;

export const CustomerServiceCitationSchema = z.object({
  id: z.string().meta({ example: 'chunk-data-id', description: '引用分块 ID' }),
  datasetId: IdSchema,
  collectionId: IdSchema,
  sourceName: z.string().meta({ example: '用户手册.pdf', description: '来源名称' }),
  q: z.string().meta({ example: '更换耗材步骤', description: '引用问题或文本' }),
  a: z.string().meta({ example: '1. 关闭电源……', description: '引用答案或补充文本' }),
  score: z.number().nullish().meta({
    example: 0.91,
    description: '检索相关度分数；没有可比较分数时为空'
  })
});
export type CustomerServiceCitation = z.infer<typeof CustomerServiceCitationSchema>;
export const CustomerServiceChatResponseSchema = z.object({
  requestId: z.string().meta({ example: 'order-page-request-001', description: '幂等请求 ID' }),
  sessionId: z.string().meta({ example: 'customer-session-001', description: '会话 ID' }),
  messageId: z.string().meta({ example: 'b36a1c4e028e90f2c52b8d01', description: 'AI 消息 ID' }),
  status: CustomerServiceChatStatusSchema.meta({
    example: 'answered',
    description: '客服处理状态'
  }),
  answer: z.string().meta({ example: '请按以下步骤更换耗材……', description: '回答文本' }),
  audience: z.enum(CustomerServiceAudienceEnum).meta({
    example: CustomerServiceAudienceEnum.public,
    description: '实际受众'
  }),
  resolvedProduct: CustomerServiceResolvedProductSchema,
  candidates: z.array(CustomerServiceProductModelApiSchema).default([]).meta({
    example: [],
    description: '型号歧义时的候选列表'
  }),
  citations: z.array(CustomerServiceCitationSchema).default([]).meta({
    example: [],
    description: '有效引用'
  }),
  safetyWarning: z.string().optional().meta({
    example: '请立即断电并联系人工客服。',
    description: '安全警告'
  }),
  humanContact: CustomerServiceHumanContactApiSchema.optional().meta({
    example: { name: '人工客服', phone: '400-000-0000' },
    description: '需要转人工时返回'
  })
});
export type CustomerServiceChatResponse = z.infer<typeof CustomerServiceChatResponseSchema>;

/**
 * 正式客户端的解析产品投影。公开端只需要产品/版本编码来确认上下文，不能暴露服务端
 * 产品目录 ObjectId。
 */
export const CustomerServicePublicResolvedProductSchema = z.object({
  modelCode: z.string().nullish().meta({
    example: 'DT-2026A',
    description: '已解析型号编码'
  }),
  hardwareVersionCode: z.string().nullish().meta({
    example: 'V2',
    description: '已解析硬件版本编码'
  }),
  softwareVersionCode: z.string().nullish().meta({
    example: 'V3.1',
    description: '已解析软件版本编码'
  })
});

/** 正式客户端的候选型号投影，不携带内部型号、系列或 dataset 标识。 */
export const CustomerServicePublicCandidateModelSchema = z.object({
  modelCode: z.string().meta({ example: 'DT-2026A', description: '候选型号编码' }),
  name: z.string().meta({ example: 'DT-2026A 拍照机', description: '候选型号名称' }),
  description: z.string().meta({ example: '2026 款桌面机型', description: '候选型号说明' })
});

/** 正式客户端的引用摘要，只展示用户理解答案所需的标题、摘要和相关度。 */
export const CustomerServicePublicCitationSchema = z.object({
  title: z.string().meta({ example: '用户手册.pdf', description: '引用标题' }),
  summary: z.string().meta({ example: '1. 关闭电源……', description: '引用摘要' }),
  score: z.number().nullish().meta({
    example: 0.91,
    description: '检索相关度分数；没有可比较分数时为空'
  })
});
export type CustomerServicePublicCitation = z.infer<typeof CustomerServicePublicCitationSchema>;

/* ============================================================================
 * API: 正式客户端聊天响应
 * Route: POST /api/customer-service/public/chat
 * Method: POST
 * Description: 仅返回公开业务字段，过滤 dataset、collection、chunk 和内部产品 ID
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicChatResponseSchema = CustomerServiceChatResponseSchema.pick({
  requestId: true,
  sessionId: true,
  messageId: true,
  status: true,
  answer: true,
  safetyWarning: true,
  humanContact: true
}).extend({
  audience: z.literal(CustomerServiceAudienceEnum.public),
  resolvedProduct: CustomerServicePublicResolvedProductSchema,
  candidates: z.array(CustomerServicePublicCandidateModelSchema).default([]).meta({
    example: [],
    description: '型号歧义时的公开候选列表'
  }),
  citations: z.array(CustomerServicePublicCitationSchema).default([]).meta({
    example: [],
    description: '公开引用摘要'
  })
});
export type CustomerServicePublicChatResponse = z.infer<
  typeof CustomerServicePublicChatResponseSchema
>;

/* ============================================================================
 * API: 提交客服反馈
 * Route: POST /api/customer-service/v1/feedback
 * Method: POST
 * Description: 对客服 AI 消息提交点赞或点踩并复用现有反馈统计
 * Tags: ['Customer Service', 'System OpenAPI']
 * ============================================================================ */
export const CustomerServiceFeedbackBodySchema = z.object({
  sessionId: z.string().trim().min(1).max(1024).meta({
    example: 'customer-session-001',
    description: '会话 ID'
  }),
  messageId: z.string().trim().min(1).max(128).meta({
    example: 'b36a1c4e028e90f2c52b8d01',
    description: 'AI 消息 ID'
  }),
  type: z.enum(['good', 'bad', 'unresolved']).meta({
    example: 'good',
    description: '反馈类型；unresolved 表示问题未解决'
  }),
  content: z.string().max(2000).default('').meta({
    example: '步骤清晰',
    description: '反馈说明'
  })
});
export type CustomerServiceFeedbackBody = z.infer<typeof CustomerServiceFeedbackBodySchema>;
export const CustomerServiceFeedbackResponseSchema = z.undefined().meta({
  description: '反馈提交成功'
});
export type CustomerServiceFeedbackResponse = z.infer<typeof CustomerServiceFeedbackResponseSchema>;

/* ============================================================================
 * API: 客服服务健康检查
 * Route: GET /api/customer-service/v1/health
 * Method: GET
 * Description: 验证客服 Key、项目、App 和服务初始化状态
 * Tags: ['Customer Service', 'System OpenAPI']
 * ============================================================================ */
export const CustomerServiceHealthResponseSchema = z.object({
  status: z.literal('ok').meta({ example: 'ok', description: '服务状态' }),
  projectId: IdSchema,
  appId: IdSchema,
  systemVersion: z.string().meta({ example: '4.16.0', description: 'FastGPT 系统版本' }),
  timestamp: z.coerce.date().meta({
    example: '2026-08-11T00:00:00.000Z',
    description: '检查时间'
  })
});
export type CustomerServiceHealthResponse = z.infer<typeof CustomerServiceHealthResponseSchema>;

/* ============================================================================
 * API: 站内客服初始化
 * Route: GET /api/customer-service/internal/bootstrap
 * Method: GET
 * Description: 登录用户获取有权访问且已绑定 Key 的客服项目及当前产品目录
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceInternalBootstrapQuerySchema = z.object({
  projectId: IdSchema.optional().meta({
    example: '68ad85a7463006c963799a21',
    description: '指定客服项目；省略时选择首个有权访问的项目'
  })
});
export type CustomerServiceInternalBootstrapQuery = z.infer<
  typeof CustomerServiceInternalBootstrapQuerySchema
>;
export const CustomerServiceInternalProjectSchema = z.object({
  id: IdSchema,
  name: z.string(),
  welcomeText: z.string(),
  recommendedQuestions: z.array(z.string()),
  humanContact: CustomerServiceHumanContactApiSchema
});
export const CustomerServiceInternalBootstrapResponseSchema = z.object({
  projects: z.array(CustomerServiceInternalProjectSchema),
  selectedProjectId: IdSchema.nullish(),
  catalog: CustomerServiceProductCatalogResponseSchema
});
export type CustomerServiceInternalBootstrapResponse = z.infer<
  typeof CustomerServiceInternalBootstrapResponseSchema
>;

export const CustomerServiceInternalChatBodySchema = CustomerServiceChatBodySchema.extend({
  projectId: IdSchema
});
export type CustomerServiceInternalChatBody = z.infer<typeof CustomerServiceInternalChatBodySchema>;

/* ============================================================================
 * API: 停止站内客服回答
 * Route: POST /api/customer-service/internal/stop
 * Method: POST
 * Description: 登录成员停止指定客服项目中由自己发起的当前回答
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServiceInternalStopBodySchema = CustomerServiceStopBodySchema.extend({
  projectId: IdSchema.meta({
    example: '68ad85a7463006c963799a21',
    description: '客服项目 ID'
  })
});
export type CustomerServiceInternalStopBody = z.infer<typeof CustomerServiceInternalStopBodySchema>;

export const CustomerServiceInternalFeedbackBodySchema = CustomerServiceFeedbackBodySchema.extend({
  projectId: IdSchema
});
export type CustomerServiceInternalFeedbackBody = z.infer<
  typeof CustomerServiceInternalFeedbackBodySchema
>;

/* ============================================================================
 * API: 初始化正式客户咨询端
 * Route: GET /api/customer-service/public/bootstrap
 * Method: GET
 * Description: 根据全局唯一公开标识返回单个客服及其 public 产品选择信息
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicBootstrapQuerySchema = z.object({
  publicId: CustomerServicePublicIdSchema
});
export type CustomerServicePublicBootstrapQuery = z.infer<
  typeof CustomerServicePublicBootstrapQuerySchema
>;
export const CustomerServicePublicProjectSchema = z.object({
  publicId: CustomerServicePublicIdSchema,
  name: z.string().meta({ example: '产品智能客服', description: '客服名称' }),
  welcomeText: z.string().meta({ example: '您好，请选择产品。', description: '欢迎语' }),
  recommendedQuestions: z.array(z.string()).meta({
    example: ['设备报错怎么排查？'],
    description: '推荐问题'
  }),
  humanContact: CustomerServiceHumanContactApiSchema
});
export const CustomerServicePublicBootstrapResponseSchema = z.object({
  project: CustomerServicePublicProjectSchema,
  catalog: CustomerServicePublicProductCatalogResponseSchema
});
export type CustomerServicePublicBootstrapResponse = z.infer<
  typeof CustomerServicePublicBootstrapResponseSchema
>;

/* ============================================================================
 * API: 正式客户咨询端聊天
 * Route: POST /api/customer-service/public/chat
 * Method: POST
 * Description: 由同源服务端按公开项目解析专用 Key，并强制使用 public 受众
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicChatBodySchema = CustomerServiceChatBodySchema.pick({
  requestId: true,
  sessionId: true,
  message: true,
  stream: true,
  productModel: true,
  hardwareVersion: true,
  softwareVersion: true
})
  .extend({
    publicId: CustomerServicePublicIdSchema
  })
  .superRefine(({ requestId, sessionId }, ctx) => {
    // 公开请求的幂等键必须绑定访客会话，避免两个浏览器复用同一 requestId 时互相回放答案。
    if (requestId && !sessionId) {
      ctx.addIssue({
        code: 'custom',
        path: ['sessionId'],
        message: '使用 requestId 时必须同时提供 sessionId'
      });
    }
  });
export type CustomerServicePublicChatBody = z.infer<typeof CustomerServicePublicChatBodySchema>;

/* ============================================================================
 * API: 停止正式客户咨询端回答
 * Route: POST /api/customer-service/public/stop
 * Method: POST
 * Description: 由同源服务端解析项目专用 Key，并停止当前访客会话中的指定回答
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicStopBodySchema = CustomerServiceStopBodySchema.extend({
  publicId: CustomerServicePublicIdSchema
});
export type CustomerServicePublicStopBody = z.infer<typeof CustomerServicePublicStopBodySchema>;

/* ============================================================================
 * API: 正式客户咨询端反馈
 * Route: POST /api/customer-service/public/feedback
 * Method: POST
 * Description: 由同源服务端提交点赞、点踩或问题未解决反馈
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicFeedbackBodySchema = CustomerServiceFeedbackBodySchema.pick({
  sessionId: true,
  messageId: true,
  type: true,
  content: true
}).extend({
  publicId: CustomerServicePublicIdSchema
});
export type CustomerServicePublicFeedbackBody = z.infer<
  typeof CustomerServicePublicFeedbackBodySchema
>;

/* ============================================================================
 * API: 正式客户咨询端排查留痕与转人工快照
 * Route: POST /api/customer-service/public/handoff
 * Method: POST
 * Description: 接收访客已确认的排查步骤和故障代码，保存为客服请求转人工快照
 * Tags: ['Customer Service']
 * ============================================================================ */
export const CustomerServicePublicHandoffBodySchema = z.object({
  publicId: CustomerServicePublicIdSchema,
  sessionId: z.string().trim().min(1).max(200).meta({
    example: 'visitor-session-001',
    description: '访客会话 ID'
  }),
  requestId: z.string().trim().min(1).max(200).optional().meta({
    example: 'req_001',
    description: '请求 ID（若有）'
  }),
  productModelName: z.string().max(200).optional().meta({
    example: 'DT-2026A',
    description: '排查型号名称'
  }),
  hardwareVersionName: z.string().max(200).optional().meta({
    example: 'V2',
    description: '硬件版本'
  }),
  softwareVersionName: z.string().max(200).optional().meta({
    example: 'V3.1',
    description: '软件版本'
  }),
  faultCode: z.string().max(200).optional().meta({
    example: 'E-1002',
    description: '故障代码'
  }),
  completedSteps: z
    .array(z.string().max(500))
    .max(50)
    .default([])
    .meta({
      example: ['检查电源插头', '重启设备'],
      description: '已排查步骤'
    }),
  summaryText: z.string().max(2000).optional().meta({
    example: '用户已重启三次，出纸口红灯仍常亮',
    description: '排查总结或用户补充信息'
  })
});
export type CustomerServicePublicHandoffBody = z.infer<
  typeof CustomerServicePublicHandoffBodySchema
>;

export const CustomerServicePublicHandoffResponseSchema = z.undefined().meta({
  description: '转人工快照保存成功'
});
export type CustomerServicePublicHandoffResponse = z.infer<
  typeof CustomerServicePublicHandoffResponseSchema
>;
