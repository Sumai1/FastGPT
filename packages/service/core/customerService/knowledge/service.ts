import {
  CustomerServiceKnowledgeAuditActionEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceVersionTypeEnum,
  type CustomerServiceAudienceEnum,
  type CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import { UserError } from '@fastgpt/global/common/error/utils';
import type { ClientSession } from '../../../common/mongo';
import { mongoSessionRun } from '../../../common/mongo/sessionRun';
import { MongoDatasetCollection } from '../../dataset/collection/schema';
import { MongoDatasetData } from '../../dataset/data/schema';
import { MongoDatasetTraining } from '../../dataset/training/schema';
import { isFinalErrorTraining, remainingTrainingMatch } from '../../dataset/training/query';
import {
  createCustomerServiceKnowledge,
  createCustomerServiceKnowledgeAudit,
  findCustomerServiceKnowledgeById,
  transitionCustomerServiceKnowledge,
  updateEditableCustomerServiceKnowledgeById
} from './entity';
import { MongoCustomerServiceKnowledge } from './schema';
import { Types } from '../../../common/mongo';
import { listProductModelsByIds, listProductVersionsByIds } from '../product/entity';

type KnowledgeTrainingTarget = {
  collectionId: unknown;
};

/**
 * 汇总治理记录引用的 FastGPT 原生训练队列和分块数量。
 * 不创建第二套训练状态；最终错误优先于运行中，零任务且有分块才视为 ready。
 */
export const getCustomerServiceKnowledgeTrainingStatusMap = async ({
  teamId,
  items
}: {
  teamId: string;
  items: KnowledgeTrainingTarget[];
}) => {
  const collectionIds = Array.from(new Set(items.map((item) => String(item.collectionId))));
  if (collectionIds.length === 0)
    return new Map<
      string,
      {
        trainingStatus: 'running' | 'ready' | 'error' | 'empty';
        trainingAmount: number;
        dataAmount: number;
        trainingError: string;
      }
    >();

  const [remainingTrainings, dataCounts] = await Promise.all([
    MongoDatasetTraining.find({
      teamId,
      collectionId: { $in: collectionIds },
      ...remainingTrainingMatch
    })
      .select('collectionId errorMsg retryCount lockTime')
      .lean(),
    MongoDatasetData.aggregate<{ _id: unknown; count: number }>([
      {
        $match: {
          teamId: new Types.ObjectId(teamId),
          collectionId: { $in: collectionIds.map((id) => new Types.ObjectId(id)) }
        }
      },
      { $group: { _id: '$collectionId', count: { $sum: 1 } } }
    ])
  ]);

  const trainingMap = new Map<string, typeof remainingTrainings>();
  remainingTrainings.forEach((training) => {
    const id = String(training.collectionId);
    trainingMap.set(id, [...(trainingMap.get(id) ?? []), training]);
  });
  const dataCountMap = new Map(dataCounts.map((item) => [String(item._id), item.count]));

  return new Map(
    collectionIds.map((collectionId) => {
      const trainings = trainingMap.get(collectionId) ?? [];
      const trainingError = trainings.find(isFinalErrorTraining)?.errorMsg ?? '';
      const dataAmount = dataCountMap.get(collectionId) ?? 0;
      return [
        collectionId,
        {
          trainingStatus: trainingError
            ? ('error' as const)
            : trainings.length > 0
              ? ('running' as const)
              : dataAmount > 0
                ? ('ready' as const)
                : ('empty' as const),
          trainingAmount: trainings.length,
          dataAmount,
          trainingError
        }
      ];
    })
  );
};

/** 校验治理范围内的产品和版本均属于当前团队，并且版本类型及型号归属一致。 */
const validateCustomerServiceKnowledgeScope = async ({
  teamId,
  modelIds,
  hardwareVersionIds,
  softwareVersionIds
}: {
  teamId: string;
  modelIds: string[];
  hardwareVersionIds: string[];
  softwareVersionIds: string[];
}) => {
  const uniqueModelIds = Array.from(new Set(modelIds));
  const uniqueHardwareVersionIds = Array.from(new Set(hardwareVersionIds));
  const uniqueSoftwareVersionIds = Array.from(new Set(softwareVersionIds));
  const [models, hardwareVersions, softwareVersions] = await Promise.all([
    listProductModelsByIds({ teamId, ids: uniqueModelIds }),
    listProductVersionsByIds({ teamId, ids: uniqueHardwareVersionIds }),
    listProductVersionsByIds({ teamId, ids: uniqueSoftwareVersionIds })
  ]);
  if (
    models.length !== uniqueModelIds.length ||
    hardwareVersions.length !== uniqueHardwareVersionIds.length ||
    softwareVersions.length !== uniqueSoftwareVersionIds.length
  ) {
    throw new UserError('Customer service knowledge product scope is invalid');
  }
  if (
    hardwareVersions.some((item) => item.type !== CustomerServiceVersionTypeEnum.hardware) ||
    softwareVersions.some((item) => item.type !== CustomerServiceVersionTypeEnum.software)
  ) {
    throw new UserError('Customer service knowledge version type is invalid');
  }
  if (uniqueModelIds.length > 0) {
    const modelIdSet = new Set(uniqueModelIds);
    if (
      [...hardwareVersions, ...softwareVersions].some(
        (item) => !modelIdSet.has(String(item.modelId))
      )
    ) {
      throw new UserError('Customer service knowledge version does not belong to selected models');
    }
  }
};

/** 创建引用式治理记录，并把 collection 保持为禁止检索状态。 */
export const createCustomerServiceKnowledgeDraft = async ({
  teamId,
  tmbId,
  datasetId,
  collectionId,
  title,
  sourceName = '',
  sourceRequestRecordId,
  sourceSessionId,
  knowledgeType,
  audienceLevel,
  modelIds = [],
  hardwareVersionIds = [],
  softwareVersionIds = [],
  effectiveFrom,
  effectiveTo,
  previousKnowledgeId,
  structuredData,
  session
}: {
  teamId: string;
  tmbId: string;
  datasetId: string;
  collectionId: string;
  title: string;
  sourceName?: string;
  sourceRequestRecordId?: string;
  sourceSessionId?: string;
  knowledgeType: CustomerServiceKnowledgeTypeEnum;
  audienceLevel: CustomerServiceAudienceEnum;
  modelIds?: string[];
  hardwareVersionIds?: string[];
  softwareVersionIds?: string[];
  effectiveFrom?: Date;
  effectiveTo?: Date;
  previousKnowledgeId?: string;
  structuredData?: Record<string, unknown> | null;
  session?: ClientSession;
}) => {
  if (effectiveFrom && effectiveTo && effectiveFrom > effectiveTo) {
    throw new UserError('Knowledge effective time range is invalid');
  }
  await validateCustomerServiceKnowledgeScope({
    teamId,
    modelIds,
    hardwareVersionIds,
    softwareVersionIds
  });

  const collection = await MongoDatasetCollection.findOne({
    _id: collectionId,
    teamId,
    datasetId
  })
    .select('_id')
    .session(session ?? null)
    .lean();
  if (!collection) throw new UserError('Dataset collection not found');

  const previousKnowledge = previousKnowledgeId
    ? await findCustomerServiceKnowledgeById({ teamId, knowledgeId: previousKnowledgeId, session })
    : undefined;
  if (previousKnowledgeId && !previousKnowledge) {
    throw new UserError('Previous customer service knowledge not found');
  }
  if (
    previousKnowledge &&
    ![
      CustomerServiceKnowledgeStatusEnum.published,
      CustomerServiceKnowledgeStatusEnum.offline
    ].includes(previousKnowledge.status)
  ) {
    throw new UserError('Only published or offline customer service knowledge can be versioned');
  }

  const create = async (activeSession: ClientSession) => {
    const knowledge = await createCustomerServiceKnowledge(
      {
        teamId,
        tmbId,
        updateTmbId: tmbId,
        datasetId,
        collectionId,
        title: title.trim(),
        sourceName: sourceName.trim(),
        sourceRequestRecordId,
        sourceSessionId: sourceSessionId?.trim(),
        knowledgeType,
        audienceLevel,
        // 固定顺序后，同一治理范围可以用 MongoDB 数组精确匹配识别旧版本。
        modelIds: Array.from(new Set(modelIds)).sort(),
        hardwareVersionIds: Array.from(new Set(hardwareVersionIds)).sort(),
        softwareVersionIds: Array.from(new Set(softwareVersionIds)).sort(),
        effectiveFrom,
        effectiveTo,
        status: CustomerServiceKnowledgeStatusEnum.draft,
        version: (previousKnowledge?.version ?? 0) + 1,
        versionGroupId: previousKnowledge?.versionGroupId ?? String(new Types.ObjectId()),
        previousKnowledgeId,
        supersededBy: null,
        supersededAt: null,
        structuredData: structuredData ?? null,
        reviewReason: ''
      },
      activeSession
    );

    await Promise.all([
      MongoDatasetCollection.updateOne(
        { _id: collectionId, teamId, datasetId },
        {
          $set: { forbid: true, updateTime: new Date() },
          $unset: { 'metadata.customerServicePendingRegistration': '' }
        },
        { session: activeSession }
      ),
      createCustomerServiceKnowledgeAudit({
        teamId,
        knowledgeId: String(knowledge._id),
        action: CustomerServiceKnowledgeAuditActionEnum.create,
        toStatus: CustomerServiceKnowledgeStatusEnum.draft,
        operatorTmbId: tmbId,
        session: activeSession
      })
    ]);

    return knowledge;
  };

  return session ? create(session) : mongoSessionRun(create);
};

/**
 * 更新草稿或已驳回记录的治理元数据。dataset/collection 与版本链不可变，防止编辑动作把
 * 已训练正文悄悄切换到另一份资源；状态条件和审计写入在同一事务内完成。
 */
export const updateCustomerServiceKnowledgeDraft = async ({
  teamId,
  tmbId,
  knowledgeId,
  title,
  sourceName,
  knowledgeType,
  audienceLevel,
  modelIds,
  hardwareVersionIds,
  softwareVersionIds,
  effectiveFrom,
  effectiveTo,
  structuredData,
  session
}: {
  teamId: string;
  tmbId: string;
  knowledgeId: string;
  title?: string;
  sourceName?: string;
  knowledgeType?: CustomerServiceKnowledgeTypeEnum;
  audienceLevel?: CustomerServiceAudienceEnum;
  modelIds?: string[];
  hardwareVersionIds?: string[];
  softwareVersionIds?: string[];
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  structuredData?: Record<string, unknown> | null;
  session?: ClientSession;
}) => {
  const update = async (activeSession: ClientSession) => {
    const knowledge = await findCustomerServiceKnowledgeById({
      teamId,
      knowledgeId,
      session: activeSession
    });
    if (!knowledge) throw new UserError('Customer service knowledge not found');
    const nextEffectiveFrom = effectiveFrom === undefined ? knowledge.effectiveFrom : effectiveFrom;
    const nextEffectiveTo = effectiveTo === undefined ? knowledge.effectiveTo : effectiveTo;
    if (nextEffectiveFrom && nextEffectiveTo && nextEffectiveFrom > nextEffectiveTo) {
      throw new UserError('Knowledge effective time range is invalid');
    }
    await validateCustomerServiceKnowledgeScope({
      teamId,
      modelIds: modelIds ?? knowledge.modelIds.map(String),
      hardwareVersionIds: hardwareVersionIds ?? knowledge.hardwareVersionIds.map(String),
      softwareVersionIds: softwareVersionIds ?? knowledge.softwareVersionIds.map(String)
    });

    const updated = await updateEditableCustomerServiceKnowledgeById({
      teamId,
      knowledgeId,
      update: {
        ...(title !== undefined && { title: title.trim() }),
        ...(sourceName !== undefined && { sourceName: sourceName.trim() }),
        ...(knowledgeType !== undefined && { knowledgeType }),
        ...(audienceLevel !== undefined && { audienceLevel }),
        ...(modelIds !== undefined && { modelIds: Array.from(new Set(modelIds)).sort() }),
        ...(hardwareVersionIds !== undefined && {
          hardwareVersionIds: Array.from(new Set(hardwareVersionIds)).sort()
        }),
        ...(softwareVersionIds !== undefined && {
          softwareVersionIds: Array.from(new Set(softwareVersionIds)).sort()
        }),
        ...(effectiveFrom !== undefined && { effectiveFrom }),
        ...(effectiveTo !== undefined && { effectiveTo }),
        ...(structuredData !== undefined && { structuredData }),
        updateTmbId: tmbId
      },
      session: activeSession
    });
    if (!updated) throw new UserError('Knowledge status has changed, please refresh');

    await createCustomerServiceKnowledgeAudit({
      teamId,
      knowledgeId,
      action: CustomerServiceKnowledgeAuditActionEnum.update,
      fromStatus: knowledge.status,
      toStatus: knowledge.status,
      reason: 'Governance fields updated',
      operatorTmbId: tmbId,
      session: activeSession
    });
    return updated;
  };

  return session ? update(session) : mongoSessionRun(update);
};

/** 提交审核前复用现有训练队列判断 ready，并保证 collection 至少包含一个数据块。 */
export const submitCustomerServiceKnowledge = async ({
  teamId,
  tmbId,
  knowledgeId,
  session
}: {
  teamId: string;
  tmbId: string;
  knowledgeId: string;
  session?: ClientSession;
}) => {
  const submit = async (activeSession: ClientSession) => {
    const knowledge = await findCustomerServiceKnowledgeById({
      teamId,
      knowledgeId,
      session: activeSession
    });
    if (!knowledge) throw new UserError('Customer service knowledge not found');

    const [remainingTraining, hasContent] = await Promise.all([
      MongoDatasetTraining.exists({
        teamId,
        datasetId: knowledge.datasetId,
        collectionId: knowledge.collectionId,
        ...remainingTrainingMatch
      }).session(activeSession),
      MongoDatasetData.exists({
        teamId,
        datasetId: knowledge.datasetId,
        collectionId: knowledge.collectionId
      }).session(activeSession)
    ]);
    if (remainingTraining) throw new UserError('Dataset collection training is not ready');
    if (!hasContent) throw new UserError('Dataset collection content is empty');

    const submitted = await transitionCustomerServiceKnowledge({
      teamId,
      knowledgeId,
      fromStatus: [
        CustomerServiceKnowledgeStatusEnum.draft,
        CustomerServiceKnowledgeStatusEnum.rejected
      ],
      toStatus: CustomerServiceKnowledgeStatusEnum.pending,
      update: {
        submitterTmbId: tmbId,
        submitTime: new Date(),
        reviewerTmbId: null,
        reviewTime: null,
        reviewReason: '',
        updateTmbId: tmbId
      },
      session: activeSession
    });
    if (!submitted) throw new UserError('Knowledge status has changed, please refresh');

    await createCustomerServiceKnowledgeAudit({
      teamId,
      knowledgeId,
      action: CustomerServiceKnowledgeAuditActionEnum.submit,
      fromStatus: knowledge.status,
      toStatus: CustomerServiceKnowledgeStatusEnum.pending,
      operatorTmbId: tmbId,
      session: activeSession
    });
    return submitted;
  };

  return session ? submit(session) : mongoSessionRun(submit);
};

/** 驳回待审知识，驳回原因必填并继续禁止 collection 参与检索。 */
export const rejectCustomerServiceKnowledge = async ({
  teamId,
  reviewerTmbId,
  knowledgeId,
  reason,
  session
}: {
  teamId: string;
  reviewerTmbId: string;
  knowledgeId: string;
  reason: string;
  session?: ClientSession;
}) => {
  if (!reason.trim()) throw new UserError('Knowledge rejection reason is required');
  const reject = async (activeSession: ClientSession) => {
    const knowledge = await findCustomerServiceKnowledgeById({
      teamId,
      knowledgeId,
      session: activeSession
    });
    if (!knowledge) throw new UserError('Customer service knowledge not found');
    if (String(knowledge.submitterTmbId) === reviewerTmbId) {
      throw new UserError('Knowledge cannot be reviewed by its submitter');
    }

    const rejected = await transitionCustomerServiceKnowledge({
      teamId,
      knowledgeId,
      fromStatus: CustomerServiceKnowledgeStatusEnum.pending,
      toStatus: CustomerServiceKnowledgeStatusEnum.rejected,
      update: {
        reviewerTmbId,
        reviewTime: new Date(),
        reviewReason: reason.trim(),
        updateTmbId: reviewerTmbId
      },
      session: activeSession
    });
    if (!rejected) throw new UserError('Knowledge status has changed, please refresh');

    await Promise.all([
      MongoDatasetCollection.updateOne(
        { _id: rejected.collectionId, teamId },
        { $set: { forbid: true, updateTime: new Date() } },
        { session: activeSession }
      ),
      createCustomerServiceKnowledgeAudit({
        teamId,
        knowledgeId,
        action: CustomerServiceKnowledgeAuditActionEnum.reject,
        fromStatus: CustomerServiceKnowledgeStatusEnum.pending,
        toStatus: CustomerServiceKnowledgeStatusEnum.rejected,
        reason: reason.trim(),
        operatorTmbId: reviewerTmbId,
        session: activeSession
      })
    ]);
    return rejected;
  };

  return session ? reject(session) : mongoSessionRun(reject);
};

/** 发布知识并在同一事务中下架相同治理范围的旧版本，同时切换 collection.forbid。 */
export const publishCustomerServiceKnowledge = async ({
  teamId,
  reviewerTmbId,
  knowledgeId,
  session
}: {
  teamId: string;
  reviewerTmbId: string;
  knowledgeId: string;
  session?: ClientSession;
}) => {
  const publish = async (activeSession: ClientSession) => {
    const knowledge = await findCustomerServiceKnowledgeById({
      teamId,
      knowledgeId,
      session: activeSession
    });
    if (!knowledge) throw new UserError('Customer service knowledge not found');
    if (knowledge.status !== CustomerServiceKnowledgeStatusEnum.pending) {
      throw new UserError('Knowledge status has changed, please refresh');
    }
    if (String(knowledge.submitterTmbId) === reviewerTmbId) {
      throw new UserError('Knowledge cannot be reviewed by its submitter');
    }

    const conflictFilter = {
      teamId,
      _id: { $ne: knowledgeId },
      status: CustomerServiceKnowledgeStatusEnum.published,
      versionGroupId: knowledge.versionGroupId
    };
    const oldVersions = await MongoCustomerServiceKnowledge.find(conflictFilter)
      .select('_id collectionId')
      .session(activeSession)
      .lean();
    const now = new Date();

    if (oldVersions.length > 0) {
      await Promise.all([
        MongoCustomerServiceKnowledge.updateMany(
          conflictFilter,
          {
            $set: {
              status: CustomerServiceKnowledgeStatusEnum.offline,
              supersededBy: knowledgeId,
              supersededAt: now,
              offlineTime: now,
              updateTime: now,
              updateTmbId: reviewerTmbId
            }
          },
          { session: activeSession }
        ),
        MongoDatasetCollection.updateMany(
          { _id: { $in: oldVersions.map((item) => item.collectionId) }, teamId },
          { $set: { forbid: true, updateTime: now } },
          { session: activeSession }
        )
      ]);
    }

    const published = await transitionCustomerServiceKnowledge({
      teamId,
      knowledgeId,
      fromStatus: CustomerServiceKnowledgeStatusEnum.pending,
      toStatus: CustomerServiceKnowledgeStatusEnum.published,
      update: {
        reviewerTmbId,
        reviewTime: now,
        reviewReason: '',
        publishedTime: now,
        offlineTime: null,
        updateTmbId: reviewerTmbId
      },
      session: activeSession
    });
    if (!published) throw new UserError('Knowledge status has changed, please refresh');

    await Promise.all([
      MongoDatasetCollection.updateOne(
        { _id: knowledge.collectionId, teamId, datasetId: knowledge.datasetId },
        { $set: { forbid: false, updateTime: now } },
        { session: activeSession }
      ),
      createCustomerServiceKnowledgeAudit({
        teamId,
        knowledgeId,
        action: CustomerServiceKnowledgeAuditActionEnum.publish,
        fromStatus: CustomerServiceKnowledgeStatusEnum.pending,
        toStatus: CustomerServiceKnowledgeStatusEnum.published,
        operatorTmbId: reviewerTmbId,
        session: activeSession
      }),
      ...oldVersions.map((item) =>
        createCustomerServiceKnowledgeAudit({
          teamId,
          knowledgeId: String(item._id),
          action: CustomerServiceKnowledgeAuditActionEnum.offline,
          fromStatus: CustomerServiceKnowledgeStatusEnum.published,
          toStatus: CustomerServiceKnowledgeStatusEnum.offline,
          reason: `Superseded by ${knowledgeId}`,
          operatorTmbId: reviewerTmbId,
          session: activeSession
        })
      )
    ]);

    return published;
  };

  try {
    return await (session ? publish(session) : mongoSessionRun(publish));
  } catch (error) {
    // partial unique index 是并发发布的最终 CAS，对外转成可重试的业务错误。
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw new UserError('Another version was published concurrently, please refresh and retry');
    }
    throw error;
  }
};

