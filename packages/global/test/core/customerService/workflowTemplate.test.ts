import { describe, expect, it } from 'vitest';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import {
  CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
  CustomerServiceIntentKey,
  CustomerServiceWorkflowNodeId,
  customerServiceStandardAppTemplate
} from '@fastgpt/global/core/customerService/workflowTemplate';
import { DatasetSearchModeEnum } from '@fastgpt/global/core/dataset/constants';
import { NodeInputKeyEnum, NodeOutputKeyEnum } from '@fastgpt/global/core/workflow/constants';
import { FlowNodeTypeEnum } from '@fastgpt/global/core/workflow/node/constant';
import { IfElseResultEnum } from '@fastgpt/global/core/workflow/template/system/ifElse/constant';
import { StoreEdgeItemTypeSchema } from '@fastgpt/global/core/workflow/type/edge';
import { StoreNodeItemTypeSchema } from '@fastgpt/global/core/workflow/type/node';
import { getHandleId } from '@fastgpt/global/core/workflow/utils';

const workflow = customerServiceStandardAppTemplate.workflow;

const getNode = (nodeId: string) => {
  const node = workflow.nodes.find((item) => item.nodeId === nodeId);
  expect(node, `node ${nodeId} should exist`).toBeDefined();
  return node!;
};

const getInputValue = (nodeId: string, inputKey: NodeInputKeyEnum) =>
  getNode(nodeId).inputs.find((input) => input.key === inputKey)?.value;

