import React from 'react';
import CustomerServiceChat from '@/pageComponents/customerService/CustomerServiceChat';
import { serviceSideProps } from '@/web/common/i18n/utils';

const CustomerServicePublicPage = ({ publicId }: { publicId: string }) => (
  <CustomerServiceChat access={{ type: 'public', publicId }} />
);

export default CustomerServicePublicPage;

export async function getServerSideProps(context: { query?: { projectCode?: string | string[] } }) {
  const publicId = typeof context.query?.projectCode === 'string' ? context.query.projectCode : '';

  return {
    props: {
      publicId,
      ...(await serviceSideProps(context, ['customer_service']))
    }
  };
}
