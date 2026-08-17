import type { listProductCatalog } from '@fastgpt/service/core/customerService/product/entity';
import type { CustomerServiceProductModelType } from '@fastgpt/global/core/customerService/type';
import type { CustomerServicePublicProductCatalogResponse } from '@fastgpt/global/openapi/customerService/api';
import type {
  listCustomerServiceKeyBindings,
  listCustomerServiceProjects
} from '@fastgpt/service/core/customerService/project/entity';
import type { listCustomerServiceKnowledges } from '@fastgpt/service/core/customerService/knowledge/entity';
import type { listCustomerServiceMemberRoles } from '@fastgpt/service/core/customerService/memberRole/entity';
import { CustomerServiceWorkflowSyncStatusEnum } from '@fastgpt/global/core/customerService/constants';

const stringIds = (ids: unknown[]) => ids.map(String);
const WORKFLOW_SYNC_STALE_MS = 10 * 60 * 1000;

/** 将产品型号文档转换为客服 API 型号输出。 */
export const formatCustomerServiceProductModels = (models: CustomerServiceProductModelType[]) =>
  models.map((item) => ({
    ...item,
    id: String(item._id),
    seriesId: String(item.seriesId),
    datasetIds: stringIds(item.datasetIds)
  }));

/** 将内部产品文档转换为稳定的客服 API 产品目录。 */
export const formatCustomerServiceProductCatalog = (
  catalog: Readonly<Awaited<ReturnType<typeof listProductCatalog>>>
) => {
  const [categories, series, models, versions] = catalog;
  return {
    categories: categories.map((item) => ({ ...item, id: String(item._id) })),
    series: series.map((item) => ({
      ...item,
      id: String(item._id),
      categoryId: String(item.categoryId)
    })),
    models: formatCustomerServiceProductModels(models),
    versions: versions.map((item) => ({
      ...item,
      id: String(item._id),
      modelId: String(item.modelId)
    }))
  };
};

/**
 * 将客服产品目录投影为正式客户端可见的业务字段。
 *
 * 公开页面只需要产品编码和展示信息；父子关系使用业务编码传递，避免 Mongo ObjectId、dataset
 * 绑定和团队审计字段进入浏览器。发现孤立父节点时直接丢弃子节点，防止用不完整关系扩大可选范围。
 */
export const formatCustomerServicePublicProductCatalog = (
  catalog: Readonly<Awaited<ReturnType<typeof listProductCatalog>>>
): CustomerServicePublicProductCatalogResponse => {
  const [categories, series, models, versions] = catalog;
  const categoryById = new Map(categories.map((item) => [String(item._id), item]));
  const seriesById = new Map(series.map((item) => [String(item._id), item]));
  const modelById = new Map(models.map((item) => [String(item._id), item]));

  const publicCategories = categories.map((item) => ({
    code: item.code,
    name: item.name,
    aliases: item.aliases,
    description: item.description,
    status: item.status,
    sortOrder: item.sortOrder
  }));

  const publicSeries = series.flatMap((item) => {
    const category = categoryById.get(String(item.categoryId));
    if (!category) return [];
    return [
      {
        categoryCode: category.code,
        code: item.code,
        name: item.name,
        aliases: item.aliases,
        description: item.description,
        status: item.status,
        sortOrder: item.sortOrder
      }
    ];
  });

  const publicModels = models.flatMap((item) => {
    const parentSeries = seriesById.get(String(item.seriesId));
    if (!parentSeries) return [];
    const parentCategory = categoryById.get(String(parentSeries.categoryId));
    if (!parentCategory) return [];
    return [
      {
        categoryCode: parentCategory.code,
        seriesCode: parentSeries.code,
        modelCode: item.modelCode,
        name: item.name,
        aliases: item.aliases,
        description: item.description,
        status: item.status,
        discontinuedAt: item.discontinuedAt,
        sortOrder: item.sortOrder
      }
    ];
  });

  const publicVersions = versions.flatMap((item) => {
    const parentModel = modelById.get(String(item.modelId));
    if (!parentModel) return [];
    return [
      {
        modelCode: parentModel.modelCode,
        type: item.type,
        versionCode: item.versionCode,
        name: item.name,
        aliases: item.aliases,
        description: item.description,
        status: item.status,
        effectiveFrom: item.effectiveFrom,
        effectiveTo: item.effectiveTo
      }
    ];
  });

  const validCategoryCodes = new Set(publicSeries.map((item) => item.categoryCode));
  const validSeriesKeys = new Set(
    publicModels.map((item) => `${item.categoryCode}:${item.seriesCode}`)
  );

  return {
    categories: publicCategories.filter((item) => validCategoryCodes.has(item.code)),
    series: publicSeries.filter((item) => validSeriesKeys.has(`${item.categoryCode}:${item.code}`)),
    models: publicModels,
    versions: publicVersions
  };
};

