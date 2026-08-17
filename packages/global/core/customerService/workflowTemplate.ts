import { cloneDeep } from 'lodash-es';
import { AppTemplateTypeEnum, AppTypeEnum } from '../app/constants';
import type { AppTemplateSchemaType } from '../app/type';
import { DatasetSearchModeEnum } from '../dataset/constants';
import { NodeInputKeyEnum, NodeOutputKeyEnum } from '../workflow/constants';
import type { FlowNodeTemplateType, StoreNodeItemType } from '../workflow/type/node';
import type { StoreEdgeItemType } from '../workflow/type/edge';
import { getHandleId } from '../workflow/utils';
import { AiChatModule } from '../workflow/template/system/aiChat';
import { AssignedAnswerModule } from '../workflow/template/system/assignedAnswer';
import { ClassifyQuestionModule } from '../workflow/template/system/classifyQuestion';
import { DatasetSearchModule } from '../workflow/template/system/datasetSearch';
import { IfElseNode } from '../workflow/template/system/ifElse';
import {
  IfElseResultEnum,
  VariableConditionEnum
} from '../workflow/template/system/ifElse/constant';
import { SystemConfigNode } from '../workflow/template/system/systemConfig';
import { userFilesInput, WorkflowStart } from '../workflow/template/system/workflowStart';

export const CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID = 'commercial-customer-service-standard-v1';

export const CustomerServiceWorkflowNodeId = {
  systemConfig: 'customer-service-system-config',
  workflowStart: 'customer-service-workflow-start',
  classify: 'customer-service-classify',
  datasetSearch: 'customer-service-dataset-search',
  hasReference: 'customer-service-has-reference',
  aiAnswer: 'customer-service-ai-answer',
  greeting: 'customer-service-greeting',
  humanSafety: 'customer-service-human-safety',
  outOfScope: 'customer-service-out-of-scope',
  noData: 'customer-service-no-data'
} as const;

export const CustomerServiceIntentKey = {
  productConsultation: 'product-consultation',
  usageConfiguration: 'usage-configuration',
  troubleshooting: 'troubleshooting',
  afterSales: 'after-sales',
  greeting: 'greeting',
  humanSafety: 'human-safety',
  outOfScope: 'out-of-scope'
} as const;

const HAS_REFERENCE_BRANCH_ID = 'has-reliable-reference';
const DEFAULT_LLM_MODEL = 'gpt-5';
const DEFAULT_DATASET_MAX_TOKEN = 1600;
const DEFAULT_ANSWER_MAX_TOKEN = 1200;

const CUSTOMER_SERVICE_CLASSIFY_PROMPT = `你负责识别企业产品智能客服问题的意图。
仅根据用户当前问题和必要的会话上下文分类：
1. 危险操作、人身或设备安全风险、支付退款争议、保修责任争议、投诉以及明确要求人工，优先归入“人工与安全处理”。
2. 其他产品问题分别归入产品咨询、使用与配置、故障排查或售后政策。
3. 只要问题提到产品、设备、机器、型号、参数、选型、安装、使用、故障或售后，就必须归入对应产品类别。不要因为不认识产品名称、未提供品牌或资料可能不足，就判定为非业务问题；资料是否存在由后续知识库检索判断。
4. 单纯问候归入“问候”；只有天气、娱乐、生活闲聊等明确与企业产品和服务无关的问题，才归入“非业务问题”。
无法确定时选择“产品咨询”，让知识库检索判断是否有可用资料。
只选择一个最匹配的类别，不要回答问题。`;

const CUSTOMER_SERVICE_ANSWER_PROMPT = `你是企业产品智能客服，只能根据系统提供的知识库引用回答。

回答规则：
1. 先识别用户所问的产品、型号、软硬件版本和故障现象；信息不足时先追问，不要猜测。
2. 只使用引用中明确存在的事实、参数、步骤和政策，不得用常识补写产品结论。
3. 多条资料冲突时，优先采用与当前产品、型号和版本最匹配的资料，并说明适用范围。
4. 涉及危险操作、人身或设备安全风险、支付退款争议、保修责任争议、投诉或用户要求人工时，停止给出可能造成损失的操作步骤，建议转人工处理。
5. 若引用不足以可靠回答，明确回复“暂时没有找到足够可靠的资料”，并请用户补充设备型号、错误码、故障现象或现场图片。
6. 使用简洁中文分步骤回答；结论后标明所依据的资料名称，禁止伪造来源。
7. 普通回答控制在约 600 Token 内，先给直接结论、必要参数和可执行步骤。
8. 用户已明确产品、系列或型号时，只回答该对象在资料对应标题或段落中的内容；不得把相邻章节、其他系列或相似产品的数据混入答案。
9. 回答价格、配置和参数时，严格保留资料中的名称与数值对应关系，不得自行改名、合并或推断；无法确认对应关系时明确说明，不要拼接答案。
10. 用户要求大量型号、价格或长步骤时，每次最多输出 5 个完整条目；空间不足时不要开始下一个条目，在末尾提示“回复继续查看剩余内容”。用户回复“继续”后从未输出的下一条接着回答，不要重复上一页。`;