describe('customerServiceStandardAppTemplate', () => {
  it('should be a valid native workflow template with stable node ids and edges', () => {
    expect(customerServiceStandardAppTemplate).toMatchObject({
      templateId: CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
      type: AppTypeEnum.workflow,
      isActive: true
    });
    expect(workflow.nodes).toHaveLength(10);
    expect(workflow.edges).toHaveLength(11);
    expect(new Set(workflow.nodes.map((node) => node.nodeId)).size).toBe(workflow.nodes.length);

    workflow.nodes.forEach((node) => {
      expect(StoreNodeItemTypeSchema.safeParse(node).success).toBe(true);
    });
    workflow.edges.forEach((edge) => {
      expect(StoreEdgeItemTypeSchema.safeParse(edge).success).toBe(true);
      expect(workflow.nodes.some((node) => node.nodeId === edge.source)).toBe(true);
      expect(workflow.nodes.some((node) => node.nodeId === edge.target)).toBe(true);
    });

    expect(getNode(CustomerServiceWorkflowNodeId.workflowStart).flowNodeType).toBe(
      FlowNodeTypeEnum.workflowStart
    );
    expect(getNode(CustomerServiceWorkflowNodeId.classify).flowNodeType).toBe(
      FlowNodeTypeEnum.classifyQuestion
    );
  });

  it('should route seven customer service intents to the expected native branches', () => {
    const agents = getInputValue(
      CustomerServiceWorkflowNodeId.classify,
      NodeInputKeyEnum.agents
    ) as Array<{ key: string; value: string }>;
    const intentKeys = Object.values(CustomerServiceIntentKey);

    expect(agents.map((agent) => agent.key)).toHaveLength(intentKeys.length);
    expect(new Set(agents.map((agent) => agent.key))).toEqual(new Set(intentKeys));

    // FastGPT 在模型返回未知分类时会选最后一项，默认应先检索而不是直接拒答。
    expect(agents.at(-1)?.key).toBe(CustomerServiceIntentKey.productConsultation);
    expect(agents.at(-1)?.value).toContain('不确定时也选此项');

    const classifyPrompt = getInputValue(
      CustomerServiceWorkflowNodeId.classify,
      NodeInputKeyEnum.aiSystemPrompt
    );
    expect(classifyPrompt).toContain('不要因为不认识产品名称');
    expect(classifyPrompt).toContain('无法确定时选择“产品咨询”');

    const knowledgeIntentKeys = [
      CustomerServiceIntentKey.productConsultation,
      CustomerServiceIntentKey.usageConfiguration,
      CustomerServiceIntentKey.troubleshooting,
      CustomerServiceIntentKey.afterSales
    ];
    knowledgeIntentKeys.forEach((intentKey) => {
      expect(workflow.edges).toContainEqual({
        source: CustomerServiceWorkflowNodeId.classify,
        sourceHandle: getHandleId(CustomerServiceWorkflowNodeId.classify, 'source', intentKey),
        target: CustomerServiceWorkflowNodeId.datasetSearch,
        targetHandle: getHandleId(CustomerServiceWorkflowNodeId.datasetSearch, 'target', 'left')
      });
    });

    expect(workflow.edges).toContainEqual(
      expect.objectContaining({
        sourceHandle: getHandleId(
          CustomerServiceWorkflowNodeId.classify,
          'source',
          CustomerServiceIntentKey.humanSafety
        ),
        target: CustomerServiceWorkflowNodeId.humanSafety
      })
    );
  });

  it('should use lightweight mixed recall without rerank for knowledge questions', () => {
    expect(
      getInputValue(CustomerServiceWorkflowNodeId.datasetSearch, NodeInputKeyEnum.datasetSearchMode)
    ).toBe(DatasetSearchModeEnum.mixedRecall);
    expect(
      getInputValue(
        CustomerServiceWorkflowNodeId.datasetSearch,
        NodeInputKeyEnum.datasetSearchUsingReRank
      )
    ).toBe(false);
    expect(
      getInputValue(
        CustomerServiceWorkflowNodeId.datasetSearch,
        NodeInputKeyEnum.datasetSearchUsingExtensionQuery
      )
    ).toBe(true);
    expect(
      getInputValue(CustomerServiceWorkflowNodeId.datasetSearch, NodeInputKeyEnum.datasetMaxTokens)
    ).toBe(1600);
    expect(
      getInputValue(
        CustomerServiceWorkflowNodeId.datasetSearch,
        NodeInputKeyEnum.datasetSearchInput
      )
    ).toEqual([[CustomerServiceWorkflowNodeId.workflowStart, NodeOutputKeyEnum.userChatInput]]);
  });

  it('should answer only when references exist and fall back when search is empty', () => {
    expect(
      getInputValue(CustomerServiceWorkflowNodeId.hasReference, NodeInputKeyEnum.ifElseList)
    ).toEqual([
      {
        branchId: 'has-reliable-reference',
        condition: 'AND',
        list: [
          {
            variable: [
              CustomerServiceWorkflowNodeId.datasetSearch,
              NodeOutputKeyEnum.datasetQuoteQA
            ],
            condition: 'isNotEmpty',
            value: '',
            valueType: 'input'
          }
        ]
      }
    ]);
    expect(workflow.edges).toContainEqual(
      expect.objectContaining({
        sourceHandle: getHandleId(
          CustomerServiceWorkflowNodeId.hasReference,
          'source',
          'has-reliable-reference'
        ),
        target: CustomerServiceWorkflowNodeId.aiAnswer
      })
    );
    expect(workflow.edges).toContainEqual(
      expect.objectContaining({
        sourceHandle: getHandleId(
          CustomerServiceWorkflowNodeId.hasReference,
          'source',
          IfElseResultEnum.ELSE
        ),
        target: CustomerServiceWorkflowNodeId.noData
      })
    );

    expect(
      getInputValue(CustomerServiceWorkflowNodeId.noData, NodeInputKeyEnum.answerText)
    ).toContain('暂时没有找到足够可靠的资料');
    expect(
      getInputValue(CustomerServiceWorkflowNodeId.aiAnswer, NodeInputKeyEnum.aiChatDatasetQuote)
    ).toEqual([CustomerServiceWorkflowNodeId.datasetSearch, NodeOutputKeyEnum.datasetQuoteQA]);
    expect(
      getInputValue(CustomerServiceWorkflowNodeId.aiAnswer, NodeInputKeyEnum.aiChatMaxToken)
    ).toBe(1200);
    const answerPrompt = getInputValue(
      CustomerServiceWorkflowNodeId.aiAnswer,
      NodeInputKeyEnum.aiSystemPrompt
    );
    expect(answerPrompt).toContain('普通回答控制在约 600 Token 内');
    expect(answerPrompt).toContain('不得把相邻章节、其他系列或相似产品的数据混入答案');
    expect(answerPrompt).toContain('严格保留资料中的名称与数值对应关系');
    expect(answerPrompt).toContain('每次最多输出 5 个完整条目');
    expect(answerPrompt).toContain('回复继续查看剩余内容');
  });
});
