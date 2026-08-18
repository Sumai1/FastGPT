import React, { useMemo, useState } from 'react';
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
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Progress,
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
  Textarea,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceAdminKnowledgeTestSearchResponse } from '@fastgpt/global/openapi/customerService/api';
import {
  CustomerServiceProvider,
  useCustomerServiceContext,
  statusMap,
  knowledgeTypeMap,
  audienceMap,
  requestAdminApi
} from '@/pageComponents/customerService/context';
import CustomerServiceHeader from '@/pageComponents/customerService/CustomerServiceHeader';
import ProductMasterForm from '@/pageComponents/customerService/KnowledgeStudio/ProductMasterForm';
import ManualForm from '@/pageComponents/customerService/KnowledgeStudio/ManualForm';
import FaqBatchEditor from '@/pageComponents/customerService/KnowledgeStudio/FaqBatchEditor';
import FaultCardForm from '@/pageComponents/customerService/KnowledgeStudio/FaultCardForm';
import KnowledgeCreateModal from '@/pageComponents/customerService/KnowledgeCreateModal';
import type { KnowledgeItem } from '@/pageComponents/customerService/types';

/**
 * 知识采编工作台核心内容
 */
const KnowledgeEditorWorkspaceContent: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const {
    knowledge,
    catalog,
    modelMap,
    datasetNameMap,
    loading,
    saving,
    knowledgeAction,
    createKnowledge,
    knowledgeCreateDisclosure,
    recoveringKnowledge,
    setRecoveringKnowledge
  } = useCustomerServiceContext();

  // 4 Structured Template Modals Disclosures
  const productMasterDisclosure = useDisclosure();
  const manualDisclosure = useDisclosure();
  const faqBatchDisclosure = useDisclosure();
  const faultCardDisclosure = useDisclosure();

  // Sub-tabs index
  const [tabIndex, setTabIndex] = useState(0);

  // Filters
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterModelId, setFilterModelId] = useState('');

  // Recall Test Bench State
  const [testDatasetId, setTestDatasetId] = useState('');
  const [testCollectionId, setTestCollectionId] = useState('');
  const [testQuestion, setTestQuestion] = useState('设备卡纸怎么排查解决？');
  const [testSearching, setTestSearching] = useState(false);
  const [testResult, setTestResult] =
    useState<CustomerServiceAdminKnowledgeTestSearchResponse | null>(null);

  // Separate knowledge lists by lifecycle status
  const draftList = useMemo(() => {
    return knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.draft);
  }, [knowledge]);

  const pendingList = useMemo(() => {
    return knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.pending);
  }, [knowledge]);

  const rejectedList = useMemo(() => {
    return knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.rejected);
  }, [knowledge]);

  // Filter helper
  const filterItems = (list: KnowledgeItem[]) => {
    return list.filter((item) => {
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchSource = (item.sourceName || '').toLowerCase().includes(kw);
        if (!matchTitle && !matchSource) return false;
      }
      if (filterType && item.knowledgeType !== filterType) return false;
      if (filterModelId && item.modelIds.length > 0 && !item.modelIds.includes(filterModelId)) {
        return false;
      }
      return true;
    });
  };

  const filteredDrafts = useMemo(
    () => filterItems(draftList),
    [draftList, searchKeyword, filterType, filterModelId]
  );
  const filteredPending = useMemo(
    () => filterItems(pendingList),
    [pendingList, searchKeyword, filterType, filterModelId]
  );
  const filteredRejected = useMemo(
    () => filterItems(rejectedList),
    [rejectedList, searchKeyword, filterType, filterModelId]
  );

  // Handle Recall Test Bench Search
  const handleRunRecallTest = async () => {
    if (!testQuestion.trim()) {
      toast({ status: 'warning', title: '请输入试问问题文本' });
      return;
    }
    const targetKnowledge =
      knowledge.find(
        (item) =>
          (testCollectionId && item.collectionId === testCollectionId) ||
          (testDatasetId && item.datasetId === testDatasetId)
      ) || knowledge[0];

    if (!targetKnowledge) {
      toast({ status: 'warning', title: '请先录入或选择要测试的知识' });
      return;
    }

    setTestSearching(true);
    try {
      const res = await requestAdminApi<CustomerServiceAdminKnowledgeTestSearchResponse>({
        url: '/api/customer-service/admin/knowledge/testSearch',
        method: 'POST',
        body: {
          datasetId: targetKnowledge.datasetId,
          collectionId: targetKnowledge.collectionId,
          question: testQuestion.trim()
        }
      });
      setTestResult(res);
      toast({ status: 'success', title: '检索自测完成' });
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : '检索自测失败'
      });
    } finally {
      setTestSearching(false);
    }
  };

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>知识采编工作台 - 智能客服</title>
      </Head>

      {/* Top Header */}
      <CustomerServiceHeader currentRoute="editor" />

      <Box maxW="1600px" mx="auto" p={{ base: 4, md: 6, xl: 8 }}>
        <Stack spacing={6}>
          {/* Header Banner */}
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
            <Box>
              <Heading size="md" color="myGray.900">
                📝 知识采编工作台 (Knowledge Editor)
              </Heading>
              <Text mt={1} color="myGray.500" fontSize="sm">
                结构化模板快速录入、草稿箱维护、待审追踪、驳回项修改与自测，保障高质量客服语料生产。
              </Text>
            </Box>
            <HStack spacing={3}>
              <Button
                variant="whiteBase"
                leftIcon={<MyIcon name="common/uploadFileFill" w={4} />}
                onClick={knowledgeCreateDisclosure.onOpen}
              >
                上传本地文档 / 登记已有
              </Button>
            </HStack>
          </Flex>

          {/* 4 Standardized Creation Template Cards */}
          <Box>
            <Text
              fontSize="xs"
              fontWeight="700"
              color="myGray.600"
              mb={3}
              textTransform="uppercase"
              letterSpacing="wide"
            >
              4 大标准化知识采编模板
            </Text>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
              {/* Template 1: Product Master */}
              <Box
                p={4}
                bg="white"
                borderWidth="1px"
                borderColor="blue.200"
                borderRadius="xl"
                cursor="pointer"
                _hover={{ shadow: 'md', borderColor: 'blue.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                onClick={productMasterDisclosure.onOpen}
              >
                <Flex align="center" gap={3} mb={2}>
                  <Box p={2.5} bg="blue.50" color="blue.600" borderRadius="lg">
                    <MyIcon name="common/overviewLight" w={5} />
                  </Box>
                  <Box>
                    <Text fontWeight="700" fontSize="sm">
                      产品主档录入
                    </Text>
                    <Badge colorScheme="blue" size="xs">
                      规格与条款
                    </Badge>
                  </Box>
                </Flex>
                <Text fontSize="xs" color="myGray.500">
                  尺寸重量、额定功率、网络支持、耗材规格与质保条款标准化卡片。
                </Text>
              </Box>

              {/* Template 2: Manual */}
              <Box
                p={4}
                bg="white"
                borderWidth="1px"
                borderColor="green.200"
                borderRadius="xl"
                cursor="pointer"
                _hover={{ shadow: 'md', borderColor: 'green.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                onClick={manualDisclosure.onOpen}
              >
                <Flex align="center" gap={3} mb={2}>
                  <Box p={2.5} bg="green.50" color="green.600" borderRadius="lg">
                    <MyIcon name="common/list" w={5} />
                  </Box>
                  <Box>
                    <Text fontWeight="700" fontSize="sm">
                      操作说明录入
                    </Text>
                    <Badge colorScheme="green" size="xs">
                      SOP 步骤分解
                    </Badge>
                  </Box>
                </Flex>
                <Text fontSize="xs" color="myGray.500">
                  操作前提、顺序步骤分解、完成确认标志、防错警告与转人工升级条件。
                </Text>
              </Box>

              {/* Template 3: FAQ Batch */}
              <Box
                p={4}
                bg="white"
                borderWidth="1px"
                borderColor="purple.200"
                borderRadius="xl"
                cursor="pointer"
                _hover={{ shadow: 'md', borderColor: 'purple.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                onClick={faqBatchDisclosure.onOpen}
              >
                <Flex align="center" gap={3} mb={2}>
                  <Box p={2.5} bg="purple.50" color="purple.600" borderRadius="lg">
                    <MyIcon name="core/chat/chatLight" w={5} />
                  </Box>
                  <Box>
                    <Text fontWeight="700" fontSize="sm">
                      FAQ 批量编辑
                    </Text>
                    <Badge colorScheme="purple" size="xs">
                      多相似问扩展
                    </Badge>
                  </Box>
                </Flex>
                <Text fontSize="xs" color="myGray.500">
                  标准问答、多同义相似问 Tags 扩展、批量文本智能解析与多项录入。
                </Text>
              </Box>

              {/* Template 4: Fault Card */}
              <Box
                p={4}
                bg="white"
                borderWidth="1px"
                borderColor="red.200"
                borderRadius="xl"
                cursor="pointer"
                _hover={{ shadow: 'md', borderColor: 'red.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
                onClick={faultCardDisclosure.onOpen}
              >
                <Flex align="center" gap={3} mb={2}>
                  <Box p={2.5} bg="red.50" color="red.600" borderRadius="lg">
                    <MyIcon name="common/error" w={5} />
                  </Box>
                  <Box>
                    <Text fontWeight="700" fontSize="sm">
                      售后故障卡录入
                    </Text>
                    <Badge colorScheme="red" size="xs">
                      故障排查树
                    </Badge>
                  </Box>
                </Flex>
                <Text fontSize="xs" color="myGray.500">
                  错误代码、故障现象、高危等级划分、排查步骤树与工单升级规则。
                </Text>
              </Box>
            </SimpleGrid>
          </Box>

          {/* Sub-tabs: Drafts, Pending, Rejected, Recall Test */}
          <Tabs
            index={tabIndex}
            onChange={(index) => setTabIndex(index)}
            variant="enclosed"
            colorScheme="blue"
          >
            <TabList bg="white" p={2} borderRadius="xl" borderWidth="1px" borderColor="myGray.200">
              <Tab fontWeight="600" fontSize="sm">
                ① 我的草稿箱
                <Badge ml={2} colorScheme="gray" borderRadius="full">
                  {draftList.length}
                </Badge>
              </Tab>
              <Tab fontWeight="600" fontSize="sm">
                ② 待审核跟踪
                <Badge ml={2} colorScheme="orange" borderRadius="full">
                  {pendingList.length}
                </Badge>
              </Tab>
              <Tab fontWeight="600" fontSize="sm">
                ③ 被驳回修改
                {rejectedList.length > 0 && (
                  <Badge ml={2} colorScheme="red" borderRadius="full">
                    {rejectedList.length}
                  </Badge>
                )}
              </Tab>
              <Tab fontWeight="600" fontSize="sm">
                ④ 检索自测台
              </Tab>
            </TabList>

            {/* Filter Bar for Knowledge Tabs 0, 1, 2 */}
            {tabIndex !== 3 && (
              <Flex
                mt={4}
                bg="white"
                p={4}
                borderWidth="1px"
                borderRadius="xl"
                borderColor="myGray.200"
                gap={3}
                wrap="wrap"
                align="center"
              >
                <Input
                  maxW={{ base: '100%', md: '280px' }}
                  size="sm"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索标题或文件名"
                />
                <Select
                  maxW={{ base: '100%', md: '180px' }}
                  size="sm"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="">全部资料类型</option>
                  {Object.values(CustomerServiceKnowledgeTypeEnum).map((t) => (
                    <option key={t} value={t}>
                      {knowledgeTypeMap[t]}
                    </option>
                  ))}
                </Select>
                <Select
                  maxW={{ base: '100%', md: '180px' }}
                  size="sm"
                  value={filterModelId}
                  onChange={(e) => setFilterModelId(e.target.value)}
                >
                  <option value="">全部产品型号</option>
                  {catalog.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Flex>
            )}

            <TabPanels mt={4}>
              {/* Tab Panel 1: 我的草稿箱 */}
              <TabPanel p={0}>
                {loading ? (
                  <Flex minH="240px" align="center" justify="center">
                    <Spinner color="primary.600" />
                  </Flex>
                ) : filteredDrafts.length === 0 ? (
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
                    textAlign="center"
                  >
                    <Heading size="sm" color="myGray.700">
                      草稿箱暂无待提交内容
                    </Heading>
                    <Text mt={2} color="myGray.500" fontSize="sm">
                      点击上方 4 大标准化录入模板创建草稿，编辑完善后提交审核。
                    </Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                    {filteredDrafts.map((item) => {
                      const modelNames = item.modelIds
                        .map((id) => modelMap.get(id)?.name)
                        .filter(Boolean)
                        .join('、');
                      return (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="myGray.200"
                          borderRadius="xl"
                          p={5}
                          shadow="xs"
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                              <Heading size="sm" noOfLines={2}>
                                {item.title}
                              </Heading>
                              <Flex mt={2} gap={2} wrap="wrap">
                                <Badge colorScheme="gray">草稿 (Draft)</Badge>
                                <Badge variant="subtle">
                                  {knowledgeTypeMap[item.knowledgeType]}
                                </Badge>
                                <Badge colorScheme="purple">
                                  {audienceMap[item.audienceLevel]}
                                </Badge>
                              </Flex>
                            </Box>
                            <Text fontSize="xs" color="myGray.500" flexShrink={0}>
                              V{item.version}
                            </Text>
                          </Flex>

                          <Text mt={3} fontSize="xs" color="myGray.600">
                            适用产品：{modelNames || '通用所有产品'}
                          </Text>
                          <Text mt={1} fontSize="xs" color="myGray.500">
                            知识库源：
                            {item.sourceName || datasetNameMap.get(item.datasetId) || '知识库'} ·{' '}
                            {item.dataAmount} 段切片
                          </Text>

                          <Flex mt={4} justify="space-between" align="center" gap={2} wrap="wrap">
                            <Button
                              size="sm"
                              variant="whiteBase"
                              onClick={() =>
                                void router.push(
                                  `/dataset/detail?datasetId=${item.datasetId}&currentTab=dataCard&collectionId=${item.collectionId}`
                                )
                              }
                            >
                              查看与编辑切片
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              isLoading={saving}
                              onClick={() => knowledgeAction('submit', item.id)}
                            >
                              提交至审核队列
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Tab Panel 2: 待审核跟踪 */}
              <TabPanel p={0}>
                {loading ? (
                  <Flex minH="240px" align="center" justify="center">
                    <Spinner color="primary.600" />
                  </Flex>
                ) : filteredPending.length === 0 ? (
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
                    textAlign="center"
                  >
                    <Heading size="sm" color="myGray.700">
                      当前没有处于待审核状态的知识
                    </Heading>
                    <Text mt={2} color="myGray.500" fontSize="sm">
                      在草稿箱提交知识后，将在此处实时跟踪审核进度。
                    </Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                    {filteredPending.map((item) => {
                      const modelNames = item.modelIds
                        .map((id) => modelMap.get(id)?.name)
                        .filter(Boolean)
                        .join('、');
                      return (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="orange.200"
                          borderRadius="xl"
                          p={5}
                          shadow="xs"
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                              <Heading size="sm" noOfLines={2}>
                                {item.title}
                              </Heading>
                              <Flex mt={2} gap={2} wrap="wrap">
                                <Badge colorScheme="orange">⏳ 待审核 (Pending)</Badge>
                                <Badge variant="subtle">
                                  {knowledgeTypeMap[item.knowledgeType]}
                                </Badge>
                                <Badge colorScheme="purple">
                                  {audienceMap[item.audienceLevel]}
                                </Badge>
                              </Flex>
                            </Box>
                            <Text fontSize="xs" color="myGray.500" flexShrink={0}>
                              V{item.version}
                            </Text>
                          </Flex>

                          <Alert status="info" borderRadius="lg" mt={3} py={2} px={3}>
                            <AlertIcon />
                            <AlertDescription fontSize="xs">
                              已提交至审核员队列，审核通过后自动生效，禁止采编端直接发布。
                            </AlertDescription>
                          </Alert>

                          <Text mt={3} fontSize="xs" color="myGray.600">
                            适用产品：{modelNames || '通用所有产品'}
                          </Text>
                          <Text mt={1} fontSize="xs" color="myGray.500">
                            更新时间：{new Date(item.updateTime).toLocaleString()} ·{' '}
                            {item.dataAmount} 段切片
                          </Text>

                          <Flex mt={4} gap={2}>
                            <Button
                              size="sm"
                              variant="whiteBase"
                              onClick={() =>
                                void router.push(
                                  `/dataset/detail?datasetId=${item.datasetId}&currentTab=dataCard&collectionId=${item.collectionId}`
                                )
                              }
                            >
                              查看底层切片
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Tab Panel 3: 被驳回修改 */}
              <TabPanel p={0}>
                {loading ? (
                  <Flex minH="240px" align="center" justify="center">
                    <Spinner color="primary.600" />
                  </Flex>
                ) : filteredRejected.length === 0 ? (
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
                    textAlign="center"
                  >
                    <Heading size="sm" color="green.600">
                      🎉 暂无被驳回的知识项
                    </Heading>
                    <Text mt={2} color="myGray.500" fontSize="sm">
                      所有提交的内容均已顺利审核或暂无驳回记录。
                    </Text>
                  </Flex>
                ) : (
                  <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                    {filteredRejected.map((item) => {
                      const modelNames = item.modelIds
                        .map((id) => modelMap.get(id)?.name)
                        .filter(Boolean)
                        .join('、');
                      return (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="red.300"
                          borderRadius="xl"
                          p={5}
                          shadow="xs"
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                              <Heading size="sm" noOfLines={2}>
                                {item.title}
                              </Heading>
                              <Flex mt={2} gap={2} wrap="wrap">
                                <Badge colorScheme="red">已驳回 (Rejected)</Badge>
                                <Badge variant="subtle">
                                  {knowledgeTypeMap[item.knowledgeType]}
                                </Badge>
                                <Badge colorScheme="purple">
                                  {audienceMap[item.audienceLevel]}
                                </Badge>
                              </Flex>
                            </Box>
                            <Text fontSize="xs" color="myGray.500" flexShrink={0}>
                              V{item.version}
                            </Text>
                          </Flex>

                          {/* Reviewer Note Banner */}
                          <Alert status="error" borderRadius="lg" mt={3} py={2.5} px={3}>
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="xs" fontWeight="700">
                                审核员驳回意见：
                              </AlertTitle>
                              <AlertDescription fontSize="xs" mt={0.5}>
                                {item.reviewReason ||
                                  '暂未填写具体原因，请核实产品参数完整性后重新提交。'}
                              </AlertDescription>
                            </Box>
                          </Alert>

                          <Text mt={3} fontSize="xs" color="myGray.600">
                            适用产品：{modelNames || '通用所有产品'}
                          </Text>

                          <Flex mt={4} justify="space-between" align="center" gap={2} wrap="wrap">
                            <Button
                              size="sm"
                              variant="whiteBase"
                              onClick={() =>
                                void router.push(
                                  `/dataset/detail?datasetId=${item.datasetId}&currentTab=dataCard&collectionId=${item.collectionId}`
                                )
                              }
                            >
                              修改底层切片
                            </Button>
                            <Button
                              size="sm"
                              colorScheme="blue"
                              isLoading={saving}
                              onClick={() => knowledgeAction('submit', item.id)}
                            >
                              重新提交审核
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </SimpleGrid>
                )}
              </TabPanel>

              {/* Tab Panel 4: 检索自测台 */}
              <TabPanel p={0}>
                <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={6}>
                  <Heading size="sm" mb={1}>
                    🎯 知识库语义检索与拟答自测台
                  </Heading>
                  <Text color="myGray.500" fontSize="xs" mb={4}>
                    输入典型客户问法，实时测试向量混合检索匹配得分、命中文档切片与模型拟答效果。
                  </Text>

                  <Stack spacing={4}>
                    <FormControl>
                      <FormLabel fontSize="xs" fontWeight="600">
                        自测问题 (Test Question)
                      </FormLabel>
                      <Input
                        value={testQuestion}
                        onChange={(e) => setTestQuestion(e.target.value)}
                        placeholder="例如：打印机出纸口卡纸了如何清理？"
                      />
                    </FormControl>

                    <Flex justify="flex-end">
                      <Button
                        colorScheme="blue"
                        isLoading={testSearching}
                        loadingText="正在执行检索与模型试答..."
                        onClick={handleRunRecallTest}
                        leftIcon={<MyIcon name="core/chat/chatLight" w={4} />}
                      >
                        执行语义检索自测
                      </Button>
                    </Flex>

                    {testResult && (
                      <Stack
                        spacing={4}
                        mt={4}
                        pt={4}
                        borderTopWidth="1px"
                        borderColor="myGray.200"
                      >
                        <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                          <Box
                            p={3.5}
                            bg="primary.50"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="primary.200"
                          >
                            <Text fontSize="xs" color="myGray.600">
                              最高相似匹配得分
                            </Text>
                            <Heading size="md" color="primary.700" mt={1}>
                              {(testResult.score * 100).toFixed(1)}%
                            </Heading>
                          </Box>
                          <Box
                            p={3.5}
                            bg="green.50"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="green.200"
                          >
                            <Text fontSize="xs" color="myGray.600">
                              命中文档切片数
                            </Text>
                            <Heading size="md" color="green.700" mt={1}>
                              {testResult.matchCount} 项
                            </Heading>
                          </Box>
                          <Box
                            p={3.5}
                            bg="purple.50"
                            borderRadius="lg"
                            borderWidth="1px"
                            borderColor="purple.200"
                          >
                            <Text fontSize="xs" color="myGray.600">
                              检索置信度评级
                            </Text>
                            <Heading size="md" color="purple.700" mt={1}>
                              {testResult.score >= 0.8
                                ? '极高匹配'
                                : testResult.score >= 0.5
                                  ? '中度相关'
                                  : '低置信度'}
                            </Heading>
                          </Box>
                        </SimpleGrid>

                        {/* Model Answer Preview */}
                        <Box
                          p={4}
                          bg="myGray.50"
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor="myGray.200"
                        >
                          <Text fontSize="xs" fontWeight="700" color="myGray.700" mb={1}>
                            🤖 智能客服拟答预览：
                          </Text>
                          <Text fontSize="sm" color="myGray.800" whiteSpace="pre-wrap">
                            {testResult.answerPreview}
                          </Text>
                        </Box>

                        {/* Matched Chunks */}
                        <Box>
                          <Text fontSize="xs" fontWeight="700" color="myGray.700" mb={2}>
                            📄 命中切片列表 ({testResult.chunks.length})：
                          </Text>
                          <Stack spacing={2}>
                            {testResult.chunks.map((chunk, idx) => (
                              <Box
                                key={chunk.chunkId || idx}
                                p={3}
                                bg="white"
                                borderRadius="md"
                                borderWidth="1px"
                                borderColor="myGray.200"
                              >
                                <Flex justify="space-between" align="center" mb={1}>
                                  <Badge size="xs" colorScheme="blue">
                                    切片 #{idx + 1}
                                  </Badge>
                                  <Text fontSize="xs" color="primary.600" fontWeight="600">
                                    相似度: {(chunk.score * 100).toFixed(1)}%
                                  </Text>
                                </Flex>
                                <Text fontSize="xs" color="myGray.700" whiteSpace="pre-wrap">
                                  {chunk.content}
                                </Text>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                    )}
                  </Stack>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Stack>
      </Box>

      {/* 4 Standard Template Modals */}
      <ProductMasterForm
        isOpen={productMasterDisclosure.isOpen}
        onClose={productMasterDisclosure.onClose}
      />
      <ManualForm isOpen={manualDisclosure.isOpen} onClose={manualDisclosure.onClose} />
      <FaqBatchEditor isOpen={faqBatchDisclosure.isOpen} onClose={faqBatchDisclosure.onClose} />
      <FaultCardForm isOpen={faultCardDisclosure.isOpen} onClose={faultCardDisclosure.onClose} />

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
    </Box>
  );
};

/**
 * 知识采编工作台主页面
 */
const KnowledgeEditorPage = () => {
  return (
    <CustomerServiceProvider>
      <KnowledgeEditorWorkspaceContent />
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

export default KnowledgeEditorPage;
