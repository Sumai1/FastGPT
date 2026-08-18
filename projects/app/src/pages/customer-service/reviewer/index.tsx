import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { useUserStore } from '@/web/support/user/useUserStore';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceProvider,
  useCustomerServiceContext,
  knowledgeTypeMap,
  audienceMap
} from '@/pageComponents/customerService/context';
import CustomerServiceHeader from '@/pageComponents/customerService/CustomerServiceHeader';
import CSAuthGuard from '@/pageComponents/customerService/CSAuthGuard';
import KnowledgeDiffViewer from '@/pageComponents/customerService/ReviewStudio/KnowledgeDiffViewer';
import AuditScopePreview from '@/pageComponents/customerService/ReviewStudio/AuditScopePreview';
import InlineTestSandbox from '@/pageComponents/customerService/ReviewStudio/InlineTestSandbox';
import RejectReasonModal from '@/pageComponents/customerService/ReviewStudio/RejectReasonModal';
import type { KnowledgeItem } from '@/pageComponents/customerService/types';

/**
 * 知识审核工作台核心内容
 */
const KnowledgeReviewerWorkspaceContent: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const { userInfo } = useUserStore();
  const { pendingKnowledge, saving, knowledgeAction, datasetNameMap, loading, canReviewKnowledge } =
    useCustomerServiceContext();

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const rejectDisclosure = useDisclosure();
  const [rejectingItem, setRejectingItem] = useState<KnowledgeItem>();

  const selectedKnowledge: KnowledgeItem | undefined =
    pendingKnowledge[selectedIndex] ?? pendingKnowledge[0];

  // Anti-self-review guard
  const isSubmitter =
    !!userInfo?.team?.tmbId &&
    !!selectedKnowledge?.submitterTmbId &&
    String(userInfo.team.tmbId) === String(selectedKnowledge.submitterTmbId);

  const handleOpenReject = (item: KnowledgeItem) => {
    setRejectingItem(item);
    rejectDisclosure.onOpen();
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingItem) return;
    await knowledgeAction('review', rejectingItem.id, 'reject', reason);
    rejectDisclosure.onClose();
    setRejectingItem(undefined);
  };

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>知识审核工作台 - 智能客服</title>
      </Head>

      {/* Top Header */}
      <CustomerServiceHeader currentRoute="reviewer" />

      <Box maxW="1600px" mx="auto" p={{ base: 4, md: 6, xl: 8 }}>
        <Stack spacing={5}>
          {/* Studio Header */}
          <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
            <Box>
              <Heading size="md" color="myGray.900">
                🔍 知识审核工作台 (Review Workspace)
              </Heading>
              <Text mt={1} color="myGray.500" fontSize="sm">
                执行严格的双人复核机制，对比新旧版本
                Diff、分析生效产品影响面，并在沙盒试问验证后正式发布。
              </Text>
            </Box>
            <HStack spacing={3}>
              <Badge
                colorScheme={pendingKnowledge.length > 0 ? 'orange' : 'green'}
                px={3.5}
                py={1.5}
                borderRadius="full"
                fontSize="sm"
              >
                待审核队列：{pendingKnowledge.length} 项
              </Badge>
            </HStack>
          </Flex>

          {loading ? (
            <Flex minH="360px" align="center" justify="center">
              <Spinner color="primary.600" size="lg" />
            </Flex>
          ) : pendingKnowledge.length === 0 ? (
            <Flex
              minH="360px"
              bg="white"
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="xl"
              align="center"
              justify="center"
              direction="column"
              p={8}
              textAlign="center"
            >
              <Heading size="sm" color="green.600">
                🎉 全部知识已审核完毕
              </Heading>
              <Text mt={2} color="myGray.500" fontSize="sm">
                当前待审核队列为空。采编人员提交新知识或修订版本后将自动进入此工作台。
              </Text>
            </Flex>
          ) : (
            <Flex gap={5} direction={{ base: 'column', lg: 'row' }} align="start">
              {/* Left Pending Queue Navigation (w: 320px) */}
              <Box
                w={{ base: '100%', lg: '320px' }}
                flexShrink={0}
                bg="white"
                borderWidth="1px"
                borderColor="myGray.200"
                borderRadius="xl"
                p={4}
              >
                <Flex justify="space-between" align="center" mb={3}>
                  <Text fontWeight="700" fontSize="sm" color="myGray.800">
                    待审知识清单
                  </Text>
                  <Badge colorScheme="orange" borderRadius="full">
                    {pendingKnowledge.length}
                  </Badge>
                </Flex>
                <Stack maxH="720px" overflowY="auto" spacing={2} pr={1}>
                  {pendingKnowledge.map((item, idx) => {
                    const isSelected = selectedKnowledge?.id === item.id;
                    const itemIsSelfSubmit =
                      !!userInfo?.team?.tmbId &&
                      !!item.submitterTmbId &&
                      String(userInfo.team.tmbId) === String(item.submitterTmbId);

                    return (
                      <Box
                        key={item.id}
                        p={3.5}
                        borderRadius="lg"
                        cursor="pointer"
                        bg={isSelected ? 'orange.50' : 'myGray.50'}
                        borderWidth="1px"
                        borderColor={isSelected ? 'orange.400' : 'transparent'}
                        onClick={() => setSelectedIndex(idx)}
                        _hover={{ bg: isSelected ? 'orange.50' : 'myGray.100' }}
                        transition="all 0.15s"
                      >
                        <Flex justify="space-between" align="center">
                          <Badge size="xs" colorScheme="purple">
                            {knowledgeTypeMap[item.knowledgeType]}
                          </Badge>
                          <Text fontSize="10px" color="myGray.500">
                            V{item.version}
                          </Text>
                        </Flex>
                        <Text
                          mt={1.5}
                          fontSize="xs"
                          fontWeight="600"
                          noOfLines={2}
                          color="myGray.800"
                        >
                          {item.title}
                        </Text>
                        <Flex
                          mt={2}
                          justify="space-between"
                          align="center"
                          fontSize="10px"
                          color="myGray.500"
                        >
                          <Text>{audienceMap[item.audienceLevel]}</Text>
                          {itemIsSelfSubmit ? (
                            <Badge colorScheme="red" size="xs">
                              本人提交
                            </Badge>
                          ) : (
                            <Text>{item.dataAmount} 段切片</Text>
                          )}
                        </Flex>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>

              {/* Right Main Review Canvas */}
              {selectedKnowledge && (
                <Box flex="1" minW={0}>
                  <Stack spacing={4}>
                    {/* Header Action Banner */}
                    <Box
                      bg="white"
                      borderWidth="1px"
                      borderColor="myGray.200"
                      borderRadius="xl"
                      p={5}
                    >
                      <Flex justify="space-between" align="start" gap={4} wrap="wrap">
                        <Box minW={0} flex="1">
                          <Heading size="md" noOfLines={2}>
                            {selectedKnowledge.title}
                          </Heading>
                          <Flex mt={2} gap={2} align="center" wrap="wrap">
                            <Badge colorScheme="orange">待审核 (Pending)</Badge>
                            <Badge variant="subtle">
                              {knowledgeTypeMap[selectedKnowledge.knowledgeType]}
                            </Badge>
                            <Badge colorScheme="purple">
                              {audienceMap[selectedKnowledge.audienceLevel]}
                            </Badge>
                            <Text fontSize="xs" color="myGray.500">
                              版本：V{selectedKnowledge.version} · 来源：
                              {selectedKnowledge.sourceName ||
                                datasetNameMap.get(selectedKnowledge.datasetId) ||
                                '知识库'}
                            </Text>
                          </Flex>
                        </Box>

                        {/* Action Buttons */}
                        {canReviewKnowledge && (
                          <HStack spacing={3}>
                            <Button
                              colorScheme="red"
                              variant="outline"
                              isLoading={saving}
                              onClick={() => handleOpenReject(selectedKnowledge)}
                            >
                              驳回修改
                            </Button>
                            {isSubmitter ? (
                              <Tooltip
                                label="您是该草稿提交人，禁止自审，请交由其他审核员审批"
                                hasArrow
                                placement="top"
                              >
                                <Button colorScheme="green" isDisabled={true}>
                                  通过并正式发布 (禁止自审)
                                </Button>
                              </Tooltip>
                            ) : (
                              <Button
                                colorScheme="green"
                                isLoading={saving}
                                onClick={() =>
                                  knowledgeAction('review', selectedKnowledge.id, 'publish')
                                }
                              >
                                通过并正式发布
                              </Button>
                            )}
                          </HStack>
                        )}
                      </Flex>

                      {/* Anti-Self-Review Warning Banner */}
                      {isSubmitter && (
                        <Alert status="warning" borderRadius="lg" mt={4}>
                          <AlertIcon />
                          <Box>
                            <AlertTitle fontSize="xs" fontWeight="700">
                              双人复核防自审限制：
                            </AlertTitle>
                            <AlertDescription fontSize="xs">
                              ⚠️ 双人复核原则：您是该草稿提交人，禁止自审，请交由其他审核员审批。
                            </AlertDescription>
                          </Box>
                        </Alert>
                      )}
                    </Box>

                    {/* Tabbed Review Inspectors */}
                    <Tabs variant="enclosed" colorScheme="blue">
                      <TabList
                        bg="white"
                        p={2}
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="myGray.200"
                      >
                        <Tab fontWeight="600" fontSize="sm">
                          新旧版本 Diff 对比
                        </Tab>
                        <Tab fontWeight="600" fontSize="sm">
                          发布影响面分析
                        </Tab>
                        <Tab fontWeight="600" fontSize="sm">
                          在线检索问答沙盒
                        </Tab>
                      </TabList>

                      <TabPanels mt={3}>
                        {/* Tab 1: Diff Viewer */}
                        <TabPanel p={0}>
                          <KnowledgeDiffViewer currentKnowledge={selectedKnowledge} />
                        </TabPanel>

                        {/* Tab 2: Audit Scope */}
                        <TabPanel p={0}>
                          <AuditScopePreview knowledge={selectedKnowledge} />
                        </TabPanel>

                        {/* Tab 3: Sandbox */}
                        <TabPanel p={0}>
                          <InlineTestSandbox knowledge={selectedKnowledge} />
                        </TabPanel>
                      </TabPanels>
                    </Tabs>
                  </Stack>
                </Box>
              )}
            </Flex>
          )}
        </Stack>
      </Box>

      {/* Reject Reason Modal */}
      <RejectReasonModal
        isOpen={rejectDisclosure.isOpen}
        onClose={rejectDisclosure.onClose}
        knowledge={rejectingItem}
        onConfirmReject={handleConfirmReject}
        isLoading={saving}
      />
    </Box>
  );
};

/**
 * 知识审核工作台主页面
 */
const KnowledgeReviewerPage = () => {
  return (
    <CSAuthGuard>
      <CustomerServiceProvider>
        <KnowledgeReviewerWorkspaceContent />
      </CustomerServiceProvider>
    </CSAuthGuard>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}

export default KnowledgeReviewerPage;
