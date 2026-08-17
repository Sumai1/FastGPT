import React, { useMemo } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Stack,
  Tag,
  Text
} from '@chakra-ui/react';
import type { KnowledgeItem } from '../types';
import { useCustomerServiceContext, audienceMap, knowledgeTypeMap } from '../context';
import { CustomerServiceKnowledgeTypeEnum } from '@fastgpt/global/core/customerService/constants';

interface AuditScopePreviewProps {
  knowledge: KnowledgeItem;
}

export const AuditScopePreview: React.FC<AuditScopePreviewProps> = ({ knowledge }) => {
  const { catalog, projectData, modelMap, seriesMap } = useCustomerServiceContext();

  // Find affected models
  const affectedModels = useMemo(() => {
    if (knowledge.modelIds.length === 0) {
      return catalog.models;
    }
    return catalog.models.filter((m) => knowledge.modelIds.includes(m.id));
  }, [catalog.models, knowledge.modelIds]);

  // Find affected projects
  const affectedProjects = useMemo(() => {
    return projectData.projects.filter((proj) => {
      if (knowledge.modelIds.length === 0) return true;
      // If project has models, check intersection
      if (proj.modelIds.length === 0) return true;
      return proj.modelIds.some((id) => knowledge.modelIds.includes(id));
    });
  }, [knowledge.modelIds, projectData.projects]);

  const isSafetyOrHazard =
    knowledge.knowledgeType === CustomerServiceKnowledgeTypeEnum.fault ||
    knowledge.knowledgeType === CustomerServiceKnowledgeTypeEnum.safety ||
    knowledge.title.includes('高压') ||
    knowledge.title.includes('危险');

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="sm">发布影响面预估 (Impact Scope)</Heading>
        <Badge colorScheme={knowledge.modelIds.length === 0 ? 'blue' : 'purple'}>
          {knowledge.modelIds.length === 0
            ? '全型号通用影响'
            : `影响 ${affectedModels.length} 款型号`}
        </Badge>
      </Flex>

      <Stack spacing={4}>
        {/* Safety alert if hazardous */}
        {isSafetyOrHazard && (
          <Alert status="warning" borderRadius="md" py={2} fontSize="xs">
            <AlertIcon />
            <Box>
              <Text fontWeight="600">涉及安全或高危故障处置规则</Text>
              <Text mt={0.5} color="myGray.600">
                审核通过后将直接影响前台阻断与转人工判断逻辑，请核对是否包含阻断拆机与高压安全警告。
              </Text>
            </Box>
          </Alert>
        )}

        {/* Affected Models List */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color="myGray.600" mb={2}>
            受影响的产品型号 ({affectedModels.length} 款)
          </Text>
          <Flex wrap="wrap" gap={2}>
            {affectedModels.slice(0, 12).map((m) => {
              const series = seriesMap.get(m.seriesId);
              return (
                <Tag key={m.id} size="sm" colorScheme="blue" variant="subtle">
                  {series ? `${series.name} / ` : ''}
                  {m.name}
                </Tag>
              );
            })}
            {affectedModels.length > 12 && (
              <Tag size="sm" colorScheme="gray">
                +{affectedModels.length - 12} 款更多型号...
              </Tag>
            )}
            {affectedModels.length === 0 && (
              <Text fontSize="xs" color="myGray.400">
                未绑定具体型号（通用知识）
              </Text>
            )}
          </Flex>
        </Box>

        <Divider />

        {/* Affected Customer Service Projects */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color="myGray.600" mb={2}>
            受影响的智能客服服务 ({affectedProjects.length} 个)
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
            {affectedProjects.map((p) => (
              <Flex
                key={p.id}
                p={2.5}
                bg="myGray.50"
                borderRadius="md"
                justify="space-between"
                align="center"
              >
                <Box minW={0} flex="1">
                  <Text fontSize="xs" fontWeight="600" noOfLines={1}>
                    {p.name}
                  </Text>
                  <Text fontSize="10px" color="myGray.500">
                    默认受众: {audienceMap[p.defaultAudience]}
                  </Text>
                </Box>
                <Badge colorScheme={p.status === 'active' ? 'green' : 'gray'} size="xs">
                  {p.status === 'active' ? '运行中' : '已停用'}
                </Badge>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>

        <Divider />

        {/* Audience Permission Matrix */}
        <Box>
          <Text fontSize="xs" fontWeight="600" color="myGray.600" mb={2}>
            受众可见范围分级矩阵
          </Text>
          <HStack spacing={3}>
            <Box
              p={2}
              borderRadius="md"
              flex="1"
              textAlign="center"
              bg={knowledge.audienceLevel === 'public' ? 'green.50' : 'myGray.50'}
              borderWidth="1px"
              borderColor={knowledge.audienceLevel === 'public' ? 'green.400' : 'myGray.200'}
            >
              <Text
                fontSize="xs"
                fontWeight="600"
                color={knowledge.audienceLevel === 'public' ? 'green.700' : 'myGray.500'}
              >
                普通客户 (Public)
              </Text>
              <Text fontSize="10px" color="myGray.400">
                {knowledge.audienceLevel === 'public' ? '✅ 允许查阅' : '❌ 权限收窄不展示'}
              </Text>
            </Box>

            <Box
              p={2}
              borderRadius="md"
              flex="1"
              textAlign="center"
              bg={
                knowledge.audienceLevel === 'dealer' || knowledge.audienceLevel === 'public'
                  ? 'blue.50'
                  : 'myGray.50'
              }
              borderWidth="1px"
              borderColor={knowledge.audienceLevel === 'dealer' ? 'blue.400' : 'myGray.200'}
            >
              <Text fontSize="xs" fontWeight="600" color="blue.700">
                设备运营商 (Dealer)
              </Text>
              <Text fontSize="10px" color="myGray.400">
                ✅ 允许查阅
              </Text>
            </Box>

            <Box
              p={2}
              borderRadius="md"
              flex="1"
              textAlign="center"
              bg="purple.50"
              borderWidth="1px"
              borderColor="purple.300"
            >
              <Text fontSize="xs" fontWeight="600" color="purple.700">
                内部售后 (Internal)
              </Text>
              <Text fontSize="10px" color="myGray.400">
                ✅ 全权限查阅
              </Text>
            </Box>
          </HStack>
        </Box>
      </Stack>
    </Box>
  );
};

export default AuditScopePreview;
