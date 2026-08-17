import { getForbidCollectionIdList, filterCollectionByMetadata } from './collectionFilter';
import { embeddingRecall } from './embeddingRecall';
import { fullTextRecall } from './fullTextRecall';
import { computeFilterIntersection } from '../utils';
import { getCustomerServiceGovernedCollectionIds } from '../../../customerService/knowledge/guard';

/**
 * 默认召回的并行调度层。
 * 这里先统一计算 forbid collection 与 metadata filter，再把同一份 collection 约束
 * 下发给 embedding/full-text 两条召回链路，保证两种召回方式看到的集合范围一致。
 */
export const multiQueryRecall = async ({
  teamId,
  datasetIds,
  model,
  imageQueries,
  collectionFilterMatch,
  collectionIdWhitelist,
  embeddingLimit,
  fullTextLimit,
  textQueries,
  imageCaptionQueries
}: {
  teamId: string;
  datasetIds: string[];
  model: string;
  imageQueries: string[];
  collectionFilterMatch?: string;
  collectionIdWhitelist?: string[];
  embeddingLimit: number;
  fullTextLimit: number;
  textQueries: string[];
  imageCaptionQueries: string[];
}) => {
  const [forbidCollectionIdList, metadataCollectionIdList, governedCollectionIdList] =
    await Promise.all([
      getForbidCollectionIdList({
        teamId,
        datasetIds
      }),
      filterCollectionByMetadata({
        teamId,
        datasetIds,
        collectionFilterMatch
      }),
      collectionIdWhitelist === undefined
        ? getCustomerServiceGovernedCollectionIds({ teamId, datasetIds })
        : Promise.resolve([])
    ]);
  // 已纳入客服治理的知识只能由可信客服上下文白名单放行，普通 App 默认拒绝。
  const finalForbidCollectionIdList = Array.from(
    new Set([...forbidCollectionIdList, ...governedCollectionIdList])
  );
  // metadata 和客服白名单均为允许集合；任意显式空集合都必须 fail-closed。
  const filterCollectionIdList = computeFilterIntersection([
    metadataCollectionIdList,
    collectionIdWhitelist
  ]);

  const [
    {
      tokens,
      textEmbeddingRecallResults,
      imageCaptionEmbeddingRecallResults,
      imageVectorRecallResults
    },
    { textFullTextRecallResults, imageCaptionFullTextRecallResults }
  ] = await Promise.all([
    embeddingRecall({
      teamId,
      datasetIds,
      model,
      imageQueries,
      textQueries,
      imageCaptionQueries,
      limit: embeddingLimit,
      forbidCollectionIdList: finalForbidCollectionIdList,
      filterCollectionIdList
    }),
    fullTextRecall({
      teamId,
      datasetIds,
      queryGroups: [
        { source: 'text', queries: textQueries },
        { source: 'imageCaption', queries: imageCaptionQueries }
      ],
      limit: fullTextLimit,
      filterCollectionIdList,
      forbidCollectionIdList: finalForbidCollectionIdList
    })
  ]);

  return {
    tokens,
    textEmbeddingRecallResults,
    imageCaptionEmbeddingRecallResults,
    imageVectorRecallResults,
    textFullTextRecallResults,
    imageCaptionFullTextRecallResults
  };
};
