import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';

/**
 * 岗位中心已全面归入 FastGPT 原生团队成员管理体系 (/account/team)
 */
const CustomerServiceRolesRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/account/team');
  }, [router]);

  return (
    <Center minH="100vh" bg="myGray.50">
      <VStack spacing={3}>
        <Spinner color="primary.500" size="lg" />
        <Text fontSize="sm" color="myGray.600">
          正在跳转至原生团队成员管理中心...
        </Text>
      </VStack>
    </Center>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['account', 'account_team', 'user']))
    }
  };
}

export default CustomerServiceRolesRedirect;
