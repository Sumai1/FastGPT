import React from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Table,
  Tag,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import {
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceProductStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext, statusMap } from '../context';

interface ProductDetailCardProps {
  modelId: string;
}

export const ProductDetailCard: React.FC<ProductDetailCardProps> = ({ modelId }) => {
  const router = useRouter();
  const {
    catalog,
    modelMap,
    seriesMap,
    categoryMap,
    knowledge,
    datasetNameMap,
    currentMember,
    openDatasetBinding,
    toggleProductModelStatus,
    saving
  } = useCustomerServiceContext();

  const model = modelMap.get(modelId);

  if (!model) {
    return (
      <Box
        p={8}
        bg="white"
        borderWidth="1px"
        borderColor="myGray.200"
        borderRadius="xl"
        textAlign="center"
      >
        <Text color="myGray.400" fontSize="sm">
          请在左侧产品拓扑树中选择具体型号查看详情与知识库配置
        </Text>
      </Box>
    );
  }

  const series = seriesMap.get(model.seriesId);
  const category = series ? categoryMap.get(series.categoryId) : undefined;
  const versions = catalog.versions.filter((v) => v.modelId === model.id);
  const relatedKnowledge = knowledge.filter(
    (k) => k.modelIds.length === 0 || k.modelIds.includes(model.id)
  );
  const publishedCount = relatedKnowledge.filter(
    (k) => k.status === CustomerServiceKnowledgeStatusEnum.published
  ).length;
  const pendingCount = relatedKnowledge.filter(
    (k) => k.status === CustomerServiceKnowledgeStatusEnum.pending
  ).length;

  const statusConfig = statusMap[model.status] || { label: model.status, color: 'gray' };

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={6}>
      {/* Header Info */}
      <Flex justify="space-between" align="start" gap={4} wrap="wrap">
        <Box minW={0} flex="1">
          <Flex align="center" gap={3} wrap="wrap">
            <Heading size="md">{model.name}</Heading>
            <Badge colorScheme={statusConfig.color}>{statusConfig.label}</Badge>
            <Badge variant="outline">编码: {model.modelCode}</Badge>
          </Flex>
          <Text mt={2} fontSize="sm" color="myGray.500">
            所属层级：{[category?.name, series?.name, model.modelCode].filter(Boolean).join(' ➔ ')}
          </Text>
          {model.aliases.length > 0 && (
            <Flex mt={2} gap={1.5} align="center" wrap="wrap">
              <Text fontSize="xs" color="myGray.500">
                别名/关键词：
              </Text>
              {model.aliases.map((alias, idx) => (
                <Tag key={idx} size="sm" colorScheme="gray">
                  {alias}
                </Tag>
              ))}
            </Flex>
          )}
        </Box>

        {/* Action Buttons */}
        <HStack spacing={2} wrap="wrap">
          {currentMember?.capabilities.manageProjects && (
            <Button size="sm" colorScheme="blue" onClick={() => openDatasetBinding(model.id)}>
              绑定新知识库
            </Button>
          )}
          {model.status !== CustomerServiceProductStatusEnum.discontinued &&
            currentMember?.capabilities.manageProjects && (
              <Button
                size="sm"
                variant="whiteBase"
                isLoading={saving}
                onClick={() => toggleProductModelStatus(model.id, model.status)}
              >
                {model.status === CustomerServiceProductStatusEnum.active
                  ? '停用此型号'
                  : '启用此型号'}
              </Button>
            )}
        </HStack>
      </Flex>

      {/* KPI Stats */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={3} mt={5}>
        <Box p={3.5} bg="myGray.50" borderRadius="lg">
          <Text fontSize="xs" color="myGray.500">
            软硬件版本数
          </Text>
          <Text mt={1} fontSize="xl" fontWeight="700" color="myGray.800">
            {versions.length}
          </Text>
        </Box>
        <Box p={3.5} bg="myGray.50" borderRadius="lg">
          <Text fontSize="xs" color="myGray.500">
            关联客服资料
          </Text>
          <Text mt={1} fontSize="xl" fontWeight="700" color="myGray.800">
            {relatedKnowledge.length}
          </Text>
        </Box>
        <Box p={3.5} bg="green.50" borderRadius="lg">
          <Text fontSize="xs" color="green.700">
            已正式发布知识
          </Text>
          <Text mt={1} fontSize="xl" fontWeight="700" color="green.600">
            {publishedCount}
          </Text>
        </Box>
        <Box p={3.5} bg="orange.50" borderRadius="lg">
          <Text fontSize="xs" color="orange.700">
            待审核草稿
          </Text>
          <Text mt={1} fontSize="xl" fontWeight="700" color="orange.600">
            {pendingCount}
          </Text>
        </Box>
      </SimpleGrid>

      <Divider my={5} />

      {/* Section 1: Linked FastGPT Datasets */}
      <Box mb={6}>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="xs" color="myGray.700">
            已绑定的 FastGPT 知识库 ({model.datasetIds.length})
          </Heading>
          <Button size="xs" variant="link" onClick={() => void router.push('/dataset/list')}>
            管理知识库列表
          </Button>
        </Flex>
        {model.datasetIds.length === 0 ? (
          <Box p={4} bg="red.50" borderRadius="md" borderWidth="1px" borderColor="red.200">
            <Text color="red.700" fontSize="xs" fontWeight="600">
              ⚠️ 当前产品尚未绑定任何知识库！
            </Text>
            <Text mt={1} color="myGray.600" fontSize="xs">
              没有知识库的产品无法被纳入智能客服工作流问答，请点击上方“绑定新知识库”进行关联。
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
            {model.datasetIds.map((dsId) => {
              const name = datasetNameMap.get(dsId) || `知识库 (${dsId.slice(-6)})`;
              return (
                <Flex
                  key={dsId}
                  p={2.5}
                  bg="myGray.50"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor="myGray.200"
                  justify="space-between"
                  align="center"
                >
                  <Text fontSize="xs" fontWeight="600" noOfLines={1}>
                    📚 {name}
                  </Text>
                  <Button
                    size="xs"
                    variant="link"
                    onClick={() => void router.push(`/dataset/detail?datasetId=${dsId}`)}
                  >
                    查看
                  </Button>
                </Flex>
              );
            })}
          </SimpleGrid>
        )}
      </Box>

      {/* Section 2: Versions Breakdown */}
      <Box>
        <Heading size="xs" color="myGray.700" mb={3}>
          软硬件版本履历清单 ({versions.length})
        </Heading>
        {versions.length === 0 ? (
          <Text fontSize="xs" color="myGray.400">
            暂未登记具体软硬件版本。
          </Text>
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead bg="myGray.50">
                <Tr>
                  <Th fontSize="10px">版本类型</Th>
                  <Th fontSize="10px">版本编码</Th>
                  <Th fontSize="10px">版本名称</Th>
                  <Th fontSize="10px">生效时间</Th>
                  <Th fontSize="10px">状态</Th>
                </Tr>
              </Thead>
              <Tbody fontSize="xs">
                {versions.map((ver) => (
                  <Tr key={ver.id}>
                    <Td>
                      <Badge colorScheme={ver.type === 'software' ? 'cyan' : 'orange'}>
                        {ver.type === 'software' ? '软件固件' : '硬件结构'}
                      </Badge>
                    </Td>
                    <Td fontWeight="600">{ver.versionCode}</Td>
                    <Td>{ver.name}</Td>
                    <Td color="myGray.500">
                      {ver.effectiveFrom
                        ? new Date(ver.effectiveFrom).toLocaleDateString()
                        : '永久'}
                    </Td>
                    <Td>
                      <Badge colorScheme={ver.status === 'active' ? 'green' : 'gray'}>
                        {ver.status === 'active' ? '生效中' : '已停用'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ProductDetailCard;
