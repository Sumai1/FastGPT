import type {
  CustomerServiceAdminFrequentQuestionListBody,
  CustomerServiceAdminFrequentQuestionListResponse,
  CustomerServiceAdminOperationListBody,
  CustomerServiceAdminOperationListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { ChatRoleEnum, ChatSourceTypeEnum } from '@fastgpt/global/core/chat/constants';
import {
  CustomerServiceChatStatusEnum,
  CustomerServiceRequestStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { MongoCustomerServiceRequest } from '@fastgpt/service/core/customerService/request/schema';
import { MongoCustomerServiceProject } from '@fastgpt/service/core/customerService/project/schema';
import { MongoCustomerServiceProductModel } from '@fastgpt/service/core/customerService/product/schema';
import { MongoChatItem } from '@fastgpt/service/core/chat/chatItemSchema';
import { getChatItemResponseData } from '@fastgpt/service/core/chat/nodeResponseStorage';
import { Types } from '@fastgpt/service/common/mongo';
import { redactCustomerServiceSensitiveText } from '@fastgpt/service/core/customerService/privacy';

const MAX_OPERATION_POST_FILTER_SCAN = 2000;

const getChatText = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) =>
          item && typeof item === 'object' && 'text' in item
            ? (item.text as { content?: unknown } | undefined)?.content
            : undefined
        )
        .filter((item): item is string => typeof item === 'string')
        .join('\n')
        .trim()
    : '';

/** 将系列和型号筛选转换为客服请求表可使用的型号条件。 */
const resolveCustomerServiceOperationModelMatch = async ({
  teamId,
  seriesId,
  modelId
}: {
  teamId: string;
  seriesId?: string;
  modelId?: string;
}) => {
  const seriesModelIds = seriesId
    ? await MongoCustomerServiceProductModel.find({ teamId, seriesId }).distinct('_id')
    : undefined;
  if (modelId) {
    if (seriesModelIds && !seriesModelIds.some((id) => String(id) === modelId)) {
      return { $in: [] };
    }
    return new Types.ObjectId(modelId);
  }
  return seriesModelIds ? { $in: seriesModelIds } : undefined;
};

