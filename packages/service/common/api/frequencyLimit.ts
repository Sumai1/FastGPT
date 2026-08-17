/* 基于 Team 的限流 */
import { getGlobalRedisConnection } from '../../common/redis';
import { jsonRes } from '../../common/response';
import type { NodeApiResponse } from '../../types/http';
import { teamQPM } from '../../support/wallet/sub/utils';
import z from 'zod';
import { getLogger, LogCategories } from '../logger';
import { UserError } from '@fastgpt/global/common/error/utils';

const logger = getLogger(LogCategories.HTTP.RESPONSE);

export enum LimitTypeEnum {
  chat = 'chat'
}

const _FrequencyLimitOptionSchema = z.union([
  z.object({
    type: z.literal(LimitTypeEnum.chat),
    teamId: z.string()
  })
]);
type FrequencyLimitOption = z.infer<typeof _FrequencyLimitOptionSchema>;

/** 使用 Redis 原子计数执行固定窗口限流，并写入统一限流响应头。 */
const frequencyLimitByKey = async ({
  key,
  limit,
  seconds,
  scopeDescription,
  res
}: {
  key: string;
  limit: number;
  seconds: number;
  scopeDescription: string;
  res: NodeApiResponse;
}) => {
  const redis = getGlobalRedisConnection();
  const result = await redis.multi().incr(key).expire(key, seconds, 'NX').exec();
  if (!result) return true;

  const currentCount = result[0][1] as number;
  if (currentCount > limit) {
    const remainingTime = await redis.ttl(key);
    logger.info('Frequency limit exceeded', {
      key,
      currentCount,
      limit,
      ttlSeconds: remainingTime
    });
    jsonRes(res, {
      code: 429,
      error: new UserError(
        `Rate limit exceeded. Maximum ${limit} requests per ${seconds} seconds for ${scopeDescription}. Please try again in ${remainingTime} seconds.`
      )
    });
    return false;
  }

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentCount));
  res.setHeader('X-RateLimit-Reset', Date.now() + seconds * 1000);
  return true;
};

const getLimitData = async (data: FrequencyLimitOption) => {
  if (data.type === LimitTypeEnum.chat) {
    const qpm = await teamQPM.getTeamQPMLimit(data.teamId);

    if (!qpm) return;

    return {
      limit: qpm,
      seconds: 60
    };
  }

  return;
};

/*
  true: 未达到限制
  false: 达到了限制
*/
export const teamFrequencyLimit = async ({
  teamId,
  type,
  res
}: FrequencyLimitOption & { res: NodeApiResponse }) => {
  const data = await getLimitData({ type, teamId });
  if (!data) return true;

  const { limit, seconds } = data;

  const key = `frequency:${type}:${teamId}`;
  return frequencyLimitByKey({
    key,
    limit,
    seconds,
    scopeDescription: 'this team',
    res
  });
};

/** 客服项目和 Key 绑定维度限流；未配置覆盖值时由调用方继续使用现有团队限流。 */
export const customerServiceFrequencyLimit = ({
  teamId,
  projectId,
  openApiKeyId,
  limit,
  seconds,
  res
}: {
  teamId: string;
  projectId: string;
  openApiKeyId: string;
  limit: number;
  seconds: number;
  res: NodeApiResponse;
}) =>
  frequencyLimitByKey({
    key: `frequency:customerService:${teamId}:${projectId}:${openApiKeyId}`,
    limit,
    seconds,
    scopeDescription: 'this customer service project',
    res
  });
