import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import {
  CustomerServiceAdminRoleSetBodySchema,
  CustomerServiceAdminRoleSetResponseSchema,
  type CustomerServiceAdminRoleSetResponse
} from '@fastgpt/global/openapi/customerService/api';
import { setCustomerServiceMemberRole } from '@fastgpt/service/core/customerService/memberRole/service';
import { getTmbInfoByTmbId } from '@fastgpt/service/support/user/team/controller';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { UserError } from '@fastgpt/global/common/error/utils';

/** 设置客服岗位，目标成员必须属于当前团队，变更原因写入审计记录。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminRoleSetResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminRoleSetBodySchema
  }).body;
  const { teamId, tmbId } = await authCustomerServiceAdmin(req);
  const target = await getTmbInfoByTmbId({ tmbId: body.tmbId });
  if (target.teamId !== teamId) throw new UserError('Target member is not in current team');
  await setCustomerServiceMemberRole({
    teamId,
    operatorTmbId: tmbId,
    ...body
  });
  return CustomerServiceAdminRoleSetResponseSchema.parse(undefined);
}

export default NextAPI(handler);
