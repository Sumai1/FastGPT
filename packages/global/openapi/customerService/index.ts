import type { OpenAPIPath } from '../type';
import { DevApiTagsMap, SystemOpenApiTagMap } from '../tag';
import {
  CustomerServiceAdminBindDatasetsBodySchema,
  CustomerServiceAdminBindDatasetsResponseSchema,
  CustomerServiceAdminKeyBindBodySchema,
  CustomerServiceAdminKeyBindResponseSchema,
  CustomerServiceAdminKeyUpdateBodySchema,
  CustomerServiceAdminKeyUpdateResponseSchema,
  CustomerServiceAdminKnowledgeCreateBodySchema,
  CustomerServiceAdminKnowledgeCreateResponseSchema,
  CustomerServiceAdminKnowledgeListBodySchema,
  CustomerServiceAdminKnowledgeListResponseSchema,
  CustomerServiceAdminKnowledgeOfflineBodySchema,
  CustomerServiceAdminKnowledgeOfflineResponseSchema,
  CustomerServiceAdminKnowledgeReviewBodySchema,
  CustomerServiceAdminKnowledgeReviewResponseSchema,
  CustomerServiceAdminKnowledgeSubmitBodySchema,
  CustomerServiceAdminKnowledgeSubmitResponseSchema,
  CustomerServiceAdminKnowledgeUpdateBodySchema,
  CustomerServiceAdminKnowledgeUpdateResponseSchema,
  CustomerServiceAdminUnregisteredKnowledgeListResponseSchema,
  CustomerServiceAdminProductCreateBodySchema,
  CustomerServiceAdminProductCreateResponseSchema,
  CustomerServiceAdminProductListResponseSchema,
  CustomerServiceAdminProductUpdateBodySchema,
  CustomerServiceAdminProductUpdateResponseSchema,
  CustomerServiceAdminProjectCreateBodySchema,
  CustomerServiceAdminProjectCreateResponseSchema,
  CustomerServiceAdminManagedProjectCreateBodySchema,
  CustomerServiceAdminManagedProjectCreateResponseSchema,
  CustomerServiceAdminHealthResponseSchema,
  CustomerServiceAdminMeResponseSchema,
  CustomerServiceAdminFrequentQuestionListBodySchema,
  CustomerServiceAdminFrequentQuestionListResponseSchema,
  CustomerServiceAdminOperationListBodySchema,
  CustomerServiceAdminOperationListResponseSchema,
  CustomerServiceAdminOperationToKnowledgeBodySchema,
  CustomerServiceAdminOperationToKnowledgeResponseSchema,
  CustomerServiceAdminProjectListResponseSchema,
  CustomerServiceAdminProjectSyncWorkflowBodySchema,
  CustomerServiceAdminProjectSyncWorkflowResponseSchema,
  CustomerServiceAdminProjectUpdateBodySchema,
  CustomerServiceAdminProjectUpdateResponseSchema,
  CustomerServiceAdminRoleListResponseSchema,
  CustomerServiceAdminRoleMemberListResponseSchema,
  CustomerServiceAdminRoleSetBodySchema,
  CustomerServiceAdminRoleSetResponseSchema,
  CustomerServiceChatBodySchema,
  CustomerServiceChatResponseSchema,
  CustomerServiceStopBodySchema,
  CustomerServiceStopResponseSchema,
  CustomerServiceFeedbackBodySchema,
  CustomerServiceFeedbackResponseSchema,
  CustomerServiceHealthResponseSchema,
  CustomerServiceInternalBootstrapQuerySchema,
  CustomerServiceInternalBootstrapResponseSchema,
  CustomerServiceInternalChatBodySchema,
  CustomerServiceInternalStopBodySchema,
  CustomerServiceInternalFeedbackBodySchema,
  CustomerServicePublicBootstrapQuerySchema,
  CustomerServicePublicBootstrapResponseSchema,
  CustomerServicePublicChatBodySchema,
  CustomerServicePublicChatResponseSchema,
  CustomerServicePublicStopBodySchema,
  CustomerServicePublicFeedbackBodySchema,
  CustomerServiceProductsResponseSchema
} from './api';

const customerServiceTags = [DevApiTagsMap.customerService];
const customerServiceOpenApiTags = [
  DevApiTagsMap.customerService,
  SystemOpenApiTagMap.customerService
];
const successResponse = (schema: unknown, description = '操作成功') => ({
  200: {
    description,
    content: { 'application/json': { schema } }
  }
});

