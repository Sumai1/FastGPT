import { describe, expect, it } from 'vitest';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { CustomerServicePublicIdSchema } from '@fastgpt/global/core/customerService/type';
import {
  CustomerServiceAdminManagedProjectCreateBodySchema,
  CustomerServiceAdminFrequentQuestionListBodySchema,
  CustomerServiceAdminOperationListBodySchema,
  CustomerServiceAdminOperationToKnowledgeBodySchema,
  CustomerServiceAdminKnowledgeAuditListQuerySchema,
  CustomerServiceAdminKnowledgeAuditListResponseSchema,
  CustomerServiceAdminRoleSetBodySchema,
  CustomerServiceFeedbackBodySchema,
  CustomerServiceInternalStopBodySchema,
  CustomerServicePublicBootstrapResponseSchema,
  CustomerServicePublicChatBodySchema,
  CustomerServicePublicChatResponseSchema,
  CustomerServicePublicHandoffBodySchema,
  CustomerServicePublicHandoffResponseSchema,
  CustomerServicePublicStopBodySchema,
  CustomerServiceStopBodySchema,
  CustomerServiceStopResponseSchema
} from '@fastgpt/global/openapi/customerService/api';
import { CustomerServicePath } from '@fastgpt/global/openapi/customerService';
import { CreateCollectionByFileIdBodySchema } from '@fastgpt/global/openapi/core/dataset/collection/createApi';

describe('CustomerServiceAdminManagedProjectCreateBodySchema', () => {
  const validBody = {
    name: '拍照机智能客服',
    modelIds: ['68ad85a7463006c963799a09'],
    defaultAudience: CustomerServiceAudienceEnum.public,
    welcomeText: '您好，请告诉我设备型号。',
    recommendedQuestions: ['设备报错怎么处理？'],
    humanContact: { name: '人工客服' }
  };

  it('accepts business fields and applies a default retention period', () => {
    const parsed = CustomerServiceAdminManagedProjectCreateBodySchema.parse(validBody);
    expect(parsed.sessionRetentionDays).toBe(180);
  });

  it('requires at least one product model', () => {
    expect(() =>
      CustomerServiceAdminManagedProjectCreateBodySchema.parse({ ...validBody, modelIds: [] })
    ).toThrow();
  });

  it('strips internal resource identifiers that are not part of the managed contract', () => {
    const parsed = CustomerServiceAdminManagedProjectCreateBodySchema.parse({
      ...validBody,
      appId: '68ad85a7463006c963799a20',
      openApiKeyId: '68ad85a7463006c963799a22',
      datasetIds: ['68ad85a7463006c963799a08']
    });
    expect(parsed).not.toHaveProperty('appId');
    expect(parsed).not.toHaveProperty('openApiKeyId');
    expect(parsed).not.toHaveProperty('datasetIds');
  });
});

