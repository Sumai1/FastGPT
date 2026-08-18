import type { NextApiRequest } from 'next';
import { NextAPI } from '@/service/middleware/entry';
import { authCustomerServiceAdmin } from '@/service/customerService/adminAuth';
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
import { initCustomerServiceAccounts } from '@/service/mongo';

/**
 * 确保/创建智能客服独立的采编员与审核员系统账号及角色绑定
 * POST /api/customer-service/admin/init-accounts
 */
async function handler(req: NextApiRequest): Promise<{
  success: boolean;
  message: string;
  accounts: Array<{ username: string; role: string; name: string }>;
}> {
  const auth = await authCustomerServiceAdmin(req);

  await mongoSessionRun(async (session) => {
    await initCustomerServiceAccounts(session, auth.teamId, auth.tmbId);
  });

  return {
    success: true,
    message: '智能客服独立账号（采编员/审核员）初始化成功',
    accounts: [
      { username: 'editor', role: 'knowledgeEditor', name: '知识采编员' },
      { username: 'reviewer', role: 'knowledgeReviewer', name: '知识审核员' }
    ]
  };
}

export default NextAPI(handler);
