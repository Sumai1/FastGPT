import { cloneDeep } from 'lodash-es';
import {
  CustomerServiceWorkflowNodeId,
  customerServiceStandardAppTemplate
} from '@fastgpt/global/core/customerService/workflowTemplate';
import { NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { SelectedDatasetSchema } from '@fastgpt/global/core/workflow/type/io';
import type { StoreNodeItemType } from '@fastgpt/global/core/workflow/type/node';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { getAppLatestVersion } from '@fastgpt/service/core/app/version/controller';
import { publishAppVersionSnapshot } from '@fastgpt/service/core/app/version/publish';
import { MongoDataset } from '@fastgpt/service/core/dataset/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import { listProductModelsByIds } from '@fastgpt/service/core/customerService/product/entity';
import { beforeUpdateAppFormat } from '@fastgpt/service/core/app/controller';
import { extractAppResourceRefsFromNodes } from '@fastgpt/service/core/app/resourceRefs';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { UserError } from '@fastgpt/global/common/error/utils';
import {
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { MongoCustomerServiceKnowledge } from '@fastgpt/service/core/customerService/knowledge/schema';
import { MongoCustomerServiceKeyBinding } from '@fastgpt/service/core/customerService/project/schema';
import { findAIModel } from '@fastgpt/service/core/ai/model';
import { updateCustomerServiceProjectWorkflowSyncState } from '@fastgpt/service/core/customerService/project/entity';

type ManagedDataset = {
  id: string;
  name: string;
  avatar: string;
  vectorModel: string;
};

/**
 * 将控制台选择的产品知识库和可用模型写入标准客服模板副本。
 * 不修改全局模板；缺少关键检索输入时显式失败，防止创建一个无法回答知识问题的客服。
 */
export const buildManagedCustomerServiceWorkflow = ({
  datasets,
  llmModel
}: {
  datasets: ManagedDataset[];
  llmModel: string;
}) => {
  const workflow = cloneDeep(customerServiceStandardAppTemplate.workflow);
  const datasetInput = workflow.nodes
    .find((node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch)
    ?.inputs.find((input) => input.key === NodeInputKeyEnum.datasetSelectList);
  if (!datasetInput) {
    throw new Error('智能客服标准模板缺少知识库检索配置');
  }

  datasetInput.value = datasets.map((dataset) =>
    SelectedDatasetSchema.parse({
      datasetId: dataset.id,
      name: dataset.name,
      avatar: dataset.avatar,
      vectorModel: { model: dataset.vectorModel }
    })
  );
  workflow.nodes.forEach((node) => {
    node.inputs.forEach((input) => {
      if (
        input.key === NodeInputKeyEnum.aiModel ||
        input.key === NodeInputKeyEnum.datasetSearchExtensionModel
      ) {
        input.value = llmModel;
      }
    });
  });
  if (workflow.chatConfig?.questionGuide) {
    workflow.chatConfig.questionGuide.model = llmModel;
  }

  return workflow;
};

type CustomerServiceWorkflowReadiness = {
  status: 'ready' | 'outdated' | 'error';
  expectedDatasetCount: number;
  workflowDatasetCount: number;
  message: string;
  checkedAt: Date;
};

const getWorkflowDatasetIds = (nodes: StoreNodeItemType[]) => {
  const value = nodes
    .find((node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch)
    ?.inputs.find((input) => input.key === NodeInputKeyEnum.datasetSelectList)?.value;
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) =>
          item && typeof item === 'object' && 'datasetId' in item
            ? String(item.datasetId)
            : undefined
        )
        .filter((item): item is string => Boolean(item))
    )
  ).sort();
};

/**
 * 读取项目当前应使用的知识库和工作流实际绑定，供控制台展示“可用/待同步”。
 * 只比较客服标准检索节点；高级工作流缺少该节点时显式报错，不猜测其他节点语义。
 */
