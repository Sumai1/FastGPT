import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceRoles } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminUnregisteredKnowledgeListResponseSchema,
  type CustomerServiceAdminUnregisteredKnowledgeListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { DatasetCollectionTypeEnum, DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import { WritePermissionVal } from '@fastgpt/global/support/permission/constant';
import { authDatasetByTmbId } from '@fastgpt/service/support/permission/dataset/auth';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { MongoCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/schema';
import { getCustomerServiceKnowledgeTrainingStatusMap } from '@fastgpt/service/core/customerService/knowledge/service';

/**
 * 发现当前成员可写知识库中尚未登记的 collection，供上传后治理失败或跨页面中断时恢复。
 * 权限按原生 Dataset 逐个过滤，不能仅凭团队归属向业务岗位暴露其他成员的资料。
 */
async function handler(
  req: NextApiRequest
): Promise<CustomerServiceAdminUnregisteredKnowledgeListResponse> {
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor
    ]
  });
  const datasets = await MongoDataset.find({
    teamId,
    deleteTime: null,
    type: { $ne: DatasetTypeEnum.folder }
  })
    .select('_id name avatar vectorModel')
    .lean();
  const permissionResults = await Promise.allSettled(
    datasets.map((dataset) =>
      authDatasetByTmbId({
        tmbId,
        datasetId: String(dataset._id),
        per: WritePermissionVal,
        isRoot
      })
    )
  );
  const writableDatasets = datasets.filter(
    (_, index) => permissionResults[index].status === 'fulfilled'
  );
  const datasetIds = writableDatasets.map((item) => item._id);
  const governedCollectionIds = await MongoCustomerServiceKnowledge.distinct('collectionId', {
    teamId,
    datasetId: { $in: datasetIds }
  });
  const collections = await MongoDatasetCollection.find({
    teamId,
    datasetId: { $in: datasetIds },
    type: { $ne: DatasetCollectionTypeEnum.folder },
    'metadata.customerServicePendingRegistration': true,
    _id: { $nin: governedCollectionIds }
  })
    .select('_id datasetId name updateTime')
    .sort({ updateTime: -1 })
    .limit(100)
    .lean();
  const trainingStatusMap = await getCustomerServiceKnowledgeTrainingStatusMap({
    teamId,
    items: collections.map((item) => ({ collectionId: item._id }))
  });
  const datasetMap = new Map(writableDatasets.map((item) => [String(item._id), item]));

  return CustomerServiceAdminUnregisteredKnowledgeListResponseSchema.parse(
    collections.flatMap((collection) => {
      const dataset = datasetMap.get(String(collection.datasetId));
      if (!dataset) return [];
      return [
        {
          datasetId: String(dataset._id),
          datasetName: dataset.name,
          datasetAvatar: dataset.avatar,
          vectorModel: dataset.vectorModel,
          collectionId: String(collection._id),
          name: collection.name,
          ...(trainingStatusMap.get(String(collection._id)) ?? {
            trainingStatus: 'empty' as const,
            trainingAmount: 0,
            dataAmount: 0,
            trainingError: ''
          }),
          updateTime: collection.updateTime
        }
      ];
    })
  );
}

export default NextAPI(handler);
