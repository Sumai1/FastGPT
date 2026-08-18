import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServicePublicProject } from '@/service/customerService/publicAuth';
import {
  CustomerServicePublicHandoffBodySchema,
  CustomerServicePublicHandoffResponseSchema,
  type CustomerServicePublicHandoffResponse
} from '@fastgpt/global/openapi/customerService/api';
import { saveCustomerServiceHandoffSnapshot } from '@fastgpt/service/core/customerService/request/service';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';

/**
 * 保存正式客户咨询端排查留痕与转人工快照。
 * 记录用户已确认执行的排查步骤、软硬件版本及故障代码，以便坐席人员快速接手排查上下文。
 */
export async function handler(req: NextApiRequest): Promise<CustomerServicePublicHandoffResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServicePublicHandoffBodySchema
  }).body;
  const { teamId, projectId, binding } = await authCustomerServicePublicProject({
    publicId: body.publicId
  });

  await saveCustomerServiceHandoffSnapshot({
    teamId,
    projectId,
    openApiKeyId: String(binding.openApiKeyId),
    sessionId: body.sessionId,
    requestId: body.requestId,
    handoffSnapshot: {
      productModelName: body.productModelName,
      hardwareVersionName: body.hardwareVersionName,
      softwareVersionName: body.softwareVersionName,
      faultCode: body.faultCode,
      completedSteps: body.completedSteps,
      summaryText: body.summaryText
    }
  });

  return CustomerServicePublicHandoffResponseSchema.parse(undefined);
}

export default NextAPI(handler);
