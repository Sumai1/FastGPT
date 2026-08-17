import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
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
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { CustomerServiceChatStatusEnum } from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext } from '../context';
import type { KnowledgeDraftSource, OperationItem } from '../types';
import MetricsTrendCards from './MetricsTrendCards';
import HandoffReasonChart from './HandoffReasonChart';
import BadcaseClusteringList from './BadcaseClusteringList';
import OneClickToDraftModal from './OneClickToDraftModal';

export const OperationsStudio: React.FC = () => {
  const router = useRouter();
  const {
    operations,
    frequentQuestions,
    operationLoading,
    operationPage,
    loadOperations,
    operationKeyword,
    setOperationKeyword,
    operationProjectId,
    setOperationProjectId,
    operationSeriesId,
    setOperationSeriesId,
    operationModelId,
    setOperationModelId,
    operationFeedback,
    setOperationFeedback,
    operationResultStatus,
    setOperationResultStatus,
    operationStartTime,
    setOperationStartTime,
    operationEndTime,
    setOperationEndTime,
    projectData,
    catalog,
    currentMember
  } = useCustomerServiceContext();

  const draftModalDisclosure = useDisclosure();
  const [selectedDraftSource, setSelectedDraftSource] = useState<KnowledgeDraftSource>();

  const handleOpenDraft = (item: KnowledgeDraftSource) => {
    setSelectedDraftSource({
      id: item.id,
      question: item.question || '',
      answer: item.answer || '',
      modelId: item.modelId || undefined
    });
    draftModalDisclosure.onOpen();
  };

  const handleCategorySelect = (categoryName: string) => {
    setOperationKeyword(categoryName);
    void loadOperations(1);
  };

  return (
    <Stack spacing={6}>
      {/* Studio Header */}
      <Box>
        <Heading size="md">对话运营与 Badcase 聚类中心 (Operations Studio)</Heading>
        <Text mt={1} color="myGray.500" fontSize="sm">
          集中查看客服问答效果、Token 与算力消耗、转人工归因分析，并将未解决问题闭环沉淀为知识草稿。
        </Text>
      </Box>

      {/* Top 1: Performance & Resource Trend Cards */}
      <MetricsTrendCards />

      {/* Top 2: Attribution Breakdown Chart */}
      <HandoffReasonChart onSelectCategory={handleCategorySelect} />

      {/* Main Tabbed Operations Workbenches */}
      <Tabs variant="enclosed" colorScheme="blue">
        <TabList bg="white" p={2} borderRadius="xl" borderWidth="1px" borderColor="myGray.200">
          <Tab fontWeight="600" fontSize="sm">
            Badcase 聚类分析 (AI 聚类)
          </Tab>
          <Tab fontWeight="600" fontSize="sm">
            高频问题榜单 ({frequentQuestions.list.length})
          </Tab>
          <Tab fontWeight="600" fontSize="sm">
            全部问答日志明细 ({operations.total})
          </Tab>
        </TabList>

        <TabPanels mt={3}>
          {/* Panel 1: Badcase Clustering */}
          <TabPanel p={0}>
            <BadcaseClusteringList onConvertToDraft={handleOpenDraft} />
          </TabPanel>

          {/* Panel 2: Frequent Questions */}
          <TabPanel p={0}>
            <Box bg="white" p={5} borderWidth="1px" borderColor="myGray.200" borderRadius="xl">
              <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
                <Box>
                  <Heading size="sm">高频热点问题排行榜</Heading>
                  <Text mt={1} color="myGray.500" fontSize="xs">
                    按最近 30 天重复提问次数排序；建议优先沉淀为高频 FAQ 知识。
                  </Text>
                </Box>
                <Badge colorScheme="purple">前 {frequentQuestions.list.length} 项</Badge>
              </Flex>

              {frequentQuestions.list.length === 0 ? (
                <Text color="myGray.500" fontSize="sm" py={8} textAlign="center">
                  暂无达到最少出现 2 次的高频问题。
                </Text>
              ) : (
                <Stack spacing={3}>
                  {frequentQuestions.list.map((item) => (
                    <Box
                      key={`${item.projectId}-${item.modelId ?? 'all'}-${item.question}`}
                      p={4}
                      bg="myGray.50"
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor="myGray.200"
                    >
                      <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                        <Box minW={0} flex="1">
                          <Text fontWeight="700" fontSize="sm" color="myGray.800">
                            {item.question}
                          </Text>
                          <Flex mt={2} gap={2} wrap="wrap" align="center">
                            <Badge colorScheme="purple">提问 {item.count} 次</Badge>
                            {item.modelName && <Badge variant="subtle">{item.modelName}</Badge>}
                            {item.unresolvedCount > 0 && (
                              <Badge colorScheme="orange">未解决 {item.unresolvedCount}</Badge>
                            )}
                            {item.clarificationRequiredCount > 0 && (
                              <Badge colorScheme="yellow">
                                资料不足 {item.clarificationRequiredCount}
                              </Badge>
                            )}
                            {item.humanRequiredCount > 0 && (
                              <Badge colorScheme="red">转人工 {item.humanRequiredCount}</Badge>
                            )}
                          </Flex>
                        </Box>

                        <HStack spacing={2}>
                          {currentMember?.capabilities.editKnowledge && (
                            <Button
                              size="xs"
                              colorScheme="purple"
                              onClick={() =>
                                handleOpenDraft({
                                  id: item.requestRecordId,
                                  question: item.question,
                                  answer: item.answer,
                                  modelId: item.modelId
                                })
                              }
                            >
                              转为知识草稿
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => {
                              setOperationKeyword(item.question);
                              void loadOperations(1);
                            }}
                          >
                            查看相关对话
                          </Button>
                        </HStack>
                      </Flex>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </TabPanel>

          {/* Panel 3: All Dialogue Logs & Filter */}
          <TabPanel p={0}>
            <Stack spacing={4}>
              {/* Filter Bar */}
              <Flex
                bg="white"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                borderColor="myGray.200"
                gap={3}
                wrap="wrap"
              >
                <Input
                  maxW={{ base: '100%', md: '300px' }}
                  value={operationKeyword}
                  onChange={(e) => setOperationKeyword(e.target.value)}
                  placeholder="搜索问题或回答正文"
                  onKeyDown={(e) => e.key === 'Enter' && void loadOperations(1)}
                />
                <Select
                  maxW={{ base: '100%', md: '180px' }}
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
                <Select
                  maxW={{ base: '100%', md: '160px' }}
                  value={operationSeriesId}
                  onChange={(e) => {
                    setOperationSeriesId(e.target.value);
                    setOperationModelId('');
                  }}
                >
                  <option value="">全部产品系列</option>
                  {catalog.series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select
                  maxW={{ base: '100%', md: '160px' }}
                  value={operationModelId}
                  onChange={(e) => setOperationModelId(e.target.value)}
                >
                  <option value="">全部产品型号</option>
                  {catalog.models
                    .filter((m) => !operationSeriesId || m.seriesId === operationSeriesId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </Select>
                <Select
                  maxW={{ base: '100%', md: '140px' }}
                  value={operationFeedback}
                  onChange={(e) => setOperationFeedback(e.target.value)}
                >
                  <option value="">全部反馈</option>
                  <option value="unresolved">未解决</option>
                  <option value="bad">不满意</option>
                  <option value="good">满意</option>
                  <option value="none">未反馈</option>
                </Select>
                <Select
                  maxW={{ base: '100%', md: '150px' }}
                  value={operationResultStatus}
                  onChange={(e) => setOperationResultStatus(e.target.value)}
                >
                  <option value="">全部回答状态</option>
                  <option value={CustomerServiceChatStatusEnum.answered}>已回答</option>
                  <option value={CustomerServiceChatStatusEnum.clarificationRequired}>
                    无答案/需补充
                  </option>
                  <option value={CustomerServiceChatStatusEnum.humanRequired}>已转人工</option>
                </Select>
                <Input
                  type="date"
                  maxW={{ base: '100%', md: '140px' }}
                  value={operationStartTime}
                  aria-label="开始日期"
                  onChange={(e) => setOperationStartTime(e.target.value)}
                />
                <Input
                  type="date"
                  maxW={{ base: '100%', md: '140px' }}
                  value={operationEndTime}
                  aria-label="结束日期"
                  onChange={(e) => setOperationEndTime(e.target.value)}
                />
                <Button
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
                          onClick={() =>
                            void router.push(
                              `/app/detail?appId=${projectData.projects.find((p) => p.id === item.projectId)?.appId}&currentTab=logs`
                            )
                          }
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
