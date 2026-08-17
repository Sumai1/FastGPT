import type { ApiRequestProps } from '@fastgpt/next/type';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceAdmin,
  authCustomerServiceDatasets
} from '@/service/customerService/adminAuth';
import { onCreateApp } from '@/pages/api/core/app/create';
import {
  CustomerServiceAdminManagedProjectCreateBodySchema,
  CustomerServiceAdminManagedProjectCreateResponseSchema,
  type CustomerServiceAdminManagedProjectCreateBody,
  type CustomerServiceAdminManagedProjectCreateResponse
} from '@fastgpt/global/openapi/customerService/api';
import {
  customerServiceStandardAppTemplate,
  CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID
} from '@fastgpt/global/core/customerService/workflowTemplate';
import { CustomerServiceAudienceEnum } from '@fastgpt/global/core/customerService/constants';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { ModelTypeEnum } from '@fastgpt/global/core/ai/constants';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { checkTeamAppTypeLimit } from '@fastgpt/service/support/permission/teamLimit';
import {
  TeamApikeyCreatePermissionVal,
  TeamAppCreatePermissionVal
} from '@fastgpt/global/support/permission/user/constant';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { getMyModels } from '@fastgpt/service/support/permission/model/controller';
import { listProductModelsByIds } from '@fastgpt/service/core/customerService/product/entity';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { UserError } from '@fastgpt/global/common/error/utils';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { createCustomerServiceProjectWithApp } from '@fastgpt/service/core/customerService/project/service';
import { bindCustomerServiceOpenApiKey } from '@fastgpt/service/core/customerService/project/service';
import { MongoOpenApi } from '@fastgpt/service/support/openapi/schema';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { appEnv } from '@/env';
import { buildManagedCustomerServiceWorkflow } from '@/service/customerService/managedProject';
import { addAuditLog } from '@fastgpt/service/support/user/audit/util';
import { AuditEventEnum } from '@fastgpt/global/support/user/audit/constants';

/**
 * 使用标准模板托管创建可立即测试的智能客服。
 * App、项目、专用 Key 和绑定在同一事务内写入，任何一步失败都不会留下半成品资源。
 */
async function handler(
  req: ApiRequestProps<CustomerServiceAdminManagedProjectCreateBody>
): Promise<CustomerServiceAdminManagedProjectCreateResponse> {
  const { body } = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminManagedProjectCreateBodySchema
  });
  const { teamId, tmbId, isRoot, permission, tmb } = await authCustomerServiceAdmin(req);

  if (
    !permission.checkPer(TeamAppCreatePermissionVal) ||
    !permission.checkPer(TeamApikeyCreatePermissionVal)
  ) {
    throw TeamErrEnum.unAuthTeam;
  }

  await checkTeamAppTypeLimit({ teamId, appCheckType: 'app' });
  const keyCount = await MongoOpenApi.countDocuments({ tmbId });
  if (keyCount >= appEnv.OPENAPI_KEY_MAX_COUNT) {
    throw new UserError('OpenAPI key count exceeds the limit');
  }

  const uniqueModelIds = Array.from(new Set(body.modelIds));
  const models = await listProductModelsByIds({ teamId, ids: uniqueModelIds });
  if (models.length !== uniqueModelIds.length) {
    throw new UserError('Customer service product model not found');
  }

  const datasetIds = Array.from(new Set(models.flatMap((item) => item.datasetIds.map(String))));
  if (datasetIds.length === 0 || models.some((item) => item.datasetIds.length === 0)) {
    throw new UserError('请先为所选产品型号绑定知识库');
  }
  await authCustomerServiceDatasets({
    tmbId,
    isRoot,
    datasetIds,
    mode: 'manage'
  });

  const datasets = await MongoDataset.find({
    _id: { $in: datasetIds },
    teamId,
    deleteTime: null
  })
    .select('_id name avatar vectorModel')
    .lean();
  if (datasets.length !== datasetIds.length) {
    throw new UserError('所选产品绑定的知识库不存在或已删除');
  }
  if (new Set(datasets.map((item) => item.vectorModel)).size > 1) {
    throw new UserError('所选产品的知识库向量模型不一致，请先统一后再创建客服');
  }

  const allowedModels = new Set(
    await getMyModels({
      teamId,
      tmbId,
      isTeamOwner: isRoot || tmb.role === 'owner'
    })
  );
  const defaultModel = global.systemDefaultModel?.llm;
  const llmModel =
    defaultModel && allowedModels.has(defaultModel.model)
      ? defaultModel.model
      : global.systemModelList.find(
          (item) => item.type === ModelTypeEnum.llm && allowedModels.has(item.model)
        )?.model;
  if (!llmModel) {
    throw new UserError('当前账号没有可用于客服工作流的对话模型');
  }

  const workflow = buildManagedCustomerServiceWorkflow({
    datasets: datasets.map((dataset) => ({
      id: String(dataset._id),
      name: dataset.name,
      avatar: dataset.avatar,
      vectorModel: dataset.vectorModel
    })),
    llmModel
  });

  const { appId, projectId } = await mongoSessionRun(async (session) => {
    const appId = await onCreateApp({
      name: body.name,
      intro: customerServiceStandardAppTemplate.intro,
      avatar: customerServiceStandardAppTemplate.avatar,
      type: AppTypeEnum.workflow,
      modules: workflow.nodes,
      edges: workflow.edges,
      chatConfig: workflow.chatConfig,
      teamId,
      tmbId,
      templateId: CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
      isRoot,
      session
    });
    const projectCode = `CS_${Date.now().toString(36)}_${getNanoid(6)}`.toUpperCase();
    const project = await createCustomerServiceProjectWithApp({
      teamId,
      tmbId,
      appId,
      projectCode,
      name: body.name,
      modelIds: uniqueModelIds,
      defaultAudience: body.defaultAudience,
      welcomeText: body.welcomeText,
      recommendedQuestions: body.recommendedQuestions,
      humanContact: body.humanContact,
      ruleConfig: {
        lowConfidenceThreshold: 0.35,
        lowConfidenceMaxCount: 2,
        maxAnswerTokens: 1200,
        dangerousKeywords: [],
        disputeKeywords: [],
        complaintKeywords: [],
        humanRequestKeywords: []
      },
      sessionRetentionDays: body.sessionRetentionDays ?? undefined,
      session
    });
    const apiKey = `${global.systemEnv?.openapiPrefix || 'fastgpt'}-${getNanoid(64)}`;
    const [openApiKey] = await MongoOpenApi.create(
      [
        {
          teamId,
          tmbId,
          apiKey,
          authProxy: false,
          name: `${body.name}客服专用`.slice(0, 50),
          tagIds: [],
          limit: { maxUsagePoints: -1 }
        }
      ],
      { session, ordered: true }
    );
    await bindCustomerServiceOpenApiKey({
      teamId,
      tmbId,
      projectId: String(project._id),
      openApiKeyId: String(openApiKey._id),
      maxAudience: body.defaultAudience ?? CustomerServiceAudienceEnum.public,
      rateLimit: { seconds: 60, limit: 60 },
      session
    });

    return { appId, projectId: String(project._id) };
  });

  void addAuditLog({
    teamId,
    tmbId,
    event: AuditEventEnum.CREATE_API_KEY,
    params: { keyName: `${body.name}客服专用`.slice(0, 50) }
  });

  return CustomerServiceAdminManagedProjectCreateResponseSchema.parse({ appId, projectId });
}

export default NextAPI(handler);
