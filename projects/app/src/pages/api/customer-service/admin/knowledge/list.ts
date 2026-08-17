import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import {
  authCustomerServiceRoles,
  filterCustomerServiceDatasetIds
} from '@/service/customerService/adminAuth';
import { formatCustomerServiceKnowledges } from '@/service/customerService/format';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceAdminKnowledgeListBodySchema,
  CustomerServiceAdminKnowledgeListResponseSchema,
  type CustomerServiceAdminKnowledgeListResponse
} from '@fastgpt/global/openapi/customerService/api';
import { listCustomerServiceKnowledges } from '@fastgpt/service/core/customerService/knowledge/entity';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { getCustomerServiceKnowledgeTrainingStatusMap } from '@fastgpt/service/core/customerService/knowledge/service';

/** 获取当前团队的知识治理记录。 */
async function handler(req: NextApiRequest): Promise<CustomerServiceAdminKnowledgeListResponse> {
  const body = parseApiInput({
    req,
    bodySchema: CustomerServiceAdminKnowledgeListBodySchema
  }).body;
  const { teamId, tmbId, isRoot } = await authCustomerServiceRoles({
    req,
    roles: [
      CustomerServiceMemberRoleEnum.customerServiceAdmin,
      CustomerServiceMemberRoleEnum.knowledgeEditor,
      CustomerServiceMemberRoleEnum.knowledgeReviewer
    ]
  });
  const items = await listCustomerServiceKnowledges({ teamId, ...body });
  const readableDatasetIds = new Set(
    await filterCustomerServiceDatasetIds({
      datasetIds: items.map((item) => String(item.datasetId)),
      tmbId,
      isRoot
    })
  );
  const visibleItems = items.filter((item) => readableDatasetIds.has(String(item.datasetId)));
  const trainingStatusMap = await getCustomerServiceKnowledgeTrainingStatusMap({
    teamId,
    items: visibleItems
  });
  return CustomerServiceAdminKnowledgeListResponseSchema.parse(
    formatCustomerServiceKnowledges(visibleItems).map((item) => ({
      ...item,
      ...(trainingStatusMap.get(item.collectionId) ?? {
        trainingStatus: 'empty' as const,
        trainingAmount: 0,
        dataAmount: 0,
        trainingError: ''
      })
    }))
  );
}

export default NextAPI(handler);