/** 下架已发布知识并同步设置 collection.forbid=true。 */
export const offlineCustomerServiceKnowledge = async ({
  teamId,
  operatorTmbId,
  knowledgeId,
  reason,
  session
}: {
  teamId: string;
  operatorTmbId: string;
  knowledgeId: string;
  reason: string;
  session?: ClientSession;
}) => {
  if (!reason.trim()) throw new UserError('Knowledge offline reason is required');

  const offline = async (activeSession: ClientSession) => {
    const knowledge = await transitionCustomerServiceKnowledge({
      teamId,
      knowledgeId,
      fromStatus: CustomerServiceKnowledgeStatusEnum.published,
      toStatus: CustomerServiceKnowledgeStatusEnum.offline,
      update: {
        offlineTime: new Date(),
        updateTmbId: operatorTmbId
      },
      session: activeSession
    });
    if (!knowledge) throw new UserError('Knowledge status has changed, please refresh');

    await Promise.all([
      MongoDatasetCollection.updateOne(
        { _id: knowledge.collectionId, teamId },
        { $set: { forbid: true, updateTime: new Date() } },
        { session: activeSession }
      ),
      createCustomerServiceKnowledgeAudit({
        teamId,
        knowledgeId,
        action: CustomerServiceKnowledgeAuditActionEnum.offline,
        fromStatus: CustomerServiceKnowledgeStatusEnum.published,
        toStatus: CustomerServiceKnowledgeStatusEnum.offline,
        reason: reason.trim(),
        operatorTmbId,
        session: activeSession
      })
    ]);
    return knowledge;
  };

  return session ? offline(session) : mongoSessionRun(offline);
};
