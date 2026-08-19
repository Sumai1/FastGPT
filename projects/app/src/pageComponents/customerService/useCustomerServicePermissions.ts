import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { GET } from '@/web/common/api/request';
import type { CustomerServiceAdminMeResponse } from '@fastgpt/global/openapi/customerService/api';

/**
 * 获取当前用户的客服业务角色与能力权限
 */
export const useCustomerServicePermissions = () => {
  const { data, loading } = useRequest<CustomerServiceAdminMeResponse, []>(
    () => GET<CustomerServiceAdminMeResponse>('/customer-service/admin/me'),
    {
      manual: false,
      errorToast: ''
    }
  );

  return {
    role: data?.role,
    isTeamOwner: data?.isTeamOwner ?? false,
    capabilities: data?.capabilities ?? {
      manageProjects: false,
      editKnowledge: false,
      reviewKnowledge: false,
      viewOperations: false,
      manageRoles: false
    },
    loading
  };
};
