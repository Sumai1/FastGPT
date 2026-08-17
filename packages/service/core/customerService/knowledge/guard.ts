import { UserError } from '@fastgpt/global/common/error/utils';
import { CustomerServiceKnowledgeStatusEnum } from '@fastgpt/global/core/customerService/constants';
import type { ClientSession } from '../../../common/mongo';
import { Types } from '../../../common/mongo';
import { MongoCustomerServiceKnowledge } from './schema';

const immutableKnowledgeStatuses = [
  CustomerServiceKnowledgeStatusEnum.pending,
  CustomerServiceKnowledgeStatusEnum.published,
  CustomerServiceKnowledgeStatusEnum.offline
];

const immutableKnowledgeError =
  'Customer service knowledge under review or already published is immutable; create a new version to edit it';

/**
 * 返回已纳入客服治理的 collection。普通 App 召回默认排除这些 collection，
 * 只有携带可信客服白名单的执行上下文才能进入。
 */
export const getCustomerServiceGovernedCollectionIds = async ({
  teamId,
  datasetIds
}: {
  teamId: string;
  datasetIds: string[];
}) => {
  const validDatasetIds = datasetIds.filter((id) => Types.ObjectId.isValid(id));
  if (validDatasetIds.length === 0 || !Types.ObjectId.isValid(teamId)) return [];

  const items = await MongoCustomerServiceKnowledge.find({
    teamId,
    datasetId: { $in: Array.from(new Set(validDatasetIds)) }
  })
    .select('collectionId')
    .lean();

  return Array.from(new Set(items.map((item) => String(item.collectionId))));
};

/**
 * 禁止通过 FastGPT 原生 Dataset 写入链路修改待审核、已发布或已下架的客服知识。
 * 草稿与已驳回版本仍允许使用原生编辑和训练能力；正式版本必须创建新版本后重新审核。
 */
export const assertCustomerServiceCollectionsMutable = async ({
  teamId,
  collectionIds,
  datasetIds = [],
  session
}: {
  teamId: string;
  collectionIds: string[];
  datasetIds?: string[];
  session?: ClientSession;
}) => {
  const validCollectionIds = collectionIds.filter((id) => Types.ObjectId.isValid(id));
  const validDatasetIds = datasetIds.filter((id) => Types.ObjectId.isValid(id));
  if (
    (validCollectionIds.length === 0 && validDatasetIds.length === 0) ||
    !Types.ObjectId.isValid(teamId)
  )
    return;

  const scope = [
    ...(validCollectionIds.length > 0
      ? [{ collectionId: { $in: Array.from(new Set(validCollectionIds)) } }]
      : []),
    ...(validDatasetIds.length > 0
      ? [{ datasetId: { $in: Array.from(new Set(validDatasetIds)) } }]
      : [])
  ];
  const lockedKnowledge = await MongoCustomerServiceKnowledge.findOne({
    teamId,
    status: { $in: immutableKnowledgeStatuses },
    $or: scope
  })
    .select('_id status collectionId')
    .session(session ?? null)
    .lean();

  if (lockedKnowledge) {
    throw new UserError(immutableKnowledgeError);
  }
};