type CreateStoreNodeProps = {
  template: FlowNodeTemplateType;
  nodeId: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  inputValues?: Record<string, unknown>;
  outputs?: StoreNodeItemType['outputs'];
};

/**
 * 从原生节点模板生成可持久化节点，只覆盖业务配置，避免复制运行时和编辑器状态。
 */
const createStoreNode = ({
  template,
  nodeId,
  name,
  position,
  inputValues = {},
  outputs
}: CreateStoreNodeProps): StoreNodeItemType => ({
  nodeId,
  flowNodeType: template.flowNodeType,
  avatar: template.avatar,
  avatarLinear: template.avatarLinear,
  colorSchema: template.colorSchema,
  name,
  intro: template.intro,
  showStatus: template.showStatus,
  version: template.version,
  catchError: template.catchError,
  inputs: cloneDeep(template.inputs).map((input) =>
    Object.prototype.hasOwnProperty.call(inputValues, input.key)
      ? {
          ...input,
          value: inputValues[input.key]
        }
      : input
  ),
  outputs: outputs ?? cloneDeep(template.outputs),
  position
});

const createEdge = ({
  source,
  sourceKey,
  target
}: {
  source: string;
  sourceKey: string;
  target: string;
}): StoreEdgeItemType => ({
  source,
  sourceHandle: getHandleId(source, 'source', sourceKey),
  target,
  targetHandle: getHandleId(target, 'target', 'left')
});

