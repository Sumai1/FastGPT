import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Badge, Box, Button, Flex, Heading, Select, Spinner, Stack, Text } from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceProvider,
  useCustomerServiceContext
} from '@/pageComponents/customerService/context';
import type { ConsoleSection } from '@/pageComponents/customerService/types';

import OverviewWorkspace from '@/pageComponents/customerService/OverviewWorkspace';
import AssistantsWorkspace from '@/pageComponents/customerService/AssistantsWorkspace';
import KnowledgeStudio from '@/pageComponents/customerService/KnowledgeStudio';
import ReviewStudio from '@/pageComponents/customerService/ReviewStudio';
import OperationsStudio from '@/pageComponents/customerService/OperationsStudio';
import ProductStudio from '@/pageComponents/customerService/ProductStudio';
import SettingsStudio from '@/pageComponents/customerService/SettingsStudio';
import KnowledgeCreateModal from '@/pageComponents/customerService/KnowledgeCreateModal';

/**
 * 智能客服管理运营控制台内部工作台内容路由
 */
const ConsoleContent: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    section,
    visibleSectionConfig,
    navigateSection,
    pendingKnowledge,
    loadData,
    loadOperations,
    operationPage,
    knowledgeCreateDisclosure,
    recoveringKnowledge,
    setRecoveringKnowledge,
    catalog,
    createKnowledge
  } = useCustomerServiceContext();

  const renderCurrentWorkspace = () => {
    switch (section) {
      case 'assistants':
        return <AssistantsWorkspace />;
      case 'knowledge':
        return <KnowledgeStudio />;
      case 'products':
        return <ProductStudio />;
      case 'operations':
        return <OperationsStudio />;
      case 'review':
        return <ReviewStudio />;
      case 'settings':
        return <SettingsStudio />;
      case 'overview':
      default:
        return <OverviewWorkspace />;
    }
  };

  return (
    <Flex h="100%" minH={0} bg="myGray.50">
      <Head>
        <title>智能客服管理控制台</title>
      </Head>

      {/* Left Navigation Sidebar */}
      <Box
        display={{ base: 'none', lg: 'block' }}
        w="240px"
        flexShrink={0}
        bg="white"
        borderRightWidth="1px"
        borderColor="myGray.200"
        px={4}
        py={6}
      >
        <Heading size="md" px={3}>
          智能客服
        </Heading>
        <Text px={3} mt={1} color="myGray.500" fontSize="xs">
          管理运营控制台
        </Text>

        <Stack mt={6} spacing={1}>
          {visibleSectionConfig.map((item) => {
            const active = section === item.key;
            return (
              <Flex
                key={item.key}
                p={3}
                borderRadius="lg"
                align="center"
                gap={3}
                cursor="pointer"
                bg={active ? 'primary.50' : 'transparent'}
                color={active ? 'primary.700' : 'myGray.700'}
                _hover={{ bg: active ? 'primary.50' : 'myGray.50' }}
                onClick={() => navigateSection(item.key)}
                transition="all 0.15s"
              >
                <MyIcon name={item.icon} w={5} />
                <Box minW={0} flex="1">
                  <Text fontWeight={active ? '700' : '500'} fontSize="sm">
                    {item.label}
                  </Text>
                  <Text fontSize="10px" color="myGray.500" noOfLines={1}>
                    {item.description}
                  </Text>
                </Box>
                {item.key === 'review' && pendingKnowledge.length > 0 && (
                  <Badge colorScheme="orange" borderRadius="full" size="sm">
                    {pendingKnowledge.length}
                  </Badge>
                )}
              </Flex>
            );
          })}
        </Stack>
      </Box>

      {/* Main Right Content Canvas */}
      <Flex flex="1" minW={0} minH={0} direction="column">
        {/* Top Header Bar */}
        <Flex
          bg="white"
          px={{ base: 4, lg: 8 }}
          py={3.5}
          borderBottomWidth="1px"
          borderColor="myGray.200"
          align="center"
          justify="space-between"
          gap={3}
        >
          {/* Mobile Section Selector */}
          <Select
            display={{ base: 'block', lg: 'none' }}
            maxW="180px"
            size="sm"
            value={section}
            onChange={(event) => navigateSection(event.target.value as ConsoleSection)}
          >
            {visibleSectionConfig.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>

          {/* Desktop Title Breadcrumb */}
          <Box display={{ base: 'none', lg: 'block' }}>
            <Heading size="sm" color="myGray.800">
              {visibleSectionConfig.find((item) => item.key === section)?.label}
            </Heading>
          </Box>

          <Flex gap={2.5}>
            <Button
              size="sm"
              variant="whiteBase"
              onClick={() => {
                void (async () => {
                  await loadData();
                  if (section === 'operations') {
                    await loadOperations(operationPage);
                  }
                })();
              }}
            >
              刷新数据
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => void router.push('/customer-service')}
            >
              打开客服终端
            </Button>
          </Flex>
        </Flex>

        {/* Workspace Body */}
        <Box flex="1" minH={0} overflowY="auto" p={{ base: 4, md: 6, xl: 8 }}>
          {loading ? (
            <Flex minH="400px" align="center" justify="center">
              <Spinner size="lg" color="primary.600" />
            </Flex>
          ) : (
            renderCurrentWorkspace()
          )}
        </Box>
      </Flex>

      {/* Common Knowledge Upload / Recovery Modal */}
      <KnowledgeCreateModal
        key={recoveringKnowledge?.collectionId ?? 'new-knowledge'}
        isOpen={knowledgeCreateDisclosure.isOpen}
        catalog={catalog}
        initialSource={
          recoveringKnowledge
            ? {
                dataset: {
                  datasetId: recoveringKnowledge.datasetId,
                  name: recoveringKnowledge.datasetName,
                  avatar: recoveringKnowledge.datasetAvatar,
                  vectorModel: { model: recoveringKnowledge.vectorModel }
                },
                collection: {
                  id: recoveringKnowledge.collectionId,
                  name: recoveringKnowledge.name,
                  avatar: '/imgs/workflow/db.png'
                }
              }
            : undefined
        }
        onClose={() => {
          setRecoveringKnowledge(undefined);
          knowledgeCreateDisclosure.onClose();
        }}
        onCreate={createKnowledge}
      />
    </Flex>
  );
};

/**
 * 智能客服控制台主页面（精简为状态 Provider 与路由壳）
 */
const CustomerServiceConsolePage = () => {
  return (
    <CustomerServiceProvider>
      <ConsoleContent />
    </CustomerServiceProvider>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}

export default CustomerServiceConsolePage;