/** 将知识治理文档转换为 API 输出并隐藏团队及审计内部字段。 */
export const formatCustomerServiceKnowledges = (
  items: Awaited<ReturnType<typeof listCustomerServiceKnowledges>>
) =>
  items.map((item) => ({
    ...item,
    id: String(item._id),
    datasetId: String(item.datasetId),
    collectionId: String(item.collectionId),
    modelIds: stringIds(item.modelIds),
    hardwareVersionIds: stringIds(item.hardwareVersionIds),
    softwareVersionIds: stringIds(item.softwareVersionIds),
    versionGroupId: String(item.versionGroupId),
    previousKnowledgeId: item.previousKnowledgeId ? String(item.previousKnowledgeId) : undefined,
    sourceRequestRecordId: item.sourceRequestRecordId
      ? String(item.sourceRequestRecordId)
      : undefined,
    submitterTmbId: item.submitterTmbId ? String(item.submitterTmbId) : undefined,
    reviewerTmbId: item.reviewerTmbId ? String(item.reviewerTmbId) : undefined
  }));

/** 将项目与 Key 绑定文档转换为后台 API 输出。 */
export const formatCustomerServiceProjects = ({
  projects,
  keyBindings,
  visibleOpenApiKeyIds
}: {
  projects: Awaited<ReturnType<typeof listCustomerServiceProjects>>;
  keyBindings: Awaited<ReturnType<typeof listCustomerServiceKeyBindings>>;
  visibleOpenApiKeyIds?: Set<string>;
}) => ({
  projects: projects.map((item) => {
    const storedStatus = item.workflowSyncStatus ?? CustomerServiceWorkflowSyncStatusEnum.idle;
    // 同步仅执行轻量 Mongo 写入；超过十分钟仍为 syncing 说明进程已中断，允许运营重试。
    const staleSync =
      storedStatus === CustomerServiceWorkflowSyncStatusEnum.syncing &&
      (!item.workflowSyncLastAttemptTime ||
        Date.now() - item.workflowSyncLastAttemptTime.getTime() > WORKFLOW_SYNC_STALE_MS);

    return {
      ...item,
      id: String(item._id),
      appId: String(item.appId),
      modelIds: stringIds(item.modelIds),
      workflowSync: {
        status: staleSync ? CustomerServiceWorkflowSyncStatusEnum.failed : storedStatus,
        failureReason: staleSync
          ? '上次工作流同步已中断，请重新同步'
          : (item.workflowSyncFailureReason ?? ''),
        failureTime: staleSync ? item.workflowSyncLastAttemptTime : item.workflowSyncFailureTime,
        lastAttemptTime: item.workflowSyncLastAttemptTime,
        successTime: item.workflowSyncSuccessTime
      }
    };
  }),
  keyBindings: keyBindings.map((item) => {
    // `item` contains the real Key id. Remove it before spreading so the
    // visibility gate below cannot be shadowed by an earlier spread.
    // The admin list is allowed to expose it only when the current member
    // owns the underlying OpenAPI Key.
    const { openApiKeyId: _openApiKeyId, ...safeItem } = item;
    return {
      ...safeItem,
      id: String(item._id),
      projectId: String(item.projectId),
      ...(visibleOpenApiKeyIds?.has(String(item.openApiKeyId)) === true && {
        openApiKeyId: String(item.openApiKeyId)
      })
    };
  })
});

/** 将客服岗位文档转换为后台 API 输出。 */
export const formatCustomerServiceMemberRoles = (
  items: Awaited<ReturnType<typeof listCustomerServiceMemberRoles>>,
  memberMap: Map<string, { name: string; avatar: string }> = new Map()
) =>
  items.map((item) => ({
    ...item,
    id: String(item._id),
    tmbId: String(item.tmbId),
    memberName: memberMap.get(String(item.tmbId))?.name ?? '已删除成员',
    memberAvatar: memberMap.get(String(item.tmbId))?.avatar ?? ''
  }));
