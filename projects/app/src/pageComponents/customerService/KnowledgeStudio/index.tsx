import React, { useMemo, useState } from 'react';
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
  Stack,
  Text,
  useDisclosure
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext, statusMap, knowledgeTypeMap, audienceMap } from '../context';
import type { KnowledgeItem } from '../types';
import ProductMasterForm from './ProductMasterForm';
import ManualForm from './ManualForm';
import FaqBatchEditor from './FaqBatchEditor';
import FaultCardForm from './FaultCardForm';
import MyIcon from '@fastgpt/web/components/common/Icon';

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusMap[status] ?? { label: status, color: 'gray' };
  return <Badge colorScheme={config.color}>{config.label}</Badge>;
};

export const KnowledgeStudio: React.FC = () => {
  const router = useRouter();
  const {
    knowledge,
    unregisteredKnowledge,
    setRecoveringKnowledge,
    knowledgeCreateDisclosure,
    currentMember,
    saving,
    knowledgeAction,
    catalog,
    modelMap,
    datasetNameMap
  } = useCustomerServiceContext();

  // Template Modals Disclosures
  const productMasterDisclosure = useDisclosure();
  const manualDisclosure = useDisclosure();
  const faqBatchDisclosure = useDisclosure();
  const faultCardDisclosure = useDisclosure();

  // Filters
  const [keyword, setKeyword] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterAudience, setFilterAudience] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterModelId, setFilterModelId] = useState<string>('');

  const filteredKnowledge = useMemo(() => {
    return knowledge.filter((item) => {
      if (keyword.trim()) {
        const lower = keyword.trim().toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(lower);
        const matchesSource = (item.sourceName || '').toLowerCase().includes(lower);
        if (!matchesTitle && !matchesSource) return false;
      }
      if (filterType && item.knowledgeType !== filterType) return false;
      if (filterAudience && item.audienceLevel !== filterAudience) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (filterModelId && item.modelIds.length > 0 && !item.modelIds.includes(filterModelId))
        return false;
      return true;
    });
  }, [knowledge, keyword, filterType, filterAudience, filterStatus, filterModelId]);

  return (
    <Stack spacing={6}>
      {/* Studio Header */}
      <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
        <Box>
          <Heading size="md">知识生产中心 (Knowledge Studio)</Heading>
          <Text mt={1} color="myGray.500" fontSize="sm">
            提供 4 大结构化知识录入模板与批量导入，已发布知识自动参与智能客服语义召回与问答。
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          {currentMember?.capabilities.editKnowledge && (
            <Button variant="whiteBase" onClick={knowledgeCreateDisclosure.onOpen}>
              上传本地文档 / 登记已有
            </Button>
          )}
        </Flex>
      </Flex>

      {/* 4 Standardized Form Templates Entry Cards */}
      {currentMember?.capabilities.editKnowledge && (
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
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
              <Box p={2} bg="blue.50" color="blue.600" borderRadius="lg">
                <MyIcon name="common/overviewLight" w={5} />
              </Box>
              <Box>
                <Text fontWeight="700" fontSize="sm">
                  产品主档录入
                </Text>
                <Badge colorScheme="blue" size="xs">
                  规格主档
                </Badge>
              </Box>
            </Flex>
            <Text fontSize="xs" color="myGray.500">
              额定功率、尺寸重量、网络供电、耗材规格与质保条款标准化录入。
            </Text>
          </Box>

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
              <Box p={2} bg="green.50" color="green.600" borderRadius="lg">
                <MyIcon name="common/list" w={5} />
              </Box>
              <Box>
                <Text fontWeight="700" fontSize="sm">
                  操作说明录入
                </Text>
                <Badge colorScheme="green" size="xs">
                  SOP 步骤
                </Badge>
              </Box>
            </Flex>
            <Text fontSize="xs" color="myGray.500">
              操作前提、步骤分解、完成确认标志、防错警告与转人工升级条件。
            </Text>
          </Box>

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
              <Box p={2} bg="purple.50" color="purple.600" borderRadius="lg">
                <MyIcon name="core/chat/chatLight" w={5} />
              </Box>
              <Box>
                <Text fontWeight="700" fontSize="sm">
                  FAQ 批量编辑
                </Text>
                <Badge colorScheme="purple" size="xs">
                  多相似问
                </Badge>
              </Box>
            </Flex>
            <Text fontSize="xs" color="myGray.500">
              标准问答、口语化相似问 Tags 扩展、批量文本解析与多项编辑。
            </Text>
          </Box>

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
              <Box p={2} bg="red.50" color="red.600" borderRadius="lg">
                <MyIcon name="common/error" w={5} />
              </Box>
              <Box>
                <Text fontWeight="700" fontSize="sm">
                  售后故障卡录入
                </Text>
                <Badge colorScheme="red" size="xs">
                  排查树/安全
                </Badge>
              </Box>
            </Flex>
            <Text fontSize="xs" color="myGray.500">
              错误代码、危险等级划分（普通/警告/高危）、排查步骤树与工单规则。
            </Text>
          </Box>
        </SimpleGrid>
      )}

      {/* Unregistered Knowledge Recovery Section */}
      {unregisteredKnowledge.length > 0 && (
        <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="xl" p={4}>
          <Flex justify="space-between" align="center" mb={2}>
            <Heading size="sm" color="orange.900">
              待登记产品资料（{unregisteredKnowledge.length}）
            </Heading>
            <Badge colorScheme="orange">已在 FastGPT 知识库</Badge>
          </Flex>
          <Text color="myGray.600" fontSize="sm">
            这些资料已上传至 FastGPT，但尚未登记适用产品与可见范围，可以直接恢复治理，无需重新上传。
          </Text>
          <Stack mt={3} spacing={2}>
            {unregisteredKnowledge.slice(0, 5).map((item) => (
              <Flex
                key={item.collectionId}
                bg="white"
                borderRadius="lg"
                p={3}
                gap={3}
                align="center"
                wrap="wrap"
                borderWidth="1px"
                borderColor="orange.200"
              >
                <Box flex="1" minW="220px">
                  <Text fontWeight="600" noOfLines={1}>
                    {item.name}
                  </Text>
                  <Text fontSize="xs" color="myGray.500">
                    {item.datasetName} · {item.trainingStatus === 'ready' ? '训练完成' : '处理中'}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  colorScheme="orange"
                  variant="outline"
                  onClick={() => {
                    setRecoveringKnowledge(item);
                    knowledgeCreateDisclosure.onOpen();
                  }}
                >
                  继续登记
                </Button>
              </Flex>
            ))}
          </Stack>
        </Box>
      )}

      {/* Filter and Search Bar */}
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
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索知识标题或来源文件名"
        />
        <Select
          maxW={{ base: '100%', md: '180px' }}
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
          maxW={{ base: '100%', md: '160px' }}
          value={filterAudience}
          onChange={(e) => setFilterAudience(e.target.value)}
        >
          <option value="">全部受众范围</option>
          {Object.values(CustomerServiceAudienceEnum).map((a) => (
            <option key={a} value={a}>
              {audienceMap[a]}
            </option>
          ))}
        </Select>
        <Select
          maxW={{ base: '100%', md: '160px' }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">全部状态</option>
          <option value={CustomerServiceKnowledgeStatusEnum.draft}>草稿</option>
          <option value={CustomerServiceKnowledgeStatusEnum.pending}>待审核</option>
          <option value={CustomerServiceKnowledgeStatusEnum.published}>已发布</option>
          <option value={CustomerServiceKnowledgeStatusEnum.rejected}>已驳回</option>
          <option value={CustomerServiceKnowledgeStatusEnum.offline}>已下架</option>
        </Select>
        <Select
          maxW={{ base: '100%', md: '180px' }}
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
        <Badge alignSelf="center" colorScheme="blue" px={3} py={1} borderRadius="full">
          共 {filteredKnowledge.length} 条知识
        </Badge>
      </Flex>

      {/* Knowledge Inventory Cards */}
      {filteredKnowledge.length === 0 ? (
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
          <Heading size="sm">暂无符合条件的知识资料</Heading>
          <Text mt={2} color="myGray.500" fontSize="sm">
            点击上方 4 大录入模板创建标准化知识，或点击“上传本地文档”登记已有文件。
          </Text>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {filteredKnowledge.map((item) => {
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
              >
                <Flex align="start" justify="space-between" gap={4}>
                  <Box minW={0}>
                    <Heading size="sm" noOfLines={2}>
                      {item.title}
                    </Heading>
                    <Flex mt={2} gap={2} wrap="wrap">
                      <StatusBadge status={item.status} />
                      <Badge variant="subtle">{knowledgeTypeMap[item.knowledgeType]}</Badge>
                      <Badge colorScheme="purple">{audienceMap[item.audienceLevel]}</Badge>
                    </Flex>
                  </Box>
                  <Text fontSize="sm" color="myGray.500" flexShrink={0}>
                    V{item.version}
                  </Text>
                </Flex>

                <Text mt={3} fontSize="sm" color="myGray.600">
                  适用产品：{modelNames || '通用所有产品'}
                </Text>
                <Text mt={1} fontSize="sm" color="myGray.500">
                  来源知识库：
                  {item.sourceName || datasetNameMap.get(item.datasetId) || '企业知识库'}
                </Text>

                <Flex mt={2} align="center" gap={2} wrap="wrap">
                  <Badge
                    colorScheme={
                      item.trainingStatus === 'ready'
                        ? 'green'
                        : item.trainingStatus === 'error'
                          ? 'red'
                          : item.trainingStatus === 'running'
                            ? 'blue'
                            : 'gray'
                    }
                  >
                    {item.trainingStatus === 'ready'
                      ? `训练完成 · ${item.dataAmount} 段`
                      : item.trainingStatus === 'running'
                        ? `训练中 · ${item.trainingAmount} 项`
                        : item.trainingStatus === 'error'
                          ? '训练异常'
                          : '等待生成知识'}
                  </Badge>

                  {item.trainingError && (
                    <Text maxW="100%" color="red.600" fontSize="xs" noOfLines={2}>
                      {item.trainingError}
                    </Text>
                  )}
                  {item.trainingStatus === 'error' && (
                    <Button
                      size="xs"
                      variant="link"
                      colorScheme="red"
                      onClick={() =>
                        void router.push(
                          `/dataset/detail?datasetId=${item.datasetId}&currentTab=dataCard&collectionId=${item.collectionId}`
                        )
                      }
                    >
                      查看错误并重试
                    </Button>
                  )}
                </Flex>

                <Flex mt={4} gap={2} wrap="wrap">
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

                  {(item.status === CustomerServiceKnowledgeStatusEnum.draft ||
                    item.status === CustomerServiceKnowledgeStatusEnum.rejected) &&
                    currentMember?.capabilities.editKnowledge && (
                      <Button
                        size="sm"
                        colorScheme="blue"
                        onClick={() => knowledgeAction('submit', item.id)}
                        isLoading={saving}
                      >
                        提交审核
                      </Button>
                    )}

                  {item.status === CustomerServiceKnowledgeStatusEnum.published &&
                    currentMember?.capabilities.reviewKnowledge && (
                      <Button
                        size="sm"
                        variant="whiteBase"
                        onClick={() => knowledgeAction('offline', item.id)}
                        isLoading={saving}
                      >
                        下架
                      </Button>
                    )}
                </Flex>
              </Box>
            );
          })}
        </SimpleGrid>
      )}

      {/* Form Modals */}
      <ProductMasterForm
        isOpen={productMasterDisclosure.isOpen}
        onClose={productMasterDisclosure.onClose}
      />
      <ManualForm isOpen={manualDisclosure.isOpen} onClose={manualDisclosure.onClose} />
      <FaqBatchEditor isOpen={faqBatchDisclosure.isOpen} onClose={faqBatchDisclosure.onClose} />
      <FaultCardForm isOpen={faultCardDisclosure.isOpen} onClose={faultCardDisclosure.onClose} />
    </Stack>
  );
};

export default KnowledgeStudio;