const nodes: StoreNodeItemType[] = [
  createStoreNode({
    template: SystemConfigNode,
    nodeId: CustomerServiceWorkflowNodeId.systemConfig,
    name: '客服设置',
    position: { x: -650, y: -420 }
  }),
  createStoreNode({
    template: WorkflowStart,
    nodeId: CustomerServiceWorkflowNodeId.workflowStart,
    name: '用户提问',
    position: { x: -650, y: 0 },
    outputs: [...cloneDeep(WorkflowStart.outputs), cloneDeep(userFilesInput)]
  }),
  createStoreNode({
    template: ClassifyQuestionModule,
    nodeId: CustomerServiceWorkflowNodeId.classify,
    name: '客服问题分类',
    position: { x: -250, y: 0 },
    inputValues: {
      [NodeInputKeyEnum.aiModel]: DEFAULT_LLM_MODEL,
      [NodeInputKeyEnum.aiSystemPrompt]: CUSTOMER_SERVICE_CLASSIFY_PROMPT,
      [NodeInputKeyEnum.history]: 4,
      [NodeInputKeyEnum.userChatInput]: [
        CustomerServiceWorkflowNodeId.workflowStart,
        NodeOutputKeyEnum.userChatInput
      ],
      [NodeInputKeyEnum.agents]: [
        {
          key: CustomerServiceIntentKey.usageConfiguration,
          value: '使用与配置：安装、操作、配置、升级和日常使用'
        },
        {
          key: CustomerServiceIntentKey.troubleshooting,
          value: '故障排查：异常现象、错误码、无法启动、性能或连接问题'
        },
        {
          key: CustomerServiceIntentKey.afterSales,
          value: '售后政策：维修、保修、退换、服务网点和耗材'
        },
        {
          key: CustomerServiceIntentKey.greeting,
          value: '问候：打招呼、感谢、结束对话等不需要检索的问题'
        },
        {
          key: CustomerServiceIntentKey.humanSafety,
          value: '人工与安全处理：危险操作、事故风险、投诉争议或明确要求人工'
        },
        {
          key: CustomerServiceIntentKey.outOfScope,
          value: '非业务问题：天气、娱乐、生活闲聊等明确与企业产品、使用和售后服务无关的问题'
        },
        {
          // 问题分类节点在模型返回无法识别的标记时会默认选择最后一项。
          // 默认进入检索比直接拒答更安全，无资料仍会由后续节点追问。
          key: CustomerServiceIntentKey.productConsultation,
          value:
            '产品咨询：任何产品或设备的能力、参数、选型、兼容性、企业信息和购买前咨询；不确定时也选此项'
        }
      ]
    }
  }),
  createStoreNode({
    template: DatasetSearchModule,
    nodeId: CustomerServiceWorkflowNodeId.datasetSearch,
    name: '检索客服知识库',
    position: { x: 250, y: -80 },
    inputValues: {
      [NodeInputKeyEnum.datasetSelectList]: [],
      [NodeInputKeyEnum.datasetSimilarity]: 0.45,
      [NodeInputKeyEnum.datasetMaxTokens]: DEFAULT_DATASET_MAX_TOKEN,
      [NodeInputKeyEnum.datasetSearchMode]: DatasetSearchModeEnum.mixedRecall,
      [NodeInputKeyEnum.datasetSearchEmbeddingWeight]: 0.5,
      [NodeInputKeyEnum.datasetSearchUsingReRank]: false,
      [NodeInputKeyEnum.datasetSearchRerankWeight]: 0.65,
      [NodeInputKeyEnum.datasetSearchUsingExtensionQuery]: true,
      [NodeInputKeyEnum.datasetSearchExtensionModel]: DEFAULT_LLM_MODEL,
      [NodeInputKeyEnum.datasetSearchExtensionBg]:
        '企业产品客服场景。改写时保留产品名、型号、软硬件版本、错误码和故障现象，并补充可能的同义表述。',
      [NodeInputKeyEnum.datasetSearchInput]: [
        [CustomerServiceWorkflowNodeId.workflowStart, NodeOutputKeyEnum.userChatInput]
      ]
    }
  }),
  createStoreNode({
    template: IfElseNode,
    nodeId: CustomerServiceWorkflowNodeId.hasReference,
    name: '是否检索到资料',
    position: { x: 700, y: -80 },
    inputValues: {
      [NodeInputKeyEnum.ifElseList]: [
        {
          branchId: HAS_REFERENCE_BRANCH_ID,
          condition: 'AND',
          list: [
            {
              variable: [
                CustomerServiceWorkflowNodeId.datasetSearch,
                NodeOutputKeyEnum.datasetQuoteQA
              ],
              condition: VariableConditionEnum.isNotEmpty,
              value: '',
              valueType: 'input'
            }
          ]
        }
      ]
    }
  }),
  createStoreNode({
    template: AiChatModule,
    nodeId: CustomerServiceWorkflowNodeId.aiAnswer,
    name: '生成可信客服回答',
    position: { x: 1150, y: -220 },
    inputValues: {
      [NodeInputKeyEnum.aiModel]: DEFAULT_LLM_MODEL,
      [NodeInputKeyEnum.aiChatTemperature]: 1,
      [NodeInputKeyEnum.aiChatMaxToken]: DEFAULT_ANSWER_MAX_TOKEN,
      [NodeInputKeyEnum.aiChatIsResponseText]: true,
      [NodeInputKeyEnum.aiChatQuoteRole]: 'system',
      [NodeInputKeyEnum.aiChatVision]: true,
      [NodeInputKeyEnum.aiChatExtractFiles]: true,
      [NodeInputKeyEnum.aiChatReasoning]: false,
      [NodeInputKeyEnum.aiSystemPrompt]: CUSTOMER_SERVICE_ANSWER_PROMPT,
      [NodeInputKeyEnum.history]: 6,
      [NodeInputKeyEnum.aiChatDatasetQuote]: [
        CustomerServiceWorkflowNodeId.datasetSearch,
        NodeOutputKeyEnum.datasetQuoteQA
      ],
      [NodeInputKeyEnum.fileUrlList]: [
        [CustomerServiceWorkflowNodeId.workflowStart, NodeOutputKeyEnum.userFiles]
      ],
      [NodeInputKeyEnum.userChatInput]: [
        CustomerServiceWorkflowNodeId.workflowStart,
        NodeOutputKeyEnum.userChatInput
      ]
    }
  }),
  createStoreNode({
    template: AssignedAnswerModule,
    nodeId: CustomerServiceWorkflowNodeId.greeting,
    name: '客服问候',
    position: { x: 250, y: 380 },
    inputValues: {
      [NodeInputKeyEnum.answerText]:
        '您好，我是企业产品智能客服。请告诉我产品名称、设备型号、版本以及您想咨询的问题。'
    }
  }),
  createStoreNode({
    template: AssignedAnswerModule,
    nodeId: CustomerServiceWorkflowNodeId.humanSafety,
    name: '转人工与安全提示',
    position: { x: 700, y: 380 },
    inputValues: {
      [NodeInputKeyEnum.answerText]:
        '这个问题可能涉及安全风险、责任争议或需要人工核实，我先不提供可能造成损失的操作建议。请联系人工客服，并保留设备型号、错误码、现场照片及相关凭证。'
    }
  }),
  createStoreNode({
    template: AssignedAnswerModule,
    nodeId: CustomerServiceWorkflowNodeId.outOfScope,
    name: '非业务问题回复',
    position: { x: 1150, y: 380 },
    inputValues: {
      [NodeInputKeyEnum.answerText]:
        '我主要解答本企业产品的选型、使用、故障和售后问题。请提供产品名称或设备型号，我再继续帮助您。'
    }
  }),
  createStoreNode({
    template: AssignedAnswerModule,
    nodeId: CustomerServiceWorkflowNodeId.noData,
    name: '资料不足兜底',
    position: { x: 1150, y: 80 },
    inputValues: {
      [NodeInputKeyEnum.answerText]:
        '暂时没有找到足够可靠的资料。请补充设备型号、错误码、故障现象或现场图片。'
    }
  })
];

