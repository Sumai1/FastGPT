import { serviceSideProps } from '@/web/common/i18n/utils';
import React, { useEffect } from 'react';
import Loading from '@fastgpt/web/components/common/MyLoading';
import { useRouter } from 'next/router';

import { useCustomerServicePermissions } from '@/pageComponents/customerService/useCustomerServicePermissions';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';

const Index = () => {
  const router = useRouter();
  const { role, isTeamOwner, capabilities, loading } = useCustomerServicePermissions();

  const isAdmin =
    isTeamOwner ||
    role === CustomerServiceMemberRoleEnum.customerServiceAdmin ||
    capabilities.manageProjects;

  useEffect(() => {
    if (loading) return;

    if (!isAdmin) {
      if (role === CustomerServiceMemberRoleEnum.knowledgeReviewer) {
        void router.replace('/dataset/reviewer');
        return;
      }
      if (role === CustomerServiceMemberRoleEnum.knowledgeEditor) {
        void router.replace('/dataset/list');
        return;
      }
    }

    void router.replace('/dashboard/agent');
  }, [router, role, isAdmin, loading]);

  return <Loading />;
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content))
    }
  };
}
export default Index;