export const CustomerServicePath: OpenAPIPath = {
  '/customer-service/admin/me': {
    get: {
      summary: '获取当前客服控制台岗位',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminMeResponseSchema)
    }
  },
  '/customer-service/admin/health': {
    get: {
      summary: '获取客服控制台系统健康状态',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminHealthResponseSchema)
    }
  },
  '/customer-service/admin/product/list': {
    get: {
      summary: '获取客服产品目录',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminProductListResponseSchema)
    }
  },
  '/customer-service/admin/product/create': {
    post: {
      summary: '创建客服产品资源',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminProductCreateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminProductCreateResponseSchema)
    }
  },
  '/customer-service/admin/product/update': {
    put: {
      summary: '更新客服产品资源',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminProductUpdateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminProductUpdateResponseSchema)
    }
  },
  '/customer-service/admin/product/bindDatasets': {
    put: {
      summary: '绑定型号知识库',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminBindDatasetsBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminBindDatasetsResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/list': {
    post: {
      summary: '获取知识治理列表',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeListBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeListResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/create': {
    post: {
      summary: '创建知识治理草稿',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeCreateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeCreateResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/unregistered': {
    get: {
      summary: '获取待登记的原生资料',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminUnregisteredKnowledgeListResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/update': {
    put: {
      summary: '更新知识治理草稿',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeUpdateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeUpdateResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/submit': {
    post: {
      summary: '提交知识审核',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeSubmitBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeSubmitResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/review': {
    post: {
      summary: '审核知识',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeReviewBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeReviewResponseSchema)
    }
  },
  '/customer-service/admin/knowledge/offline': {
    post: {
      summary: '下架知识',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKnowledgeOfflineBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKnowledgeOfflineResponseSchema)
    }
  },
  '/customer-service/admin/project/list': {
    get: {
      summary: '获取客服项目和 Key 绑定',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminProjectListResponseSchema)
    }
  },
  '/customer-service/admin/project/create': {
    post: {
      summary: '创建客服项目',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminProjectCreateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminProjectCreateResponseSchema)
    }
  },
  '/customer-service/admin/project/createManaged': {
    post: {
      summary: '托管创建智能客服',
      tags: customerServiceTags,
      requestBody: {
        content: {
          'application/json': { schema: CustomerServiceAdminManagedProjectCreateBodySchema }
        }
      },
      responses: successResponse(CustomerServiceAdminManagedProjectCreateResponseSchema)
    }
  },
  '/customer-service/admin/project/update': {
    put: {
      summary: '更新客服项目',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminProjectUpdateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminProjectUpdateResponseSchema)
    }
  },
  '/customer-service/admin/project/syncWorkflow': {
    post: {
      summary: '同步客服工作流知识库',
      tags: customerServiceTags,
      requestBody: {
        content: {
          'application/json': { schema: CustomerServiceAdminProjectSyncWorkflowBodySchema }
        }
      },
      responses: successResponse(CustomerServiceAdminProjectSyncWorkflowResponseSchema)
    }
  },
  '/customer-service/admin/project/bindKey': {
    post: {
      summary: '绑定客服 OpenAPI Key',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKeyBindBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKeyBindResponseSchema)
    }
  },
  '/customer-service/admin/project/updateKey': {
    put: {
      summary: '更新客服 OpenAPI Key 绑定状态',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminKeyUpdateBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminKeyUpdateResponseSchema)
    }
  },
  '/customer-service/admin/role/list': {
    get: {
      summary: '获取客服岗位列表',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminRoleListResponseSchema)
    }
  },
  '/customer-service/admin/role/members': {
    get: {
      summary: '获取可配置客服岗位的团队成员',
      tags: customerServiceTags,
      responses: successResponse(CustomerServiceAdminRoleMemberListResponseSchema)
    }
  },
  '/customer-service/admin/role/set': {
    put: {
      summary: '设置客服岗位',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminRoleSetBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminRoleSetResponseSchema)
    }
  },
  '/customer-service/admin/operation/list': {
    post: {
      summary: '获取客服对话运营记录',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceAdminOperationListBodySchema } }
      },
      responses: successResponse(CustomerServiceAdminOperationListResponseSchema)
    }
  },
  '/customer-service/admin/operation/frequentQuestions': {
    post: {
      summary: '获取客服高频问题',
      tags: customerServiceTags,
      requestBody: {
        content: {
          'application/json': { schema: CustomerServiceAdminFrequentQuestionListBodySchema }
        }
      },
      responses: successResponse(CustomerServiceAdminFrequentQuestionListResponseSchema)
    }
  },
  '/customer-service/admin/operation/toKnowledge': {
    post: {
      summary: '将未解决问题转为知识草稿',
      tags: customerServiceTags,
      requestBody: {
        content: {
          'application/json': { schema: CustomerServiceAdminOperationToKnowledgeBodySchema }
        }
      },
      responses: successResponse(CustomerServiceAdminOperationToKnowledgeResponseSchema)
    }
  },
  '/customer-service/v1/products': {
    get: {
      summary: '获取客服可选产品',
      tags: customerServiceOpenApiTags,
      responses: successResponse(CustomerServiceProductsResponseSchema)
    }
  },
  '/customer-service/v1/chat': {
    post: {
      summary: '客服聊天',
      tags: customerServiceOpenApiTags,
      requestBody: { content: { 'application/json': { schema: CustomerServiceChatBodySchema } } },
      responses: {
        200: {
          description:
            '客服回答；stream=true 时使用 SSE 返回 answer、answerStop、customerService 和 done 事件',
          content: {
            'application/json': { schema: CustomerServiceChatResponseSchema },
            'text/event-stream': { examples: {} }
          }
        }
      }
    }
  },
  '/customer-service/v1/stop': {
    post: {
      summary: '停止客服回答',
      tags: customerServiceOpenApiTags,
      requestBody: { content: { 'application/json': { schema: CustomerServiceStopBodySchema } } },
      responses: successResponse(CustomerServiceStopResponseSchema)
    }
  },
  '/customer-service/v1/feedback': {
    post: {
      summary: '提交客服反馈',
      tags: customerServiceOpenApiTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceFeedbackBodySchema } }
      },
      responses: successResponse(CustomerServiceFeedbackResponseSchema)
    }
  },
  '/customer-service/v1/health': {
    get: {
      summary: '客服服务健康检查',
      tags: customerServiceOpenApiTags,
      responses: successResponse(CustomerServiceHealthResponseSchema)
    }
  },
  '/customer-service/internal/bootstrap': {
    get: {
      summary: '初始化站内客服',
      tags: customerServiceTags,
      requestParams: { query: CustomerServiceInternalBootstrapQuerySchema },
      responses: successResponse(CustomerServiceInternalBootstrapResponseSchema)
    }
  },
  '/customer-service/internal/chat': {
    post: {
      summary: '站内客服聊天',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceInternalChatBodySchema } }
      },
      responses: successResponse(CustomerServiceChatResponseSchema)
    }
  },
  '/customer-service/internal/stop': {
    post: {
      summary: '停止站内客服回答',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceInternalStopBodySchema } }
      },
      responses: successResponse(CustomerServiceStopResponseSchema)
    }
  },
  '/customer-service/internal/feedback': {
    post: {
      summary: '站内客服反馈',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServiceInternalFeedbackBodySchema } }
      },
      responses: successResponse(CustomerServiceFeedbackResponseSchema)
    }
  },
  '/customer-service/public/bootstrap': {
    get: {
      summary: '初始化正式客户咨询端',
      tags: customerServiceTags,
      requestParams: { query: CustomerServicePublicBootstrapQuerySchema },
      responses: successResponse(CustomerServicePublicBootstrapResponseSchema)
    }
  },
  '/customer-service/public/chat': {
    post: {
      summary: '正式客户咨询端聊天',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServicePublicChatBodySchema } }
      },
      responses: {
        200: {
          description:
            '客服回答；stream=true 时使用 SSE 返回 answer、answerStop、customerService 和 done 事件',
          content: {
            'application/json': { schema: CustomerServicePublicChatResponseSchema },
            'text/event-stream': { examples: {} }
          }
        }
      }
    }
  },
  '/customer-service/public/stop': {
    post: {
      summary: '停止正式客户咨询端回答',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServicePublicStopBodySchema } }
      },
      responses: successResponse(CustomerServiceStopResponseSchema)
    }
  },
  '/customer-service/public/feedback': {
    post: {
      summary: '正式客户咨询端反馈',
      tags: customerServiceTags,
      requestBody: {
        content: { 'application/json': { schema: CustomerServicePublicFeedbackBodySchema } }
      },
      responses: successResponse(CustomerServiceFeedbackResponseSchema)
    }
  }
};
