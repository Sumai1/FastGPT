import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceProductModelType,
  CustomerServiceProductVersionType
} from '@fastgpt/global/core/customerService/type';

const listActiveProductCatalog = vi.hoisted(() => vi.fn());
vi.mock('@fastgpt/service/core/customerService/product/entity', () => ({
  listActiveProductCatalog
}));

import {
  getCustomerServiceHumanAnswer,
  resolveCustomerServiceHumanRule
} from '@fastgpt/service/core/customerService/chat/rule';
import { resolveCustomerServiceProduct } from '@fastgpt/service/core/customerService/chat/productResolver';

const teamId = '68ad85a7463006c963799a01';
const tmbId = '68ad85a7463006c963799a02';
const seriesId = '68ad85a7463006c963799a03';
const now = new Date('2026-08-11T00:00:00.000Z');
const createModel = ({
  id,
  modelCode,
  aliases = []
}: {
  id: string;
  modelCode: string;
  aliases?: string[];
}): CustomerServiceProductModelType => ({
  _id: id,
  teamId,
  seriesId,
  modelCode,
  name: `${modelCode} 设备`,
  aliases,
  description: '',
  status: CustomerServiceProductStatusEnum.active,
  datasetIds: [],
  sortOrder: 0,
  tmbId,
  updateTmbId: tmbId,
  createTime: now,
  updateTime: now
});
const createVersion = ({
  id,
  modelId,
  type,
  versionCode
}: {
  id: string;
  modelId: string;
  type: CustomerServiceVersionTypeEnum;
  versionCode: string;
}): CustomerServiceProductVersionType => ({
  _id: id,
  teamId,
  modelId,
  type,
  versionCode,
  name: versionCode,
  aliases: [],
  description: '',
  status: CustomerServiceResourceStatusEnum.active,
  tmbId,
  updateTmbId: tmbId,
  createTime: now,
  updateTime: now
});

const ruleConfig = {
  lowConfidenceThreshold: 0.45,
  lowConfidenceMaxCount: 2,
  maxAnswerTokens: 600,
  dangerousKeywords: ['电池鼓包'],
  disputeKeywords: [],
  complaintKeywords: [],
  humanRequestKeywords: []
};

describe('customer service server rules', () => {
  it.each([
    ['设备冒烟了还能拆机吗', 'dangerous_operation'],
    ['电池鼓包应该怎么处理', 'dangerous_operation'],
    ['我要退款并要求赔偿', 'dispute'],
    ['我要向 12315 投诉', 'complaint'],
    ['请帮我转人工客服', 'human_requested']
  ] as const)('routes %s to human with reason %s', (message, reason) => {
    expect(resolveCustomerServiceHumanRule({ message, ruleConfig })).toBe(reason);
  });

  it('does not hand off a normal product question', () => {
    expect(
      resolveCustomerServiceHumanRule({ message: '怎么更换打印纸？', ruleConfig })
    ).toBeUndefined();
  });

  it('returns an explicit safety warning for dangerous operations', () => {
    expect(getCustomerServiceHumanAnswer('dangerous_operation').safetyWarning).toContain('带电');
  });
});

describe('customer service product resolver', () => {
  const modelA = createModel({
    id: '68ad85a7463006c963799a11',
    modelCode: 'DT-2026A',
    aliases: ['桌面款']
  });
  const modelB = createModel({
    id: '68ad85a7463006c963799a12',
    modelCode: 'DT-2026B',
    aliases: ['桌面款']
  });
  const hardwareV1 = createVersion({
    id: '68ad85a7463006c963799a21',
    modelId: modelA._id,
    type: CustomerServiceVersionTypeEnum.hardware,
    versionCode: 'HW-V1'
  });
  const hardwareV2 = createVersion({
    id: '68ad85a7463006c963799a22',
    modelId: modelA._id,
    type: CustomerServiceVersionTypeEnum.hardware,
    versionCode: 'HW-V2'
  });

  beforeEach(() => {
    listActiveProductCatalog.mockReset();
    listActiveProductCatalog.mockImplementation(async ({ modelIds }: { modelIds?: string[] }) =>
      modelIds?.length === 0
        ? [[], [], [], []]
        : [[], [], [modelA, modelB], [hardwareV1, hardwareV2]]
    );
  });

  it('treats an empty project model scope as no visible products', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [],
      message: 'DT-2026A 如何换纸？',
      productModel: 'DT-2026A'
    });

    expect(result.model).toBeUndefined();
    expect(result.modelCandidates).toEqual([]);
    expect(result.clarification).toBe('model_not_found');
    expect(listActiveProductCatalog).toHaveBeenCalledWith({ teamId, modelIds: [] });
  });

  it('prefers an explicit exact model code', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [modelA._id, modelB._id],
      message: '如何换纸',
      productModel: 'dt_2026a'
    });
    expect(result.model?._id).toBe(modelA._id);
    expect(result.clarification).toBeUndefined();
  });

  it('returns candidates when an alias is ambiguous', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [modelA._id, modelB._id],
      message: '如何换纸',
      productModel: '桌面款'
    });
    expect(result.clarification).toBe('model_ambiguous');
    expect(result.modelCandidates.map((item) => item._id)).toEqual([modelA._id, modelB._id]);
  });

  it('reuses the previous session model when the new message has no model', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [modelA._id, modelB._id],
      message: '那打印纸怎么换？',
      previousModelId: modelB._id
    });
    expect(result.model?._id).toBe(modelB._id);
  });

  it('requires a version for version-sensitive questions with multiple versions', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [modelA._id, modelB._id],
      message: 'DT-2026A 的错误码参数是什么？'
    });
    expect(result.model?._id).toBe(modelA._id);
    expect(result.clarification).toBe('version_required');
  });

  it('resolves an explicit version before entering search', async () => {
    const result = await resolveCustomerServiceProduct({
      teamId,
      projectModelIds: [modelA._id, modelB._id],
      message: '错误码参数是什么？',
      productModel: modelA.modelCode,
      hardwareVersion: hardwareV2.versionCode
    });
    expect(result.hardwareVersion?._id).toBe(hardwareV2._id);
    expect(result.clarification).toBeUndefined();
  });
});
