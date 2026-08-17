import { describe, expect, it } from 'vitest';
import { getRootUser } from '@test/datas/users';
import { Call } from '@test/utils/request';
import handler from '@/pages/api/customer-service/admin/knowledge/unregistered';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoDatasetCollection } from '@fastgpt/service/core/dataset/collection/schema';
import { DatasetCollectionTypeEnum, DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import type { CustomerServiceAdminUnregisteredKnowledgeListResponse } from '@fastgpt/global/openapi/customerService/api';

describe('customer service unregistered knowledge API', () => {
  it('returns only collections explicitly left pending by the customer-service upload flow', async () => {
    const root = await getRootUser();
    const dataset = await MongoDataset.create({
      teamId: root.teamId,
      tmbId: root.tmbId,
      name: '客服待登记知识库',
      type: DatasetTypeEnum.dataset,
      vectorModel: 'text-embedding-3-small',
      agentModel: 'gpt-5'
    });
    const [pending, ordinary] = await MongoDatasetCollection.create([
      {
        teamId: root.teamId,
        tmbId: root.tmbId,
        datasetId: dataset._id,
        type: DatasetCollectionTypeEnum.file,
        name: '上传中断资料.pdf',
        forbid: true,
        metadata: { customerServicePendingRegistration: true }
      },
      {
        teamId: root.teamId,
        tmbId: root.tmbId,
        datasetId: dataset._id,
        type: DatasetCollectionTypeEnum.file,
        name: '普通原生资料.pdf'
      }
    ]);

    const response = await Call<
      Record<string, never>,
      Record<string, never>,
      CustomerServiceAdminUnregisteredKnowledgeListResponse
    >(handler, { auth: root });

    expect(response.code).toBe(200);
    expect(response.data).toEqual([
      expect.objectContaining({
        collectionId: String(pending._id),
        datasetId: String(dataset._id),
        name: pending.name
      })
    ]);
    expect(response.data.some((item) => item.collectionId === String(ordinary._id))).toBe(false);
  });
});
