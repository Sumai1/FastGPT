import type { NextApiRequest } from 'next';
import { AuthResponseSchema } from '@fastgpt/global/openapi/core/chat/completion/api';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getCustomerServiceProjectContextByApiKey } from '@fastgpt/service/core/customerService/project/service';
import {
  getCustomerServiceInternalProxyProject,
  getCustomerServicePublicProxyProject
} from './context';
import { UserError } from '@fastgpt/global/common/error/utils';

/**
 * 校验客服专用 OpenAPI Key 并解析项目、绑定和 App。这里只接受 Authorization API Key，
 * 登录 Cookie 不能替代对外客服凭证。
 */
export const authCustomerServiceExternalRequest = async (req: NextApiRequest) => {
  const internalProxyProjectId = getCustomerServiceInternalProxyProject(req);
  const publicProxyProjectId = getCustomerServicePublicProxyProject(req);
  const trustedProxyProjectId = internalProxyProjectId ?? publicProxyProjectId;
  const cert = await authCert({ req, authApiKey: true });
  const context = await getCustomerServiceProjectContextByApiKey({
    teamId: cert.teamId,
    apiKey: cert.apikey,
    origin: req.headers.origin,
    trustedInternalRequest: !!trustedProxyProjectId
  });
  if (trustedProxyProjectId && String(context.project._id) !== String(trustedProxyProjectId)) {
    throw new UserError('Customer service proxy project binding mismatch');
  }
  const auth = AuthResponseSchema.parse({
    teamId: cert.teamId,
    tmbId: cert.tmbId,
    app: context.app,
    showCite: true,
    authType: cert.authType,
    apikey: cert.apikey,
    responseAllData: true,
    sourceName: cert.sourceName || `customer-service:${context.project.projectCode}`
  });

  return { ...cert, ...context, auth };
};
