import React from 'react';
import { useRouter } from 'next/router';
import CustomerServiceChat from '@/pageComponents/customerService/CustomerServiceChat';
import { serviceSideProps } from '@/web/common/i18n/utils';

/** 登录态客服测试入口；正式客户地址使用 `/customer-service/chat/{projectCode}`。 */
const CustomerServiceTestPage = () => {
  const router = useRouter();
  const initialProjectId =
    typeof router.query.projectId === 'string' ? router.query.projectId : undefined;

  return <CustomerServiceChat access={{ type: 'internal', initialProjectId }} />;
};

export default CustomerServiceTestPage;

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['customer_service']))
    }
  };
}