export const getManagedCustomerServiceWorkflowReadiness = async ({
  teamId,
  projectId
}: {
  teamId: string;
  projectId: string;
}): Promise<CustomerServiceWorkflowReadiness> => {
  const project = await MongoCustomerServiceProject.findOne({ _id: projectId, teamId }).lean();
  if (!project) throw new UserError('Customer service project not found');

  const [app, models] = await Promise.all([
    MongoApp.findOne({ _id: project.appId, teamId, deleteTime: null }).lean(),
    listProductModelsByIds({ teamId, ids: project.modelIds.map(String) })
  ]);
  const expectedDatasetIds = Array.from(
    new Set(models.flatMap((model) => model.datasetIds.map(String)))
  ).sort();
  const workflowDatasetIds = app
    ? getWorkflowDatasetIds((await getAppLatestVersion(String(app._id), app)).nodes)
    : [];
  const checkedAt = new Date();

  if (!app) {
    return {
      status: 'error',
      expectedDatasetCount: expectedDatasetIds.length,
      workflowDatasetCount: 0,
      message: '客服工作流不存在或已删除',
      checkedAt
    };
  }
  if (workflowDatasetIds.length === 0 && expectedDatasetIds.length > 0) {
    return {
      status: 'error',
      expectedDatasetCount: expectedDatasetIds.length,
      workflowDatasetCount: 0,
      message: '客服工作流缺少标准知识检索节点',
      checkedAt
    };
  }

  const ready =
    expectedDatasetIds.length === workflowDatasetIds.length &&
    expectedDatasetIds.every((id, index) => id === workflowDatasetIds[index]);
  return {
    status: ready ? 'ready' : 'outdated',
    expectedDatasetCount: expectedDatasetIds.length,
    workflowDatasetCount: workflowDatasetIds.length,
    message: ready ? '产品知识库与客服工作流一致' : '产品知识库已变化，请同步客服工作流',
    checkedAt
  };
};

type CustomerServiceDeliveryReadiness = {
  ready: boolean;
  checks: {
    projectActive: boolean;
    appExists: boolean;
    standardWorkflow: boolean;
    datasetScope: boolean;
    aiModel: boolean;
    publishedKnowledge: boolean;
    keyBinding: boolean;
  };
  messages: string[];
  checkedAt: Date;
};

/**
 * 汇总一个客服能否正式交付使用的必要条件。检查只读取 FastGPT 现有资源，
 * 不复制 App、模型、知识或 Key 的状态；失败项返回业务化提示供控制台处理。
 */
export const getManagedCustomerServiceDeliveryReadiness = async ({
  teamId,
  projectId,
  workflowReadiness
}: {
  teamId: string;
  projectId: string;
  workflowReadiness?: CustomerServiceWorkflowReadiness;
}): Promise<CustomerServiceDeliveryReadiness> => {
  const project = await MongoCustomerServiceProject.findOne({ _id: projectId, teamId }).lean();
  if (!project) throw new UserError('Customer service project not found');
  const [app, models, binding, scopeReadiness] = await Promise.all([
    MongoApp.findOne({ _id: project.appId, teamId, deleteTime: null }).lean(),
    listProductModelsByIds({ teamId, ids: project.modelIds.map(String) }),
    MongoCustomerServiceKeyBinding.findOne({
      teamId,
      projectId,
      status: CustomerServiceResourceStatusEnum.active
    })
      .select('_id')
      .lean(),
    workflowReadiness ?? getManagedCustomerServiceWorkflowReadiness({ teamId, projectId })
  ]);
  const latestVersion = app ? await getAppLatestVersion(String(app._id), app) : undefined;
  const nodes = latestVersion?.nodes ?? [];
  const nodeIds = new Set(nodes.map((node) => node.nodeId));
  const standardWorkflow = Object.values(CustomerServiceWorkflowNodeId).every((nodeId) =>
    nodeIds.has(nodeId)
  );
  const aiModelValues = nodes.flatMap((node) =>
    node.inputs.flatMap((input) =>
      input.key === NodeInputKeyEnum.aiModel && typeof input.value === 'string' ? [input.value] : []
    )
  );
  const aiModel =
    aiModelValues.length > 0 && aiModelValues.every((model) => Boolean(findAIModel(model)));
  const datasetIds = Array.from(new Set(models.flatMap((model) => model.datasetIds.map(String))));
  const publishedKnowledge =
    datasetIds.length > 0 &&
    (await MongoCustomerServiceKnowledge.exists({
      teamId,
      datasetId: { $in: datasetIds },
      status: CustomerServiceKnowledgeStatusEnum.published,
      $or: [{ modelIds: { $size: 0 } }, { modelIds: { $in: project.modelIds } }]
    })) !== null;
  const checks = {
    projectActive: project.status === CustomerServiceProjectStatusEnum.active,
    appExists: Boolean(app),
    standardWorkflow,
    datasetScope: scopeReadiness.status === 'ready',
    aiModel,
    publishedKnowledge,
    keyBinding: Boolean(binding)
  };
  const labels: Array<[keyof typeof checks, string]> = [
    ['projectActive', '客服项目未启用'],
    ['appExists', '客服 App 不存在'],
    ['standardWorkflow', '标准客服工作流不完整'],
    ['datasetScope', '产品知识范围尚未同步'],
    ['aiModel', '工作流 AI 模型不可用'],
    ['publishedKnowledge', '没有可供客服检索的已发布知识'],
    ['keyBinding', '专用客服 Key 未启用']
  ];

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
    messages: labels.filter(([key]) => !checks[key]).map(([, label]) => label),
    checkedAt: new Date()
  };
};

