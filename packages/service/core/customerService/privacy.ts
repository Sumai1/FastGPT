import { createHmac } from 'node:crypto';
import { serviceEnv } from '../../env';

export { redactCustomerServiceSensitiveText } from '@fastgpt/global/core/customerService/privacy';

/** 对外部用户标识做不可逆、环境隔离的 HMAC，日志和元数据不保存调用方原始标识。 */
export const hashCustomerServiceExternalUserId = ({
  teamId,
  projectId,
  externalUserId
}: {
  teamId: string;
  projectId: string;
  externalUserId?: string;
}) =>
  externalUserId
    ? createHmac('sha256', serviceEnv.AES256_SECRET_KEY)
        .update(`${teamId}:${projectId}:${externalUserId}`)
        .digest('hex')
    : undefined;
