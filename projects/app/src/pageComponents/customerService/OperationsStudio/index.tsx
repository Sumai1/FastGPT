import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { CustomerServiceChatStatusEnum } from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext, statusMap } from '../context';
import type { KnowledgeDraftSource, OperationItem } from '../types';
import BadcaseClusteringList from './BadcaseClusteringList';
import HandoffReasonChart from './HandoffReasonChart';
import MetricsTrendCards from './MetricsTrendCards';
import OneClickToDraftModal from './OneClickToDraftModal';

export const OperationsStudio: React.FC = () => {
  const router = useRouter();
  const {
    operations,
    operationLoading,
    operationPage,
    loadOperations,
    operationFeedback,
    setOperationFeedback,
    operationProjectId,
    setOperationProjectId,
    operationSeriesId,
    setOperationSeriesId,
    operationModelId,
    setOperationModelId,
    operationResultStatus,
    setOperationResultStatus,
    operationKeyword,
    setOperationKeyword,
    catalog,
    projectData,
    currentMember,
    todoCounts
  } = useCustomerServiceContext();

  const [tabIndex, setTabIndex] = useState(0);
  const draftModalDisclosure = useDisclosure();
  const [selectedDraftSource, setSelectedDraftSource] = useState<KnowledgeDraftSource>();

  const handleOpenDraft = (item: OperationItem) => {
    setSelectedDraftSource({
      id: item.id,
      question: item.question,
      answer: item.answer,
      modelId: item.modelId
    });
    draftModalDisclosure.onOpen();
  };

  return (
    <Stack spacing={5}>
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading size="md">对话运营与质量分析中心 (Operations Studio)</Heading>
          <Text mt={1} color="myGray.500" fontSize="sm">
            全维度检索会话日志、分析转人工/未解决归因，并将 Bad Case 一键沉淀为标准知识草稿。
          </Text>
        </Box>
        <HStack spacing={2}>
          <Badge colorScheme="orange" p={1.5} borderRadius="md">
            待处理未解决: {todoCounts.unresolved}
          </Badge>
          <Badge colorScheme="red" p={1.5} borderRadius="md">
            待跟进人工: {todoCounts.human}
          </Badge>
        </HStack>
      </Flex>

      {/* Tabs */}
      <Tabs index={tabIndex} onChange={setTabIndex} colorScheme="blue" variant="enclosed">
        <TabList>
          <Tab fontSize="sm" fontWeight="600">
            📊 运营效能与归因看板
          </Tab>
          <Tab fontSize="sm" fontWeight="600">
            💬 全量会话日志与 Badcase ({operations.total})
          </Tab>
        </TabList>

        <TabPanels>
          {/* Tab 1: Metrics & AI Clustering Insights */}
          <TabPanel px={0} pt={4}>
            <Stack spacing={6}>
              <MetricsTrendCards />
              <HandoffReasonChart
                onSelectCategory={(kw) => {
                  setOperationKeyword(kw);
                  setTabIndex(1);
                  void loadOperations(1);
                }}
              />
              <BadcaseClusteringList onConvertToDraft={handleOpenDraft} />
            </Stack>
          </TabPanel>

          {/* Tab 2: Full Log Stream & Filtering */}
          <TabPanel px={0} pt={4}>
            <Stack spacing={4}>
              {/* Filter Bar */}
              <Flex
                p={4}
                bg="white"
                borderWidth="1px"
                borderColor="myGray.200"
                borderRadius="xl"
                gap={3}
                wrap="wrap"
                align="center"
              >
                <FormControl maxW={{ base: '100%', sm: '160px' }}>
                  <Select
                    size="sm"
                    value={operationProjectId}
                    onChange={(e) => setOperationProjectId(e.target.value)}
                  >
                    <option value="">全部客服项目</option>
                    {projectData.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl maxW={{ base: '100%', sm: '140px' }}>
                  <Select
                    size="sm"
                    value={operationModelId}
                    onChange={(e) => setOperationModelId(e.target.value)}
                  >
                    <option value="">全部产品型号</option>
                    {catalog.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl maxW={{ base: '100%', sm: '130px' }}>
                  <Select
                    size="sm"
                    value={operationFeedback}
                    onChange={(e) => setOperationFeedback(e.target.value)}
                  >
                    <option value="">全部反馈状态</option>
                    <option value="good">满意 (点赞)</option>
                    <option value="bad">不满意 (点踩)</option>
                    <option value="unresolved">问题未解决</option>
                  </Select>
                </FormControl>

                <FormControl maxW={{ base: '100%', sm: '130px' }}>
                  <Select
                    size="sm"
                    value={operationResultStatus}
                    onChange={(e) => setOperationResultStatus(e.target.value)}
                  >
                    <option value="">全部结果状态</option>
                    <option value={CustomerServiceChatStatusEnum.answered}>已回答</option>
                    <option value={CustomerServiceChatStatusEnum.humanRequired}>已转人工</option>
                    <option value={CustomerServiceChatStatusEnum.clarificationRequired}>
                      需追问补充
                    </option>
                  </Select>
                </FormControl>

                <FormControl maxW={{ base: '100%', sm: '200px' }}>
                  <Input
                    size="sm"
                    placeholder="按关键词、问题搜索..."
                    value={operationKeyword}
                    onChange={(e) => setOperationKeyword(e.target.value)}
                  />
                </FormControl>

                <Button
                  size="sm"
                  colorScheme="blue"
                  isLoading={operationLoading}
                  onClick={() => void loadOperations(1)}
                >
                  查询
                </Button>
              </Flex>

              {/* Operations List */}
              {operationLoading && operations.list.length === 0 ? (
                <Flex minH="240px" justify="center" align="center">
                  <Spinner />
                </Flex>
              ) : operations.list.length === 0 ? (
                <Flex
                  minH="240px"
                  bg="white"
                  borderWidth="1px"
                  borderColor="myGray.200"
                  borderRadius="xl"
                  align="center"
                  justify="center"
                  direction="column"
                  p={8}
                >
                  <Heading size="sm">暂无符合条件的对话日志</Heading>
                  <Text mt={1} color="myGray.500" fontSize="sm">
                    可通过调整上方筛选条件再次查询。
                  </Text>
                </Flex>
              ) : (
                <Stack spacing={4}>
                  {operations.list.map((item) => (
                    <Box
                      key={item.id}
                      bg="white"
                      borderWidth="1px"
                      borderColor="myGray.200"
                      borderRadius="xl"
                      p={5}
                    >
                      <Flex justify="space-between" gap={3} wrap="wrap" align="center">
                        <Flex gap={2} wrap="wrap" align="center">
                          <Badge colorScheme="blue">{item.projectName}</Badge>
                          {item.modelName && <Badge variant="subtle">{item.modelName}</Badge>}
                          <Badge
                            colorScheme={
                              item.feedback === 'good'
                                ? 'green'
                                : item.feedback === 'none'
                                  ? 'gray'
                                  : 'orange'
                            }
                          >
                            {item.feedback === 'unresolved'
                              ? '未解决'
                              : item.feedback === 'bad'
                                ? '不满意'
                                : item.feedback === 'good'
                                  ? '满意'
                                  : '未反馈'}
                          </Badge>
                          {item.lowConfidence && <Badge colorScheme="red">低置信度</Badge>}
                          <Badge variant="outline">
                            {item.resultStatus === CustomerServiceChatStatusEnum.answered
                              ? '已回答'
                              : item.resultStatus === CustomerServiceChatStatusEnum.humanRequired
                                ? '已转人工'
                                : item.resultStatus ===
                                    CustomerServiceChatStatusEnum.clarificationRequired
                                  ? '需补充资料'
                                  : '处理状态未知'}
                          </Badge>
                        </Flex>
                        <Text fontSize="xs" color="myGray.500">
                          {new Date(item.createTime).toLocaleString()}
                        </Text>
                      </Flex>

                      {/* Question */}
                      <Box mt={3}>
                        <Text fontSize="xs" color="myGray.500">
                          客户提问：
                        </Text>
                        <Text mt={0.5} fontWeight="700" fontSize="sm" color="myGray.800">
                          {item.question || '未记录问题正文'}
                        </Text>
                      </Box>

                      {/* Answer */}
                      <Box mt={2.5} p={3.5} bg="myGray.50" borderRadius="lg">
                        <Text fontSize="xs" color="myGray.500">
                          智能客服回答：
                        </Text>
                        <Text
                          mt={1}
                          fontSize="xs"
                          whiteSpace="pre-wrap"
                          noOfLines={5}
                          color="myGray.700"
                        >
                          {item.answer || '未生成回答'}
                        </Text>
                      </Box>

                      {/* Metrics & Citations */}
                      <Flex mt={3} gap={4} wrap="wrap" color="myGray.500" fontSize="xs">
                        <Text>引用 {item.citationCount} 条知识</Text>
                        <Text>耗时 {item.durationSeconds?.toFixed(1) ?? '-'} 秒</Text>
                        <Text>Token {item.tokens}</Text>
                        <Text>积分 {item.points?.toFixed(2)}</Text>
                      </Flex>

                      {item.humanReason && (
                        <Text mt={2} color="orange.700" fontSize="xs" fontWeight="600">
                          转人工原因：{item.humanReason}
                        </Text>
                      )}

                      {item.citations.length > 0 && (
                        <Text mt={1.5} color="myGray.500" fontSize="xs" noOfLines={1}>
                          命中来源：{item.citations.map((c) => c.sourceName).join('、')}
                        </Text>
                      )}

                      {/* Actions */}
                      <Flex mt={4} gap={2}>
                        {currentMember?.capabilities.editKnowledge && (
                          <Button
                            size="sm"
                            colorScheme="purple"
                            variant="outline"
                            onClick={() => handleOpenDraft(item)}
                          >
                            一键转知识草稿
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="whiteBase"
                          onClick={() => {
                            const project = projectData.projects.find(
                              (p) => p.id === item.projectId
                            );
                            if (project?.appId) {
                              void router.push(
                                `/app/detail?appId=${project.appId}&currentTab=logs`
                              );
                            }
                          }}
                        >
                          查看底层日志
                        </Button>
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              )}

              {/* Pagination */}
              {operations.total > 20 && (
                <Flex justify="center" align="center" gap={3} py={4}>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    isDisabled={operationPage <= 1}
                    onClick={() => void loadOperations(operationPage - 1)}
                  >
                    上一页
                  </Button>
                  <Text fontSize="xs" color="myGray.500">
                    第 {operationPage} / {Math.ceil(operations.total / 20)} 页
                  </Text>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    isDisabled={operationPage * 20 >= operations.total}
                    onClick={() => void loadOperations(operationPage + 1)}
                  >
                    下一页
                  </Button>
                </Flex>
              )}
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* One-Click to Draft Modal */}
      <OneClickToDraftModal
        isOpen={draftModalDisclosure.isOpen}
        onClose={draftModalDisclosure.onClose}
        draftItem={selectedDraftSource}
      />
    </Stack>
  );
};

export default OperationsStudio;