/** 聚合客服请求、原生聊天消息和节点响应，形成业务运营记录。 */
export const listCustomerServiceOperations = async ({
  teamId,
  input,
  projectIds
}: {
  teamId: string;
  input: CustomerServiceAdminOperationListBody;
  projectIds?: string[];
}): Promise<CustomerServiceAdminOperationListResponse> => {
  if (projectIds && projectIds.length === 0) return { total: 0, list: [] };
  if (projectIds && input.projectId && !projectIds.includes(input.projectId)) {
    return { total: 0, list: [] };
  }
  const pageNum = input.pageNum ?? 1;
  const pageSize = input.pageSize ?? 20;
  const needsPostFilter = Boolean(
    input.keyword ||
    input.feedback === 'good' ||
    input.feedback === 'bad' ||
    input.feedback === 'none'
  );
  const modelMatch = await resolveCustomerServiceOperationModelMatch({
    teamId,
    seriesId: input.seriesId,
    modelId: input.modelId
  });
  const match = {
    teamId: new Types.ObjectId(teamId),
    ...(input.projectId && { projectId: new Types.ObjectId(input.projectId) }),
    ...(!input.projectId &&
      projectIds && {
        projectId: { $in: projectIds.map((projectId) => new Types.ObjectId(projectId)) }
      }),
    ...(modelMatch && { modelId: modelMatch }),
    ...(input.resultStatus && { resultStatus: input.resultStatus }),
    ...(input.feedback === 'unresolved' && { unresolved: true }),
    ...((input.startTime || input.endTime) && {
      createTime: {
        ...(input.startTime && { $gte: input.startTime }),
        ...(input.endTime && { $lte: input.endTime })
      }
    })
  };
  const requestQuery = MongoCustomerServiceRequest.find(match).sort({ createTime: -1 });
  if (!needsPostFilter) {
    requestQuery.skip((pageNum - 1) * pageSize).limit(pageSize);
  } else {
    // 文本、反馈条件需联合原生消息后筛选；限制最大扫描量防止低权限岗位拉垂直全表。
    requestQuery.limit(MAX_OPERATION_POST_FILTER_SCAN);
  }
  const [requests, total] = await Promise.all([
    requestQuery.lean(),
    MongoCustomerServiceRequest.countDocuments(match)
  ]);
  const [projects, models] = await Promise.all([
    MongoCustomerServiceProject.find({
      teamId,
      _id: { $in: requests.map((item) => item.projectId) }
    })
      .select('_id appId name')
      .lean(),
    MongoCustomerServiceProductModel.find({
      teamId,
      _id: { $in: requests.flatMap((item) => (item.modelId ? [item.modelId] : [])) }
    })
      .select('_id name')
      .lean()
  ]);
  const projectMap = new Map(projects.map((item) => [String(item._id), item]));
  const modelMap = new Map(models.map((item) => [String(item._id), item.name]));

  const list = await Promise.all(
    requests.map(async (request) => {
      const project = projectMap.get(String(request.projectId));
      const source = {
        sourceType: ChatSourceTypeEnum.app,
        sourceId: String(project?.appId ?? '')
      };
      const [humanItem, aiItem, responseData] = project
        ? await Promise.all([
            MongoChatItem.findOne({
              teamId,
              appId: project.appId,
              chatId: request.internalChatId,
              obj: ChatRoleEnum.Human,
              time: { $lte: request.updateTime }
            })
              .sort({ time: -1 })
              .select('value')
              .lean(),
            MongoChatItem.findOne({
              teamId,
              appId: project.appId,
              chatId: request.internalChatId,
              dataId: request.responseChatItemId,
              obj: ChatRoleEnum.AI
            })
              .select('value userGoodFeedback userBadFeedback durationSeconds')
              .lean(),
            getChatItemResponseData({
              ...source,
              chatId: request.internalChatId,
              chatItemDataId: request.responseChatItemId
            })
          ])
        : [undefined, undefined, []];
      const quoteRows = responseData.flatMap((item) => item.quoteList ?? []);
      const citations = Array.from(
        new Map(
          quoteRows.map((quote) => [
            `${quote.datasetId}:${quote.collectionId}:${quote.sourceName}`,
            {
              datasetId: quote.datasetId,
              collectionId: quote.collectionId,
              sourceName: quote.sourceName,
              score: quote.score?.[0]?.value ?? null
            }
          ])
        ).values()
      );
      const question = request.question || getChatText(humanItem?.value);
      const answer = request.serverAnswer || getChatText(aiItem?.value);
      const aiFeedback = aiItem as
        | {
            userGoodFeedback?: string;
            userBadFeedback?: string;
            durationSeconds?: number;
          }
        | undefined;
      const nativeFeedback = aiFeedback?.userGoodFeedback
        ? ('good' as const)
        : aiFeedback?.userBadFeedback
          ? ('bad' as const)
          : ('none' as const);

      return {
        id: String(request._id),
        projectId: String(request.projectId),
        projectName: project?.name ?? '已删除客服',
        modelId: request.modelId ? String(request.modelId) : null,
        modelName: request.modelId ? (modelMap.get(String(request.modelId)) ?? null) : null,
        sessionId: request.externalSessionId,
        requestId: request.requestId,
        question,
        answer,
        resultStatus: request.resultStatus ?? null,
        feedback: request.unresolved ? ('unresolved' as const) : nativeFeedback,
        lowConfidence: request.lowConfidence,
        citationCount: request.citationCount,
        citations,
        humanReason: request.humanReason ?? null,
        durationSeconds: aiFeedback?.durationSeconds ?? null,
        tokens: responseData.reduce((sum, item) => sum + (item.tokens ?? 0), 0),
        points: responseData.reduce((sum, item) => sum + (item.totalPoints ?? 0), 0),
        createTime: request.createTime
      };
    })
  );

  const keyword = input.keyword?.toLowerCase();
  const filteredList = keyword
    ? list.filter(
        (item) =>
          item.question.toLowerCase().includes(keyword) ||
          item.answer.toLowerCase().includes(keyword)
      )
    : list;
  const feedbackList =
    input.feedback && input.feedback !== 'unresolved'
      ? filteredList.filter((item) => item.feedback === input.feedback)
      : filteredList;
  const pagedList = needsPostFilter
    ? feedbackList.slice((pageNum - 1) * pageSize, pageNum * pageSize)
    : feedbackList;

  return {
    total: needsPostFilter ? feedbackList.length : total,
    list: pagedList
  };
};

type FrequentQuestionAggregate = {
  requestRecordId: Types.ObjectId;
  projectId: Types.ObjectId;
  modelId?: Types.ObjectId | null;
  question: string;
  answer: string;
  count: number;
  unresolvedCount: number;
  clarificationRequiredCount: number;
  humanRequiredCount: number;
  latestTime: Date;
};

/**
 * 按项目、型号和规范化问题聚合最近 30 天客服请求。聚合只读取客服请求投影，避免为高频统计
 * 扫描原生聊天正文；返回最近一次样例，供知识编辑人工复核后创建草稿。
 */
