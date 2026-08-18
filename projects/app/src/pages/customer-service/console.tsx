import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';

/**
 * 客服工作台大厅已全面拆解并融入 FastGPT 原生根页面（知识库 /dataset/list、采编 /dataset/editor、团队 /account/team）
 */
const CustomerServiceConsoleRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/dataset/list');
  }, [router]);

  return (
    <Center minH="100vh" bg="myGray.50">
      <VStack spacing={3}>
        <Spinner color="primary.500" size="lg" />
        <Text fontSize="sm" color="myGray.600">
          正在跳转至知识库总览与工作台...
        </Text>
      </VStack>
    </Center>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}

export default CustomerServiceConsoleRedirect;
