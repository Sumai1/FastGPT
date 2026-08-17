import { describe, expect, it } from 'vitest';
import {
  buildManagedCustomerServiceWorkflow,
  getManagedCustomerServiceDeliveryReadiness
} from '@/service/customerService/managedProject';
import {
  CustomerServiceWorkflowNodeId,
  customerServiceStandardAppTemplate
} from '@fastgpt/global/core/customerService/workflowTemplate';
import { NodeInputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { Types } from '@fastgpt/service/common/mongo';
import { MongoApp } from '@fastgpt/service/core/app/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import {
  CustomerServiceProjectStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { formatCustomerServiceProjects } from '@/service/customerService/format';

describe('buildManagedCustomerServiceWorkflow', () => {
  it('writes selected datasets and the available model without mutating the standard template', () => {
    const workflow = buildManagedCustomerServiceWorkflow({
      datasets: [
        {
          id: '68ad85a7463006c963799a08',
          name: '拍照机知识库',
          avatar: '/icon/logo.svg',
          vectorModel: 'text-embedding-3-small'
        }
      ],
      llmModel: 'customer-service-model'
    });
    const datasetNode = workflow.nodes.find(
      (node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch
    );
    const datasetInput = datasetNode?.inputs.find(
      (input) => input.key === NodeInputKeyEnum.datasetSelectList
    );

    expect(datasetInput?.value).toEqual([
      {
        datasetId: '68ad85a7463006c963799a08',
        name: '拍照机知识库',
        avatar: '/icon/logo.svg',
        vectorModel: { model: 'text-embedding-3-small' }
      }
    ]);
    expect(
      workflow.nodes
        .flatMap((node) => node.inputs)
        .filter(
          (input) =>
            input.key === NodeInputKeyEnum.aiModel ||
            input.key === NodeInputKeyEnum.datasetSearchExtensionModel
        )
        .every((input) => input.value === 'customer-service-model')
    ).toBe(true);
    expect(workflow.chatConfig?.questionGuide?.model).toBe('customer-service-model');

    const templateDatasetInput = customerServiceStandardAppTemplate.workflow.nodes
      .find((node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch)
      ?.inputs.find((input) => input.key === NodeInputKeyEnum.datasetSelectList);
    expect(templateDatasetInput?.value).toEqual([]);
  });

  it('keeps distinct selected datasets with their own display metadata', () => {
    const workflow = buildManagedCustomerServiceWorkflow({
      datasets: [
        {
          id: '68ad85a7463006c963799a08',
          name: '公开资料',
          avatar: '/public.svg',
          vectorModel: 'embedding-model'
        },
        {
          id: '68ad85a7463006c963799a09',
          name: '售后资料',
          avatar: '/support.svg',
          vectorModel: 'embedding-model'
        }
      ],
      llmModel: 'llm-model'
    });
    const datasets = workflow.nodes
      .find((node) => node.nodeId === CustomerServiceWorkflowNodeId.datasetSearch)
      ?.inputs.find((input) => input.key === NodeInputKeyEnum.datasetSelectList)?.value;

    expect(datasets).toHaveLength(2);
    expect(datasets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: '公开资料' }),
        expect.objectContaining({ name: '售后资料' })
      ])
    );
  });

  it('does not report a project deliverable when its standard workflow, knowledge and key are missing', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const app = await MongoApp.create({
      teamId,
      tmbId,
      name: '未就绪客服 App',
      modules: [],
      edges: []
    });
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: app._id,
      projectCode: `NOT-READY-${new Types.ObjectId()}`,
      name: '未就绪客服',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: []
    });

    const readiness = await getManagedCustomerServiceDeliveryReadiness({
      teamId: String(teamId),
      projectId: String(project._id)
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toMatchObject({
      projectActive: true,
      appExists: true,
      standardWorkflow: false,
      publishedKnowledge: false,
      keyBinding: false
    });
  });

  it('projects an interrupted workflow sync as a retryable failure', async () => {
    const teamId = new Types.ObjectId();
    const tmbId = new Types.ObjectId();
    const project = await MongoCustomerServiceProject.create({
      teamId,
      tmbId,
      updateTmbId: tmbId,
      appId: new Types.ObjectId(),
      projectCode: `STALE-SYNC-${new Types.ObjectId()}`,
      name: '同步中断客服',
      status: CustomerServiceProjectStatusEnum.active,
      modelIds: [],
      workflowSyncStatus: CustomerServiceWorkflowSyncStatusEnum.syncing,
      workflowSyncLastAttemptTime: new Date(Date.now() - 11 * 60 * 1000)
    });
    const stored = await MongoCustomerServiceProject.findById(project._id).lean();
    expect(stored).toBeTruthy();

    const result = formatCustomerServiceProjects({
      projects: [stored!],
      keyBindings: []
    });

    expect(result.projects[0].workflowSync).toEqual(
      expect.objectContaining({
        status: CustomerServiceWorkflowSyncStatusEnum.failed,
        failureReason: '上次工作流同步已中断，请重新同步'
      })
    );
  });
});
