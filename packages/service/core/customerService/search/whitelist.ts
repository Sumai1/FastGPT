import {
  CustomerServiceAudienceEnum,
  CustomerServiceAudienceRank,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  resolveCustomerServiceAudience
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import { MongoCustomerServiceKnowledge } from '../knowledge/schema';
import { findProductModelById } from '../product/entity';
import { findCustomerServiceProjectById } from '../project/entity';

/**
 * 计算客服检索允许访问的 collection。
 * 白名单完全由服务端根据团队、项目、受众、产品、版本和生效时间生成；无匹配返回空数组，
 * 查询错误向上抛出，调用方不得降级为全库搜索。
 */
export const getCustomerServiceCollectionIds = async ({
  teamId,
  projectId,
  maxAudience,
  requestAudience,
  modelId,
  hardwareVersionId,
  softwareVersionId,
  now = new Date()
}: {
  teamId: string;
  projectId: string;
  maxAudience: CustomerServiceAudienceEnum;
  requestAudience?: CustomerServiceAudienceEnum;
  modelId?: string;
  hardwareVersionId?: string;
  softwareVersionId?: string;
  now?: Date;
}) => {
  const project = await findCustomerServiceProjectById({ teamId, projectId });
  if (!project || project.status !== CustomerServiceProjectStatusEnum.active) {
    throw new UserError('Customer service project is unavailable');
  }
  // 项目产品范围为空表示尚未完成配置，必须返回空白名单，不能解释为团队全量产品。
  if (project.modelIds.length === 0) return [];

  const model = modelId ? await findProductModelById({ teamId, id: modelId }) : undefined;
  if (
    modelId &&
    (!model ||
      model.status !== CustomerServiceProductStatusEnum.active ||
      !project.modelIds.some((item) => String(item) === modelId))
  ) {
    throw new UserError('Product model is not available in this project');
  }
  // 型号没有绑定任何 dataset 时显式返回空白名单，不能退回团队内其他通用知识。
  if (model && model.datasetIds.length === 0) return [];

  const audience = resolveCustomerServiceAudience({
    maxAudience,
    requestedAudience: requestAudience
  });
  const allowedAudiences = Object.values(CustomerServiceAudienceEnum).filter(
    (item) => CustomerServiceAudienceRank[item] <= CustomerServiceAudienceRank[audience]
  );
  const optionalScope = ({ field, value }: { field: string; value?: string }) =>
    value
      ? {
          $or: [{ [field]: { $size: 0 } }, { [field]: value }]
        }
      : { [field]: { $size: 0 } };

  const records = await MongoCustomerServiceKnowledge.find({
    teamId,
    ...(model && { datasetId: { $in: model.datasetIds } }),
    status: CustomerServiceKnowledgeStatusEnum.published,
    audienceLevel: { $in: allowedAudiences },
    $and: [
      optionalScope({ field: 'modelIds', value: modelId }),
      optionalScope({ field: 'hardwareVersionIds', value: hardwareVersionId }),
      optionalScope({ field: 'softwareVersionIds', value: softwareVersionId }),
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
    .select('collectionId')
    .lean();

  return Array.from(new Set(records.map((item) => String(item.collectionId))));
};
