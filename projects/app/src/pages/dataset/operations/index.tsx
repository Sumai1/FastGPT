import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Button, Flex, Heading, HStack } from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyBox from '@fastgpt/web/components/common/MyBox';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceProvider,
  useCustomerServiceContext
} from '@/pageComponents/customerService/context';
import OperationsStudio from '@/pageComponents/customerService/OperationsStudio';

const OperationsManagementContent: React.FC = () => {
  const router = useRouter();
  const { loading, effectiveCapabilities } = useCustomerServiceContext();

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>对话运营与质量分析 - FastGPT 企业知识库</title>
      </Head>

      {/* Top Breadcrumb Bar */}
      <Flex
        bg="white"
        px={6}
        py={3.5}
        borderBottomWidth="1px"
        borderColor="myGray.200"
        align="center"
        justify="space-between"
        shadow="xs"
      >
        <HStack spacing={3}>
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<ArrowBackIcon />}
            onClick={() => void router.push('/dataset/list')}
          >
            返回知识库
          </Button>
          <Box h="16px" w="1px" bg="myGray.300" />
          <HStack spacing={2}>
            <MyIcon name="core/app/logsLight" w="16px" color="primary.600" />
            <Heading size="sm" color="myGray.800">
              对话运营与质量分析中心
            </Heading>
          </HStack>
        </HStack>

        <HStack spacing={2}>
          {effectiveCapabilities.reviewKnowledge && (
            <Button
              size="sm"
              variant="whiteBase"
              leftIcon={<MyIcon name="common/check" w="14px" />}
              onClick={() => void router.push('/dataset/reviewer')}
            >
              知识审核台
            </Button>
          )}
          {effectiveCapabilities.manageProjects && (
            <Button
              size="sm"
              variant="whiteBase"
              leftIcon={<MyIcon name="common/list" w="14px" />}
              onClick={() => void router.push('/dataset/product')}
            >
              产品管理
            </Button>
          )}
        </HStack>
      </Flex>

      {/* Main Studio View */}
      <MyBox isLoading={loading} p={[4, 6]} maxW="1600px" mx="auto">
        <OperationsStudio />
      </MyBox>
    </Box>
  );
};

const OperationsManagementPage = () => (
  <CustomerServiceProvider>
    <OperationsManagementContent />
  </CustomerServiceProvider>
);

export async function getServerSideProps(context: unknown) {
  return { props: { ...(await serviceSideProps(context, ['common', 'customer_service'])) } };
}

export default OperationsManagementPage;
