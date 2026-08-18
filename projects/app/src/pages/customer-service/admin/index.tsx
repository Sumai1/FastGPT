import React, { useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceProvider,
  useCustomerServiceContext
} from '@/pageComponents/customerService/context';
import CustomerServiceHeader from '@/pageComponents/customerService/CustomerServiceHeader';

import AssistantsWorkspace from '@/pageComponents/customerService/AssistantsWorkspace';
import ProductStudio from '@/pageComponents/customerService/ProductStudio';
import SettingsStudio from '@/pageComponents/customerService/SettingsStudio';
import OperationsStudio from '@/pageComponents/customerService/OperationsStudio';
import KnowledgeStudio from '@/pageComponents/customerService/KnowledgeStudio';

import ProductCreateModal from '@/pageComponents/customerService/ProductCreateModal';
import KnowledgeCreateModal from '@/pageComponents/customerService/KnowledgeCreateModal';
import OneClickToDraftModal from '@/pageComponents/customerService/OperationsStudio/OneClickToDraftModal';

const AdminConsoleContent: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    catalog,
    projectData,
    knowledge,
    pendingKnowledge,
    unsyncedProjects,
    productCreateDisclosure,
    knowledgeCreateDisclosure,
    knowledgeDraftDisclosure,
    draftOperation,
    setDraftOperation,
    recoveringKnowledge,
    setRecoveringKnowledge,
    createProduct,
    createKnowledge
  } = useCustomerServiceContext();

  const tabQuery = (router.query.tab as string) || 'projects';

  const tabIndex = useMemo(() => {
    switch (tabQuery) {
      case 'products':
        return 1;
      case 'keys':
        return 2;
      case 'operations':
        return 3;
      case 'knowledge':
        return 4;
      case 'projects':
      default:
        return 0;
    }
  }, [tabQuery]);

  const handleTabChange = (index: number) => {
    const keys = ['projects', 'products', 'keys', 'operations', 'knowledge'];
    const nextTab = keys[index] || 'projects';
    void router.replace(
      { pathname: '/customer-service/admin', query: { tab: nextTab } },
      undefined,
      { shallow: true }
    );
  };

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>管理员全景控制台 - 智能客服</title>
      </Head>

      {/* Top Header */}
      <CustomerServiceHeader currentRoute="admin" />

      <Box maxW="1600px" mx="auto" p={{ base: 4, md: 6, xl: 8 }}>
        <Stack spacing={6}>
          {/* Header Banner */}
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
            <Box>
              <Heading size="md" color="myGray.900">
                🛡️ 管理员全景控制台 (Administrator Console)
              </Heading>
              <Text mt={1} color="myGray.500" fontSize="sm">
                智能客服工程化编排枢纽：项目交付、4级拓扑树、Key绑定与限流、对话运营监控与应急治理。
              </Text>
            </Box>
          </Flex>

          {/* Admin Tabs */}
          <Tabs index={tabIndex} onChange={handleTabChange} variant="enclosed" colorScheme="blue">
            <TabList
              bg="white"
              p={2}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="myGray.200"
              overflowX="auto"
            >
              <Tab fontWeight="600" fontSize="sm">
                <HStack spacing={2}>
                  <MyIcon name="core/chat/chatLight" w={4} />
                  <Text>项目编排与交付</Text>
                  <Badge colorScheme="blue" borderRadius="full">
                    {projectData.projects.length}
                  </Badge>
                  {unsyncedProjects.length > 0 && (
                    <Badge colorScheme="orange" borderRadius="full">
                      待同步 {unsyncedProjects.length}
                    </Badge>
                  )}
                </HStack>
              </Tab>

              <Tab fontWeight="600" fontSize="sm">
                <HStack spacing={2}>
                  <MyIcon name="common/list" w={4} />
                  <Text>产品4级拓扑树</Text>
                  <Badge colorScheme="purple" borderRadius="full">
                    {catalog.models.length} 型号
                  </Badge>
                </HStack>
              </Tab>

              <Tab fontWeight="600" fontSize="sm">
                <HStack spacing={2}>
                  <MyIcon name="support/config/configLight" w={4} />
                  <Text>OpenAPI 凭证与配额</Text>
                  <Badge colorScheme="gray" borderRadius="full">
                    {projectData.keyBindings.length}
                  </Badge>
                </HStack>
              </Tab>

              <Tab fontWeight="600" fontSize="sm">
                <HStack spacing={2}>
                  <MyIcon name="core/app/logsLight" w={4} />
                  <Text>对话运营与 Badcase 聚类</Text>
                </HStack>
              </Tab>

              <Tab fontWeight="600" fontSize="sm">
                <HStack spacing={2}>
                  <MyIcon name="core/dataset/datasetLight" w={4} />
                  <Text>知识全生命周期与应急下架</Text>
                  <Badge colorScheme="green" borderRadius="full">
                    {knowledge.length}
                  </Badge>
                  {pendingKnowledge.length > 0 && (
                    <Badge colorScheme="orange" borderRadius="full">
                      待审 {pendingKnowledge.length}
                    </Badge>
                  )}
                </HStack>
              </Tab>
            </TabList>

            <TabPanels mt={4}>
              {loading ? (
                <Flex minH="400px" align="center" justify="center">
                  <Spinner size="lg" color="primary.600" />
                </Flex>
              ) : (
                <>
                  {/* Tab 1: Assistants Workspace */}
                  <TabPanel p={0}>
                    <AssistantsWorkspace />
                  </TabPanel>

                  {/* Tab 2: Product Studio */}
                  <TabPanel p={0}>
                    <ProductStudio />
                  </TabPanel>

                  {/* Tab 3: Settings Studio */}
                  <TabPanel p={0}>
                    <SettingsStudio />
                  </TabPanel>

                  {/* Tab 4: Operations Studio */}
                  <TabPanel p={0}>
                    <OperationsStudio />
                  </TabPanel>

                  {/* Tab 5: Knowledge Studio (Full Governance) */}
                  <TabPanel p={0}>
                    <KnowledgeStudio />
                  </TabPanel>
                </>
              )}
            </TabPanels>
          </Tabs>
        </Stack>
      </Box>

      {/* Global Admin Modals */}
      <ProductCreateModal
        isOpen={productCreateDisclosure.isOpen}
        catalog={catalog}
        onClose={productCreateDisclosure.onClose}
        onCreate={createProduct}
      />

      <KnowledgeCreateModal
        key={recoveringKnowledge?.collectionId ?? 'admin-new-knowledge'}
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

      <OneClickToDraftModal
        isOpen={knowledgeDraftDisclosure.isOpen}
        onClose={() => {
          setDraftOperation(undefined);
          knowledgeDraftDisclosure.onClose();
        }}
        draftItem={draftOperation}
      />
    </Box>
  );
};

/**
 * 客服管理员控制台主页面
 */
const CustomerServiceAdminPage = () => {
  return (
    <CustomerServiceProvider>
      <AdminConsoleContent />
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

export default CustomerServiceAdminPage;
