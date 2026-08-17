import { ChatRoleEnum, ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import { CustomerServiceWorkflowNodeId } from '@fastgpt/global/core/customerService/workflowTemplate';
import { SearchScoreTypeEnum } from '@fastgpt/global/core/dataset/constants';
import type { CustomerServiceCitation } from '@fastgpt/global/openapi/customerService/api';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { getChatItemResponseData } from '@fastgpt/service/core/chat/nodeResponseStorage';
import { buildChatSourceQuery } from '@fastgpt/service/core/chat/source';

type UnknownRecord = Record<string, unknown>;
type ComparableQuoteScore = UnknownRecord & {
  type: SearchScoreTypeEnum.embedding | SearchScoreTypeEnum.reRank;
  value: number;
};

export type CustomerServiceWorkflowFixedBranch =
  | 'greeting'
  | 'humanSafety'
  | 'outOfScope'
  | 'noData';

export type CustomerServiceWorkflowFixedBranchAction =
  | 'answerWithoutCitations'
  | 'humanRequired'
  | 'lowConfidence';

const workflowFixedBranchByNodeId: Record<string, CustomerServiceWorkflowFixedBranch> = {
  [CustomerServiceWorkflowNodeId.greeting]: 'greeting',
  [CustomerServiceWorkflowNodeId.humanSafety]: 'humanSafety',
  [CustomerServiceWorkflowNodeId.outOfScope]: 'outOfScope',
  [CustomerServiceWorkflowNodeId.noData]: 'noData'
};

const isRecord = (value: unknown): value is UnknownRecord =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** 将标准模板固定分支映射为客服 API 动作；未知工作流继续走严格引用校验。 */
export const resolveCustomerServiceWorkflowFixedBranchAction = (
  branch?: CustomerServiceWorkflowFixedBranch
): CustomerServiceWorkflowFixedBranchAction | undefined => {
  switch (branch) {
    case 'greeting':
    case 'outOfScope':
      return 'answerWithoutCitations';
    case 'humanSafety':
      return 'humanRequired';
    case 'noData':
      return 'lowConfidence';
    default:
      return undefined;
  }
};

/** 将 FastGPT AI value 转成客服 API 的纯文本回答。 */
export const getCustomerServiceAnswerText = (value: unknown) => {
  if (!Array.isArray(value)) return '';
  return value
    .map((item) => {
      if (!isRecord(item) || !isRecord(item.text)) return '';
      return typeof item.text.content === 'string' ? item.text.content : '';
    })
    .filter(Boolean)
    .join('\n');
};

/**
 * 从任意层级 workflow responseData 收集知识库引用和标准客服终止分支，同时计算可比较的
 * embedding/rerank 最高分。全文或 RRF 没有统一的绝对阈值，因此存在有效引用但无可比分数时
 * 按有效处理。固定分支只按标准模板稳定 nodeId 识别，不影响普通工作流的引用门禁。
 */
export const extractCustomerServiceCitations = (responseData: unknown) => {
  const citations = new Map<string, CustomerServiceCitation>();
  const comparableScores: number[] = [];
  const visited = new WeakSet<object>();
  let workflowFixedBranch: CustomerServiceWorkflowFixedBranch | undefined;

  const visit = (value: unknown, depth = 0) => {
    if (depth > 30 || !value || typeof value !== 'object') return;
    if (visited.has(value)) return;
    visited.add(value);

    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }

    const record = value as UnknownRecord;
    if (typeof record.nodeId === 'string') {
      workflowFixedBranch = workflowFixedBranchByNodeId[record.nodeId] ?? workflowFixedBranch;
    }
    if (Array.isArray(record.quoteList)) {
      record.quoteList.forEach((quote) => {
        if (!isRecord(quote)) return;
        const id = typeof quote.id === 'string' ? quote.id : '';
        const datasetId = typeof quote.datasetId === 'string' ? quote.datasetId : '';
        const collectionId = typeof quote.collectionId === 'string' ? quote.collectionId : '';
        if (!id || !datasetId || !collectionId) return;

        const quoteScores = Array.isArray(quote.score)
          ? quote.score
              .filter(
                (score): score is ComparableQuoteScore =>
                  isRecord(score) &&
                  typeof score.value === 'number' &&
                  (score.type === SearchScoreTypeEnum.embedding ||
                    score.type === SearchScoreTypeEnum.reRank)
              )
              .map((score) => score.value)
          : [];
        const score = quoteScores.length > 0 ? Math.max(...quoteScores) : undefined;
        const existing = citations.get(id);
        // 同一个 chunk 可能同时出现在 embedding 和全文分支；保留信息更完整、分数更高的投影。
        if (!existing || (score !== undefined && (existing.score ?? -Infinity) < score)) {
          citations.set(id, {
            id,
            datasetId,
            collectionId,
            sourceName: typeof quote.sourceName === 'string' ? quote.sourceName : '',
            q: typeof quote.q === 'string' ? quote.q : '',
            a: typeof quote.a === 'string' ? quote.a : '',
            score
          });
        }
        comparableScores.push(...quoteScores);
      });
    }
    Object.values(record).forEach((child) => visit(child, depth + 1));
  };

  visit(responseData);
  const result = Array.from(citations.values());
  return {
    citations: result,
    confidence:
      comparableScores.length > 0 ? Math.max(...comparableScores) : result.length > 0 ? 1 : 0,
    workflowFixedBranch
  };
};

/** 读取已保存的 AI 正文和节点引用，供幂等请求回放。 */
export const getSavedCustomerServiceChatResult = async ({
  appId,
  chatId,
  responseChatItemId
}: {
  appId: string;
  chatId: string;
  responseChatItemId: string;
}) => {
  const source = { sourceType: ChatSourceTypeEnum.app, sourceId: appId };
  const chatItem = await MongoChatItem.findOne({
    ...buildChatSourceQuery(source),
    chatId,
    dataId: responseChatItemId,
    obj: ChatRoleEnum.AI
  })
    .select('value')
    .lean();
  if (!chatItem) return;

  const responseData = await getChatItemResponseData({
    ...source,
    chatId,
    chatItemDataId: responseChatItemId
  });
  return {
    answer: getCustomerServiceAnswerText(chatItem.value),
    ...extractCustomerServiceCitations(responseData)
  };
};

/**
 * 低置信度时把面向用户的聊天正文替换为服务端安全文案。节点响应继续保留用于审计，但不会再把
 * 模型猜测展示或用于幂等回放。
 */
export const replaceCustomerServiceChatAnswer = ({
  appId,
  chatId,
  responseChatItemId,
  answer
}: {
  appId: string;
  chatId: string;
  responseChatItemId: string;
  answer: string;
}) =>
  MongoChatItem.updateOne(
    {
      ...buildChatSourceQuery({ sourceType: ChatSourceTypeEnum.app, sourceId: appId }),
      chatId,
      dataId: responseChatItemId,
      obj: ChatRoleEnum.AI
    },
    {
      $set: {
        value: [{ text: { content: answer } }],
        citeCollectionIds: []
      }
    }
  );