describe('customer service public contracts', () => {
  it('accepts random global public ids and rejects unsafe route values', () => {
    expect(CustomerServicePublicIdSchema.parse(' cs_aB3dE5fG7hJ9kL2mN4pQ6rS8 ')).toBe(
      'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8'
    );
    expect(() => CustomerServicePublicIdSchema.parse('../private')).toThrow();
  });

  it('removes client-controlled audience and external user identifiers', () => {
    const parsed = CustomerServicePublicChatBodySchema.parse({
      publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
      sessionId: 'visitor-session',
      message: '设备怎么使用？',
      audience: CustomerServiceAudienceEnum.internal,
      externalUserId: 'admin-user'
    });

    expect(parsed.publicId).toBe('cs_aB3dE5fG7hJ9kL2mN4pQ6rS8');
    expect(parsed).not.toHaveProperty('audience');
    expect(parsed).not.toHaveProperty('externalUserId');
  });

  it('requires a visitor session when the public caller supplies an idempotency key', () => {
    const body = {
      publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
      requestId: 'shared-request-id',
      message: '设备怎么使用？'
    };

    expect(() => CustomerServicePublicChatBodySchema.parse(body)).toThrow();
    expect(
      CustomerServicePublicChatBodySchema.parse({ ...body, sessionId: 'visitor-session' }).sessionId
    ).toBe('visitor-session');
  });

  it('strips product ObjectIds from the public bootstrap catalog', () => {
    const objectIds = {
      category: '68ad85a7463006c963799a01',
      series: '68ad85a7463006c963799a02',
      model: '68ad85a7463006c963799a03',
      version: '68ad85a7463006c963799a04',
      dataset: '68ad85a7463006c963799a05'
    };
    const parsed = CustomerServicePublicBootstrapResponseSchema.parse({
      project: {
        publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
        name: '产品智能客服',
        welcomeText: '您好',
        recommendedQuestions: [],
        humanContact: { name: '人工客服' }
      },
      catalog: {
        categories: [
          {
            id: objectIds.category,
            code: 'PHOTO',
            name: '拍照机',
            aliases: [],
            description: '',
            status: CustomerServiceResourceStatusEnum.active,
            sortOrder: 0
          }
        ],
        series: [
          {
            id: objectIds.series,
            categoryId: objectIds.category,
            categoryCode: 'PHOTO',
            code: 'DESKTOP',
            name: '桌面系列',
            aliases: [],
            description: '',
            status: CustomerServiceResourceStatusEnum.active,
            sortOrder: 0
          }
        ],
        models: [
          {
            id: objectIds.model,
            seriesId: objectIds.series,
            datasetIds: [objectIds.dataset],
            categoryCode: 'PHOTO',
            seriesCode: 'DESKTOP',
            modelCode: 'DT-2026A',
            name: 'DT-2026A',
            aliases: [],
            description: '',
            status: CustomerServiceProductStatusEnum.active,
            discontinuedAt: null,
            sortOrder: 0
          }
        ],
        versions: [
          {
            id: objectIds.version,
            modelId: objectIds.model,
            modelCode: 'DT-2026A',
            type: 'software',
            versionCode: 'V3.1',
            name: '软件 V3.1',
            aliases: [],
            description: '',
            status: CustomerServiceResourceStatusEnum.active,
            effectiveFrom: null,
            effectiveTo: null
          }
        ]
      }
    });

    const serialized = JSON.stringify(parsed);
    Object.values(objectIds).forEach((id) => expect(serialized).not.toContain(id));
    expect(parsed.catalog.models[0]).toEqual(
      expect.objectContaining({
        categoryCode: 'PHOTO',
        seriesCode: 'DESKTOP',
        modelCode: 'DT-2026A'
      })
    );
  });

  it('strips internal resource identifiers from the public chat response contract', () => {
    const parsed = CustomerServicePublicChatResponseSchema.parse({
      requestId: 'public-request',
      sessionId: 'public-session',
      messageId: 'public-message',
      status: 'answered',
      answer: '请先关闭电源。',
      audience: CustomerServiceAudienceEnum.public,
      resolvedProduct: {
        modelId: '68ad85a7463006c963799a09',
        modelCode: 'DT-2026A',
        hardwareVersionId: '68ad85a7463006c963799a24',
        hardwareVersionCode: 'V2',
        softwareVersionId: null,
        softwareVersionCode: null
      },
      candidates: [
        {
          id: '68ad85a7463006c963799a31',
          seriesId: '68ad85a7463006c963799a32',
          datasetIds: ['68ad85a7463006c963799a33'],
          modelCode: 'DT-2026B',
          name: '候选型号',
          description: '候选说明'
        }
      ],
      citations: [
        {
          title: '用户手册.pdf',
          summary: '关闭电源后检查连接线。',
          score: 0.9,
          id: 'private-chunk-id',
          datasetId: '68ad85a7463006c963799a41',
          collectionId: '68ad85a7463006c963799a42'
        }
      ]
    });

    const serialized = JSON.stringify(parsed);
    expect(serialized).not.toMatch(
      /modelId|hardwareVersionId|softwareVersionId|datasetId|collectionId/
    );
    expect(serialized).not.toContain('private-chunk-id');
    expect(parsed.citations).toEqual([
      { title: '用户手册.pdf', summary: '关闭电源后检查连接线。', score: 0.9 }
    ]);
    expect(() =>
      CustomerServicePublicChatResponseSchema.parse({
        ...parsed,
        audience: CustomerServiceAudienceEnum.internal
      })
    ).toThrow();
  });

  it('accepts the independent unresolved feedback type', () => {
    expect(
      CustomerServiceFeedbackBodySchema.parse({
        sessionId: 'visitor-session',
        messageId: 'answer-message',
        type: 'unresolved'
      }).type
    ).toBe('unresolved');
  });

  it('validates stop identities for OpenAPI, internal and public callers', () => {
    const identity = { requestId: 'browser-request', sessionId: 'visitor-session' };
    expect(CustomerServiceStopBodySchema.parse(identity)).toEqual(identity);
    expect(
      CustomerServiceInternalStopBodySchema.parse({
        ...identity,
        projectId: '68ad85a7463006c963799a21'
      }).projectId
    ).toBe('68ad85a7463006c963799a21');
    expect(
      CustomerServicePublicStopBodySchema.parse({
        ...identity,
        publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
        audience: CustomerServiceAudienceEnum.internal,
        apiKey: 'browser-key'
      })
    ).toEqual({
      ...identity,
      publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8'
    });
    expect(() => CustomerServiceStopBodySchema.parse({ requestId: 'missing-session' })).toThrow();
    expect(CustomerServiceStopResponseSchema.parse({ stopped: true })).toEqual({ stopped: true });
  });

  it('publishes v1, internal and public stop paths', () => {
    expect(CustomerServicePath['/customer-service/v1/stop']?.post).toBeDefined();
    expect(CustomerServicePath['/customer-service/internal/stop']?.post).toBeDefined();
    expect(CustomerServicePath['/customer-service/public/stop']?.post).toBeDefined();
  });
});

