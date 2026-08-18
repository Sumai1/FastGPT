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
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceAdminKnowledgeTestSearchResponse } from '@fastgpt/global/openapi/customerService/api';
import {
  CustomerServiceProvider,
  useCustomerServiceContext,
  memberRoleMap,
  statusMap,
  knowledgeTypeMap,
  audienceMap,
  requestAdminApi
} from '@/pageComponents/customerService/context';
import ProductMasterForm from '@/pageComponents/customerService/KnowledgeStudio/ProductMasterForm';
import ManualForm from '@/pageComponents/customerService/KnowledgeStudio/ManualForm';
import FaqBatchEditor from '@/pageComponents/customerService/KnowledgeStudio/FaqBatchEditor';
import FaultCardForm from '@/pageComponents/customerService/KnowledgeStudio/FaultCardForm';
import KnowledgeCreateModal from '@/pageComponents/customerService/KnowledgeCreateModal';
import type { KnowledgeItem } from '@/pageComponents/customerService/types';
import MyBox from '@fastgpt/web/components/common/MyBox';
import { ArrowBackIcon } from '@chakra-ui/icons';

const KnowledgeEditorWorkspaceContent: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const {
    effectiveRole,
    canEditKnowledge,
    knowledge,
    catalog,
    modelMap,
    datasetNameMap,
    loading,
    saving,
    knowledgeAction,
    knowledgeCreateDisclosure,
    createKnowledge
  } = useCustomerServiceContext();

  const productMasterDisclosure = useDisclosure();
  const manualDisclosure = useDisclosure();
  const faqBatchDisclosure = useDisclosure();
  const faultCardDisclosure = useDisclosure();

  const [tabIndex, setTabIndex] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterModelId, setFilterModelId] = useState('');

  const [testDatasetId, setTestDatasetId] = useState('');
  const [testCollectionId, setTestCollectionId] = useState('');
  const [testQuestion, setTestQuestion] = useState('设备卡纸怎么排查解决？');
  const [testSearching, setTestSearching] = useState(false);
  const [testResult, setTestResult] =
    useState<CustomerServiceAdminKnowledgeTestSearchResponse | null>(null);

  const draftList = useMemo(
    () => knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.draft),
    [knowledge]
  );
  const pendingList = useMemo(
    () => knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.pending),
    [knowledge]
  );
  const rejectedList = useMemo(
    () => knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.rejected),
    [knowledge]
  );

  const filterItems = (list: KnowledgeItem[]) => {
    return list.filter((item) => {
      if (searchKeyword.trim()) {
        const kw = searchKeyword.trim().toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(kw);
        const matchSource = (item.sourceName || '').toLowerCase().includes(kw);
        if (!matchTitle && !matchSource) return false;
      }
      if (filterType && item.knowledgeType !== filterType) return false;
      if (filterModelId && item.modelIds.length > 0 && !item.modelIds.includes(filterModelId))
        return false;
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

  const handleRunRecallTest = async () => {
    if (!testQuestion.trim()) return toast({ status: 'warning', title: '请输入试问问题文本' });
    const targetKnowledge =
      knowledge.find(
        (item) =>
          (testCollectionId && item.collectionId === testCollectionId) ||
          (testDatasetId && item.datasetId === testDatasetId)
      ) || knowledge[0];

    if (!targetKnowledge) return toast({ status: 'warning', title: '请先录入或选择要测试的知识' });

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
      toast({ status: 'error', title: err instanceof Error ? err.message : '检索自测失败' });
    } finally {
      setTestSearching(false);
    }
  };

  if (!loading && !canEditKnowledge) {
    return (
      <Box minH="100vh" bg="myGray.50">
        <Flex h="100%" align="center" justify="center">
          <Box bg="white" p={8} borderRadius="xl" shadow="sm" textAlign="center" maxW="480px">
            <Heading size="md" color="myGray.800" mb={3}>
              🔒 暂无知识采编权限
            </Heading>
            <Text color="myGray.500" fontSize="sm" mb={6}>
              您当前的账号岗位为【{memberRoleMap[effectiveRole] || '未知'}
              】，知识采编由采编岗位专人负责。
            </Text>
            <Button colorScheme="blue" onClick={() => void router.push('/dataset')}>
              返回知识库大厅
            </Button>
          </Box>
        </Flex>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="myGray.50">
      <MyBox isLoading={loading} h="100%" display="flex" flexDirection="column">
        <Flex p={4} alignItems="center" bg="white" borderBottomWidth="1px" borderColor="myGray.200">
          <Button
            variant="whiteBase"
            size="sm"
            leftIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dataset')}
          >
            返回
          </Button>
          <Box ml={4} fontWeight="bold" fontSize="lg" color="myGray.900">
            知识采编台 (Editor Studio)
          </Box>
        </Flex>

        <Box
          flex="1"
          overflowY="auto"
          p={{ base: 4, md: 6, xl: 8 }}
          maxW="1600px"
          mx="auto"
          w="100%"
        >
          <Stack spacing={6}>
            <Flex
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              gap={4}
              wrap="wrap"
            >
              <Box>
                <Heading size="md" color="myGray.900">
                  📝 知识采编工作台
                </Heading>
                <Text mt={1} color="myGray.500" fontSize="sm">
                  结构化模板快速录入、草稿箱维护、待审追踪、驳回项修改与自测，保障高质量客服语料生产。
                </Text>
              </Box>
              <Button
                variant="primary"
                leftIcon={<MyIcon name="common/uploadFileFill" w={4} />}
                onClick={knowledgeCreateDisclosure.onOpen}
              >
                上传本地文档 / 登记已有
              </Button>
            </Flex>

            <Box>
              <Text fontSize="xs" fontWeight="700" color="myGray.600" mb={3}>
                4 大标准化知识采编模板
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
                <Box
                  p={4}
                  bg="white"
                  borderWidth="1px"
                  borderColor="blue.200"
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ shadow: 'md', borderColor: 'blue.400' }}
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
                <Box
                  p={4}
                  bg="white"
                  borderWidth="1px"
                  borderColor="green.200"
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ shadow: 'md', borderColor: 'green.400' }}
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
                <Box
                  p={4}
                  bg="white"
                  borderWidth="1px"
                  borderColor="purple.200"
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ shadow: 'md', borderColor: 'purple.400' }}
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
                <Box
                  p={4}
                  bg="white"
                  borderWidth="1px"
                  borderColor="red.200"
                  borderRadius="xl"
                  cursor="pointer"
                  _hover={{ shadow: 'md', borderColor: 'red.400' }}
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

            <Tabs
              index={tabIndex}
              onChange={(index) => setTabIndex(index)}
              variant="enclosed"
              colorScheme="blue"
            >
              <TabList
                bg="white"
                p={2}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="myGray.200"
              >
                <Tab fontWeight="600" fontSize="sm">
                  ① 我的草稿箱{' '}
                  <Badge ml={2} colorScheme="gray" borderRadius="full">
                    {draftList.length}
                  </Badge>
                </Tab>
                <Tab fontWeight="600" fontSize="sm">
                  ② 待审核跟踪{' '}
                  <Badge ml={2} colorScheme="orange" borderRadius="full">
                    {pendingList.length}
                  </Badge>
                </Tab>
                <Tab fontWeight="600" fontSize="sm">
                  ③ 被驳回修改{' '}
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
                <TabPanel p={0}>
                  {filteredDrafts.length === 0 ? (
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
                      <Heading size="sm" color="myGray.700">
                        草稿箱暂无待提交内容
                      </Heading>
                    </Flex>
                  ) : (
                    <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                      {filteredDrafts.map((item) => (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="myGray.200"
                          borderRadius="xl"
                          p={5}
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
                            <Text fontSize="xs" color="myGray.500">
                              V{item.version}
                            </Text>
                          </Flex>
                          <Text mt={3} fontSize="xs" color="myGray.600">
                            适用产品：
                            {item.modelIds
                              .map((id) => modelMap.get(id)?.name)
                              .filter(Boolean)
                              .join('、') || '通用'}
                          </Text>
                          <Flex mt={4} justify="space-between" align="center" gap={2}>
                            <Button
                              size="sm"
                              variant="whiteBase"
                              onClick={() =>
                                router.push(
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
                      ))}
                    </SimpleGrid>
                  )}
                </TabPanel>

                <TabPanel p={0}>
                  {filteredPending.length === 0 ? (
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
                      <Heading size="sm" color="myGray.700">
                        当前没有待审知识
                      </Heading>
                    </Flex>
                  ) : (
                    <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                      {filteredPending.map((item) => (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="orange.200"
                          borderRadius="xl"
                          p={5}
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                              <Heading size="sm" noOfLines={2}>
                                {item.title}
                              </Heading>
                              <Flex mt={2} gap={2} wrap="wrap">
                                <Badge colorScheme="orange">⏳ 待审核</Badge>
                                <Badge variant="subtle">
                                  {knowledgeTypeMap[item.knowledgeType]}
                                </Badge>
                                <Badge colorScheme="purple">
                                  {audienceMap[item.audienceLevel]}
                                </Badge>
                              </Flex>
                            </Box>
                            <Text fontSize="xs" color="myGray.500">
                              V{item.version}
                            </Text>
                          </Flex>
                          <Alert status="info" borderRadius="lg" mt={3} py={2} px={3}>
                            <AlertIcon />
                            <AlertDescription fontSize="xs">已提交至审核员队列</AlertDescription>
                          </Alert>
                        </Box>
                      ))}
                    </SimpleGrid>
                  )}
                </TabPanel>

                <TabPanel p={0}>
                  {filteredRejected.length === 0 ? (
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
                      <Heading size="sm" color="green.600">
                        🎉 暂无被驳回的知识项
                      </Heading>
                    </Flex>
                  ) : (
                    <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
                      {filteredRejected.map((item) => (
                        <Box
                          key={item.id}
                          bg="white"
                          borderWidth="1px"
                          borderColor="red.300"
                          borderRadius="xl"
                          p={5}
                        >
                          <Flex justify="space-between" align="start" gap={3}>
                            <Box minW={0}>
                              <Heading size="sm" noOfLines={2}>
                                {item.title}
                              </Heading>
                              <Flex mt={2} gap={2} wrap="wrap">
                                <Badge colorScheme="red">已驳回</Badge>
                                <Badge variant="subtle">
                                  {knowledgeTypeMap[item.knowledgeType]}
                                </Badge>
                                <Badge colorScheme="purple">
                                  {audienceMap[item.audienceLevel]}
                                </Badge>
                              </Flex>
                            </Box>
                            <Text fontSize="xs" color="myGray.500">
                              V{item.version}
                            </Text>
                          </Flex>
                          <Alert status="error" borderRadius="lg" mt={3} py={2.5} px={3}>
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="xs">审核员驳回意见：</AlertTitle>
                              <AlertDescription fontSize="xs">{item.reviewReason}</AlertDescription>
                            </Box>
                          </Alert>
                          <Flex mt={4} justify="space-between" align="center" gap={2}>
                            <Button
                              size="sm"
                              variant="whiteBase"
                              onClick={() =>
                                router.push(
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
                      ))}
                    </SimpleGrid>
                  )}
                </TabPanel>

                <TabPanel p={0}>
                  <Box
                    bg="white"
                    borderWidth="1px"
                    borderColor="myGray.200"
                    borderRadius="xl"
                    p={6}
                  >
                    <Heading size="sm" mb={1}>
                      🎯 知识库语义检索与拟答自测台
                    </Heading>
                    <Text color="myGray.500" fontSize="xs" mb={4}>
                      输入典型客户问法，实时测试向量混合检索匹配得分、命中文档切片与模型拟答效果。
                    </Text>
                    <Stack spacing={4}>
                      <FormControl>
                        <FormLabel fontSize="xs" fontWeight="600">
                          自测问题
                        </FormLabel>
                        <Input
                          value={testQuestion}
                          onChange={(e) => setTestQuestion(e.target.value)}
                        />
                      </FormControl>
                      <Flex justify="flex-end">
                        <Button
                          colorScheme="blue"
                          isLoading={testSearching}
                          onClick={handleRunRecallTest}
                        >
                          运行自测
                        </Button>
                      </Flex>
                      {testResult && (
                        <Box mt={4}>
                          <Alert status="success" borderRadius="lg" mb={4}>
                            <AlertIcon />
                            <AlertTitle fontSize="sm">
                              检索到 {testResult.matchCount} 个相关切片，最高匹配得分{' '}
                              {testResult.score}
                            </AlertTitle>
                          </Alert>
                          <Heading size="xs" mb={2}>
                            🤖 大模型拟答结果：
                          </Heading>
                          <Box
                            bg="myGray.50"
                            p={4}
                            borderRadius="lg"
                            fontSize="sm"
                            whiteSpace="pre-wrap"
                          >
                            {testResult.answerPreview}
                          </Box>
                          <Heading size="xs" mt={6} mb={2}>
                            📄 命中的底层切片 (Top {testResult.chunks.length})：
                          </Heading>
                          <Stack spacing={3}>
                            {testResult.chunks.map((chunk, idx) => (
                              <Box
                                key={idx}
                                p={3}
                                borderWidth="1px"
                                borderColor="myGray.200"
                                borderRadius="lg"
                                bg="white"
                              >
                                <Flex justify="space-between" align="center" mb={1}>
                                  <Badge colorScheme="purple">Score: {chunk.score}</Badge>
                                </Flex>
                                <Text fontSize="xs" color="myGray.600" noOfLines={4}>
                                  {chunk.content}
                                </Text>
                              </Box>
                            ))}
                          </Stack>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Stack>
        </Box>
      </MyBox>

      {productMasterDisclosure.isOpen && (
        <ProductMasterForm isOpen onClose={productMasterDisclosure.onClose} />
      )}
      {manualDisclosure.isOpen && <ManualForm isOpen onClose={manualDisclosure.onClose} />}
      {faqBatchDisclosure.isOpen && <FaqBatchEditor isOpen onClose={faqBatchDisclosure.onClose} />}
      {faultCardDisclosure.isOpen && <FaultCardForm isOpen onClose={faultCardDisclosure.onClose} />}
      {knowledgeCreateDisclosure.isOpen && (
        <KnowledgeCreateModal
          isOpen
          onClose={knowledgeCreateDisclosure.onClose}
          catalog={catalog}
          onCreate={createKnowledge}
        />
      )}
    </Box>
  );
};

const KnowledgeEditorPage = () => (
  <CustomerServiceProvider>
    <KnowledgeEditorWorkspaceContent />
  </CustomerServiceProvider>
);

export async function getServerSideProps(context: unknown) {
  return { props: { ...(await serviceSideProps(context, ['common', 'customer_service'])) } };
}
export default KnowledgeEditorPage;