/**
 * 将项目产品型号当前绑定的知识库写入客服标准检索节点，同时创建新的发布版本。
 * 所有写入位于同一 MongoDB 事务，失败时保留原发布版本和原工作流配置。
 */
const syncManagedCustomerServiceWorkflowDatasetsInternal = async ({
  teamId,
  tmbId,
  projectId
}: {
  teamId: string;
  tmbId: string;
  projectId: string;
}): Promise<CustomerServiceWorkflowReadiness> => {
  const project = await MongoCustomerServiceProject.findOne({ _id: projectId, teamId }).lean();
  if (!project) throw new UserError('Customer service project not found');

  const [app, models] = await Promise.all([
    MongoApp.findOne({ _id: project.appId, teamId, deleteTime: null }).lean(),
    listProductModelsByIds({ teamId, ids: project.modelIds.map(String) })
  ]);
  if (!app) throw new UserError('客服工作流不存在或已删除');
  const latestVersion = await getAppLatestVersion(String(app._id), app);

  const datasetIds = Array.from(new Set(models.flatMap((item) => item.datasetIds.map(String))));
  if (datasetIds.length === 0 || models.some((item) => item.datasetIds.length === 0)) {
    throw new UserError('请先为客服中的每个产品型号绑定知识库');
  }

  const datasets = await MongoDataset.find({
    _id: { $in: datasetIds },
    teamId,
    deleteTime: null
  })
    .select('_id name avatar vectorModel')
    .lean();
  if (datasets.length !== datasetIds.length) {
    throw new UserError('产品绑定的知识库不存在或已删除');
  }
  if (new Set(datasets.map((item) => item.vectorModel)).size > 1) {
    throw new UserError('产品知识库向量模型不一致，无法写入同一个客服检索节点');
  }

  const nodes = cloneDeep(latestVersion.nodes);
  const datasetInput = nodes
    .find((node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch)
    ?.inputs.find((input) => input.key === NodeInputKeyEnum.datasetSelectList);
  if (!datasetInput) throw new UserError('客服工作流缺少标准知识检索节点');
  datasetInput.value = datasets.map((dataset) =>
    SelectedDatasetSchema.parse({
      datasetId: String(dataset._id),
      name: dataset.name,
      avatar: dataset.avatar,
      vectorModel: { model: dataset.vectorModel }
    })
  );
  await beforeUpdateAppFormat({ nodes });
  const resourceRefs = extractAppResourceRefsFromNodes(nodes);

  await mongoSessionRun(async (session) => {
    const { result } = await publishAppVersionSnapshot({
      app,
      tmbId,
      nodes,
      edges: latestVersion.edges,
      chatConfig: latestVersion.chatConfig,
      resourceRefs,
      isPublish: true,
      versionName: `客服知识同步 ${new Date().toISOString()}`,
      expectedAppUpdateTime: app.updateTime,
      session
    });
    if (result.matchedCount !== 1) throw new UserError('客服工作流状态已变化，请重试');
  });

  return getManagedCustomerServiceWorkflowReadiness({ teamId, projectId });
};

/**
 * 同步客服工作流知识范围并持久化最近一次状态。
 * 失败只记录原因和时间，不触碰原发布版本，控制台可据此展示并安全重试。
 */
export const syncManagedCustomerServiceWorkflowDatasets = async (input: {
  teamId: string;
  tmbId: string;
  projectId: string;
}): Promise<CustomerServiceWorkflowReadiness> => {
  const { teamId, projectId } = input;
  const syncingState = await updateCustomerServiceProjectWorkflowSyncState({
    teamId,
    projectId,
    status: CustomerServiceWorkflowSyncStatusEnum.syncing
  });
  if (!syncingState?.workflowSyncLastAttemptTime) {
    throw new UserError('Customer service project not found');
  }
  const expectedLastAttemptTime = syncingState.workflowSyncLastAttemptTime;
  try {
    const result = await syncManagedCustomerServiceWorkflowDatasetsInternal(input);
    await updateCustomerServiceProjectWorkflowSyncState({
      teamId,
      projectId,
      status: CustomerServiceWorkflowSyncStatusEnum.succeeded,
      expectedLastAttemptTime
    });
    return result;
  } catch (error) {
    await updateCustomerServiceProjectWorkflowSyncState({
      teamId,
      projectId,
      status: CustomerServiceWorkflowSyncStatusEnum.failed,
      failureReason: error instanceof Error ? error.message : String(error),
      expectedLastAttemptTime
    }).catch(() => undefined);
    throw error;
  }
};