export const listCustomerServiceFrequentQuestions = async ({
  teamId,
  input,
  projectIds
}: {
  teamId: string;
  input: CustomerServiceAdminFrequentQuestionListBody;
  projectIds?: string[];
}): Promise<CustomerServiceAdminFrequentQuestionListResponse> => {
  if (projectIds && projectIds.length === 0) return { list: [] };
  if (projectIds && input.projectId && !projectIds.includes(input.projectId)) return { list: [] };

  const modelMatch = await resolveCustomerServiceOperationModelMatch({
    teamId,
    seriesId: input.seriesId,
    modelId: input.modelId
  });
  const endTime = input.endTime ?? new Date();
  const startTime = input.startTime ?? new Date(endTime.getTime() - 30 * 24 * 60 * 60 * 1000);
  const match: Record<string, unknown> = {
    teamId: new Types.ObjectId(teamId),
    status: CustomerServiceRequestStatusEnum.completed,
    question: { $type: 'string', $ne: '' },
    ...(input.projectId && { projectId: new Types.ObjectId(input.projectId) }),
    ...(!input.projectId &&
      projectIds && {
        projectId: { $in: projectIds.map((projectId) => new Types.ObjectId(projectId)) }
      }),
    ...(modelMatch && { modelId: modelMatch }),
    createTime: { $gte: startTime, $lte: endTime }
  };
  const rows = await MongoCustomerServiceRequest.aggregate<FrequentQuestionAggregate>([
    { $match: match },
    {
      $set: {
        normalizedQuestion: { $toLower: { $trim: { input: '$question' } } }
      }
    },
    { $match: { normalizedQuestion: { $ne: '' } } },
    { $sort: { createTime: -1 } },
    {
      $group: {
        _id: {
          projectId: '$projectId',
          modelId: '$modelId',
          question: '$normalizedQuestion'
        },
        requestRecordId: { $first: '$_id' },
        projectId: { $first: '$projectId' },
        modelId: { $first: '$modelId' },
        question: { $first: '$question' },
        answer: { $first: { $ifNull: ['$serverAnswer', ''] } },
        count: { $sum: 1 },
        unresolvedCount: { $sum: { $cond: ['$unresolved', 1, 0] } },
        clarificationRequiredCount: {
          $sum: {
            $cond: [
              { $eq: ['$resultStatus', CustomerServiceChatStatusEnum.clarificationRequired] },
              1,
              0
            ]
          }
        },
        humanRequiredCount: {
          $sum: {
            $cond: [{ $eq: ['$resultStatus', CustomerServiceChatStatusEnum.humanRequired] }, 1, 0]
          }
        },
        latestTime: { $max: '$createTime' }
      }
    },
    { $match: { count: { $gte: input.minimumCount ?? 2 } } },
    { $sort: { count: -1, unresolvedCount: -1, latestTime: -1 } },
    { $limit: input.limit ?? 10 }
  ]);
  const [projects, models] = await Promise.all([
    MongoCustomerServiceProject.find({
      teamId,
      _id: { $in: rows.map((item) => item.projectId) }
    })
      .select('_id name')
      .lean(),
    MongoCustomerServiceProductModel.find({
      teamId,
      _id: { $in: rows.flatMap((item) => (item.modelId ? [item.modelId] : [])) }
    })
      .select('_id name')
      .lean()
  ]);
  const projectMap = new Map(projects.map((item) => [String(item._id), item.name]));
  const modelMap = new Map(models.map((item) => [String(item._id), item.name]));

  return {
    list: rows.map((item) => ({
      requestRecordId: String(item.requestRecordId),
      projectId: String(item.projectId),
      projectName: projectMap.get(String(item.projectId)) ?? '已删除客服',
      modelId: item.modelId ? String(item.modelId) : null,
      modelName: item.modelId ? (modelMap.get(String(item.modelId)) ?? null) : null,
      question: redactCustomerServiceSensitiveText(item.question),
      answer: redactCustomerServiceSensitiveText(item.answer),
      count: item.count,
      unresolvedCount: item.unresolvedCount,
      clarificationRequiredCount: item.clarificationRequiredCount,
      humanRequiredCount: item.humanRequiredCount,
      latestTime: item.latestTime
    }))
  };
};

/** 读取一条属于当前团队的客服请求，供“转知识草稿”接口复核来源和产品范围。 */
export const findCustomerServiceOperationById = ({ teamId, id }: { teamId: string; id: string }) =>
  MongoCustomerServiceRequest.findOne({ _id: id, teamId }).lean();