const knowledgeIntentKeys = [
  CustomerServiceIntentKey.productConsultation,
  CustomerServiceIntentKey.usageConfiguration,
  CustomerServiceIntentKey.troubleshooting,
  CustomerServiceIntentKey.afterSales
];

const edges: StoreEdgeItemType[] = [
  createEdge({
    source: CustomerServiceWorkflowNodeId.workflowStart,
    sourceKey: 'right',
    target: CustomerServiceWorkflowNodeId.classify
  }),
  ...knowledgeIntentKeys.map((sourceKey) =>
    createEdge({
      source: CustomerServiceWorkflowNodeId.classify,
      sourceKey,
      target: CustomerServiceWorkflowNodeId.datasetSearch
    })
  ),
  createEdge({
    source: CustomerServiceWorkflowNodeId.classify,
    sourceKey: CustomerServiceIntentKey.greeting,
    target: CustomerServiceWorkflowNodeId.greeting
  }),
  createEdge({
    source: CustomerServiceWorkflowNodeId.classify,
    sourceKey: CustomerServiceIntentKey.humanSafety,
    target: CustomerServiceWorkflowNodeId.humanSafety
  }),
  createEdge({
    source: CustomerServiceWorkflowNodeId.classify,
    sourceKey: CustomerServiceIntentKey.outOfScope,
    target: CustomerServiceWorkflowNodeId.outOfScope
  }),
  createEdge({
    source: CustomerServiceWorkflowNodeId.datasetSearch,
    sourceKey: 'right',
    target: CustomerServiceWorkflowNodeId.hasReference
  }),
  createEdge({
    source: CustomerServiceWorkflowNodeId.hasReference,
    sourceKey: HAS_REFERENCE_BRANCH_ID,
    target: CustomerServiceWorkflowNodeId.aiAnswer
  }),
  createEdge({
    source: CustomerServiceWorkflowNodeId.hasReference,
    sourceKey: IfElseResultEnum.ELSE,
    target: CustomerServiceWorkflowNodeId.noData
  })
];

/** FastGPT 原生应用市场中的企业产品智能客服标准工作流。 */
export const customerServiceStandardAppTemplate: AppTemplateSchemaType = {
  templateId: CUSTOMER_SERVICE_STANDARD_TEMPLATE_ID,
  name: '企业产品智能客服（标准版）',
  intro: '按咨询、使用、故障、售后、安全等场景分流，基于企业知识库生成可追溯回答。',
  avatar: 'core/app/type/workflowFill',
  tags: [AppTemplateTypeEnum.recommendation],
  type: AppTypeEnum.workflow,
  author: 'FastGPT',
  isActive: true,
  isPromoted: true,
  recommendText: '适合企业产品咨询、故障排查和售后服务',
  isQuickTemplate: true,
  order: -100,
  userGuide: {
    type: 'markdown',
    content:
      '创建后请先在“检索客服知识库”节点选择本企业知识库，并检查分类与回答节点所用模型。正式对外服务应通过智能客服接口调用，以继续执行产品、版本、权限和低置信度规则。'
  },
  workflow: {
    nodes,
    edges,
    chatConfig: {
      welcomeText:
        '您好，我是企业产品智能客服。请告诉我产品名称、设备型号、版本和问题现象。\n[设备报错，怎么排查？]\n[这个产品如何安装配置？]\n[我要联系人工客服]',
      questionGuide: {
        open: false,
        model: DEFAULT_LLM_MODEL,
        customPrompt: ''
      },
      fileSelectConfig: {
        maxFiles: 3,
        canSelectFile: false,
        canSelectImg: true,
        canSelectVideo: false,
        canSelectAudio: false,
        canSelectCustomFileExtension: false,
        customFileExtensionList: []
      },
      instruction:
        '请尽量提供产品名称、设备型号、软硬件版本、错误码和故障现象；涉及危险操作、投诉或责任争议时将建议转人工处理。'
    }
  }
};