describe('customer service operation contracts', () => {
  it('applies bounded pagination and supports unresolved filtering', () => {
    const parsed = CustomerServiceAdminOperationListBodySchema.parse({
      feedback: 'unresolved'
    });
    expect(parsed).toEqual(
      expect.objectContaining({ pageNum: 1, pageSize: 20, feedback: 'unresolved' })
    );
    expect(() => CustomerServiceAdminOperationListBodySchema.parse({ pageSize: 101 })).toThrow();
  });

  it('requires a reviewed answer before an operation can become a knowledge draft', () => {
    const base = {
      requestRecordId: '68ad85a7463006c963799a20',
      datasetId: '68ad85a7463006c963799a08',
      title: '设备报错怎么处理？',
      answer: '先断电检查连接，再记录错误码。'
    };
    expect(CustomerServiceAdminOperationToKnowledgeBodySchema.parse(base).modelIds).toEqual([]);
    expect(() =>
      CustomerServiceAdminOperationToKnowledgeBodySchema.parse({ ...base, answer: ' ' })
    ).toThrow();
  });

  it('bounds frequent-question aggregation and validates its time range', () => {
    expect(CustomerServiceAdminFrequentQuestionListBodySchema.parse({})).toEqual(
      expect.objectContaining({ limit: 10, minimumCount: 2 })
    );
    expect(() =>
      CustomerServiceAdminFrequentQuestionListBodySchema.parse({ limit: 101 })
    ).toThrow();
    expect(() =>
      CustomerServiceAdminFrequentQuestionListBodySchema.parse({
        startTime: '2026-08-17T00:00:00.000Z',
        endTime: '2026-08-16T00:00:00.000Z'
      })
    ).toThrow();
  });
});

describe('customer service knowledge upload boundary', () => {
  it('allows native file collections to be created forbidden until governance succeeds', () => {
    const parsed = CreateCollectionByFileIdBodySchema.parse({
      datasetId: '68ad85a7463006c963799a08',
      fileId: 'dataset/team/document.pdf',
      forbid: true,
      metadata: { customerServicePendingRegistration: true }
    });
    expect(parsed).toMatchObject({
      forbid: true,
      metadata: { customerServicePendingRegistration: true }
    });
  });
});

describe('customer service knowledge audit and role contracts', () => {
  it('validates audit query filters and response schema with operator info', () => {
    const query = CustomerServiceAdminKnowledgeAuditListQuerySchema.parse({
      knowledgeId: '68ad85a7463006c963799a15',
      versionGroupId: '68ad85a7463006c963799a11'
    });
    expect(query.knowledgeId).toBe('68ad85a7463006c963799a15');
    expect(query.versionGroupId).toBe('68ad85a7463006c963799a11');

    const response = CustomerServiceAdminKnowledgeAuditListResponseSchema.parse([
      {
        id: '68ad85a7463006c963799a99',
        knowledgeId: '68ad85a7463006c963799a15',
        versionGroupId: '68ad85a7463006c963799a11',
        version: 1,
        diffSummary: '初始版本创建',
        action: 'create',
        toStatus: 'draft',
        reason: '',
        operatorTmbId: '68ad85a7463006c963799a14',
        operatorName: '李四',
        operatorAvatar: '/avatar.png',
        createTime: new Date()
      }
    ]);
    expect(response[0].operatorName).toBe('李四');
    expect(response[0].version).toBe(1);
  });

  it('accepts role scope restrictions in role set contract', () => {
    const parsed = CustomerServiceAdminRoleSetBodySchema.parse({
      tmbId: '68ad85a7463006c963799a13',
      role: 'knowledgeEditor',
      reason: '分配拍照机产品线维护职责',
      allowedCategoryIds: ['68ad85a7463006c963799a01'],
      allowedModelIds: ['68ad85a7463006c963799a03']
    });
    expect(parsed.allowedCategoryIds).toEqual(['68ad85a7463006c963799a01']);
    expect(parsed.allowedModelIds).toEqual(['68ad85a7463006c963799a03']);
  });

  it('validates public handoff snapshot contract and publishes OpenAPI paths', () => {
    const handoff = CustomerServicePublicHandoffBodySchema.parse({
      publicId: 'cs_aB3dE5fG7hJ9kL2mN4pQ6rS8',
      sessionId: 'visitor-001',
      requestId: 'req-001',
      productModelName: 'DT-2026A',
      faultCode: 'E-1002',
      completedSteps: ['电源检查', '清理纸屑'],
      summaryText: '已多次重启，红灯常亮'
    });
    expect(handoff.productModelName).toBe('DT-2026A');
    expect(handoff.completedSteps).toHaveLength(2);
    expect(CustomerServicePublicHandoffResponseSchema.parse(undefined)).toBeUndefined();

    expect(CustomerServicePath['/customer-service/admin/knowledge/audits']?.get).toBeDefined();
    expect(CustomerServicePath['/customer-service/public/handoff']?.post).toBeDefined();
  });
});
