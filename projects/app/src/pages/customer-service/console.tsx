import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Progress,
  SimpleGrid,
  Spinner,
  Stack,
  Tag,
  Text
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceMemberRoleEnum
} from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceProvider,
  useCustomerServiceContext,
  memberRoleMap
} from '@/pageComponents/customerService/context';
import CustomerServiceHeader from '@/pageComponents/customerService/CustomerServiceHeader';

/**
 * 智能客服管理门户与工作台枢纽大厅
 */
const WorkspacePortalContent: React.FC = () => {
  const router = useRouter();
  const {
    loading,
    effectiveRole,
    isAdmin,
    canEditKnowledge,
    canReviewKnowledge,
    canManageProjects,
    canManageRoles,
    catalog,
    projectData,
    knowledge,
    pendingKnowledge,
    publishedKnowledge,
    unsyncedProjects,
    systemHealth,
    todoCounts,
    frequentQuestions,
    roles
  } = useCustomerServiceContext();

  const draftCount = knowledge.filter(
    (item) => item.status === CustomerServiceKnowledgeStatusEnum.draft
  ).length;

  const rejectedCount = knowledge.filter(
    (item) => item.status === CustomerServiceKnowledgeStatusEnum.rejected
  ).length;

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>智能客服工作台门户 - 控制台</title>
      </Head>

      {/* Top Header */}
      <CustomerServiceHeader currentRoute="console" />

      <Box maxW="1600px" mx="auto" p={{ base: 4, md: 6, xl: 8 }}>
        <Stack spacing={8}>
          {/* Welcome Portal Banner */}
          <Box
            bg="linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #3B82F6 100%)"
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            color="white"
            shadow="md"
          >
            <Flex
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              gap={6}
              wrap="wrap"
            >
              <Box maxW="800px">
                <HStack spacing={2} mb={2}>
                  <Tag size="sm" colorScheme="blue" variant="solid" borderRadius="full">
                    {memberRoleMap[effectiveRole]}
                  </Tag>
                  <Tag size="sm" bg="whiteAlpha.300" color="white" borderRadius="full">
                    RBAC Trellis 治理体系
                  </Tag>
                </HStack>
                <Heading size="lg" fontWeight="800" letterSpacing="tight">
                  智能客服多岗位协同工作台
                </Heading>
                <Text mt={2} color="whiteAlpha.900" fontSize="sm" lineHeight="tall">
                  统一连接知识采编、双人审核复核、品类权限分配与管理员全景编排，实现从语料生产到多渠道服务交付的全链路闭环。
                </Text>
              </Box>

              <Flex gap={3} wrap="wrap">
                <Button
                  size="md"
                  variant="solid"
                  bg="white"
                  color="blue.700"
                  _hover={{ bg: 'blue.50' }}
                  leftIcon={<MyIcon name="core/dataset/datasetLight" w={4} />}
                  onClick={() => void router.push('/customer-service/editor')}
                >
                  去采编知识
                </Button>
                <Button
                  size="md"
                  bg="whiteAlpha.200"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  leftIcon={<MyIcon name="core/chat/chatLight" w={4} />}
                  onClick={() => void router.push('/customer-service')}
                >
                  打开客服终端
                </Button>
              </Flex>
            </Flex>

            {/* Quick Metrics Strip */}
            <SimpleGrid
              columns={{ base: 2, sm: 2, md: 4 }}
              gap={4}
              mt={6}
              pt={6}
              borderTopWidth="1px"
              borderColor="whiteAlpha.200"
            >
              <Box>
                <Text fontSize="xs" color="whiteAlpha.700">
                  知识总库
                </Text>
                <Heading size="md" mt={1}>
                  {knowledge.length}{' '}
                  <Text as="span" fontSize="xs" fontWeight="normal">
                    篇
                  </Text>
                </Heading>
                <Text fontSize="10px" color="whiteAlpha.700" mt={0.5}>
                  已发布上线 {publishedKnowledge.length} 篇
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color="whiteAlpha.700">
                  待审核队列
                </Text>
                <Heading size="md" mt={1}>
                  {pendingKnowledge.length}{' '}
                  <Text as="span" fontSize="xs" fontWeight="normal">
                    篇
                  </Text>
                </Heading>
                <Text fontSize="10px" color="whiteAlpha.700" mt={0.5}>
                  等待双人复核审批
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color="whiteAlpha.700">
                  覆盖产品型号
                </Text>
                <Heading size="md" mt={1}>
                  {catalog.models.length}{' '}
                  <Text as="span" fontSize="xs" fontWeight="normal">
                    款
                  </Text>
                </Heading>
                <Text fontSize="10px" color="whiteAlpha.700" mt={0.5}>
                  {catalog.categories.length} 大类 / {catalog.series.length} 系列
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color="whiteAlpha.700">
                  待处理未解决与人工
                </Text>
                <Heading size="md" mt={1}>
                  {todoCounts.unresolved + todoCounts.human}{' '}
                  <Text as="span" fontSize="xs" fontWeight="normal">
                    件
                  </Text>
                </Heading>
                <Text fontSize="10px" color="whiteAlpha.700" mt={0.5}>
                  未解决 {todoCounts.unresolved} / 转人工 {todoCounts.human}
                </Text>
              </Box>
            </SimpleGrid>
          </Box>

          {/* 4 Dedicated Workspaces Navigation Cards */}
          <Box>
            <Heading size="sm" color="myGray.800" mb={4}>
              🎛️ 专属业务工作台入口 (Dedicated Workspaces)
            </Heading>

            <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={5}>
              {/* Workspace 1: Knowledge Editor */}
              <Box
                bg="white"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="purple.200"
                p={5}
                shadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                _hover={{ shadow: 'md', borderColor: 'purple.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Box p={2.5} bg="purple.50" color="purple.600" borderRadius="lg">
                      <MyIcon name="core/dataset/datasetLight" w={6} />
                    </Box>
                    <Badge colorScheme="purple" borderRadius="full" px={2} py={0.5}>
                      采编岗
                    </Badge>
                  </Flex>
                  <Heading size="sm" color="myGray.900">
                    知识采编工作台
                  </Heading>
                  <Text fontSize="xs" color="myGray.500" mt={1.5} lineHeight="tall">
                    4 大结构化模板录入（主档/手册/FAQ/故障卡）、草稿箱流转与语义检索效果自测台。
                  </Text>
                </Box>

                <Box mt={5} pt={4} borderTopWidth="1px" borderColor="myGray.100">
                  <Flex justify="space-between" align="center" mb={3} fontSize="xs">
                    <Text color="myGray.500">草稿 {draftCount} 篇</Text>
                    {rejectedCount > 0 ? (
                      <Badge colorScheme="red">驳回待改 {rejectedCount}</Badge>
                    ) : (
                      <Text color="green.600">合规率 100%</Text>
                    )}
                  </Flex>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="purple"
                    variant={canEditKnowledge ? 'solid' : 'outline'}
                    isDisabled={!canEditKnowledge}
                    onClick={() => void router.push('/customer-service/editor')}
                  >
                    {canEditKnowledge ? '进入采编工作台 ➔' : '无权限 (仅采编员)'}
                  </Button>
                </Box>
              </Box>

              {/* Workspace 2: Knowledge Reviewer */}
              <Box
                bg="white"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="orange.200"
                p={5}
                shadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                _hover={{ shadow: 'md', borderColor: 'orange.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Box p={2.5} bg="orange.50" color="orange.600" borderRadius="lg">
                      <MyIcon name="common/check" w={6} />
                    </Box>
                    <Badge colorScheme="orange" borderRadius="full" px={2} py={0.5}>
                      审核岗
                    </Badge>
                  </Flex>
                  <Heading size="sm" color="myGray.900">
                    知识审核工作台
                  </Heading>
                  <Text fontSize="xs" color="myGray.500" mt={1.5} lineHeight="tall">
                    待审队列审查、新旧版本结构化 Diff
                    对比、受众影响面评估、沙盒试问与双人复核防自审。
                  </Text>
                </Box>

                <Box mt={5} pt={4} borderTopWidth="1px" borderColor="myGray.100">
                  <Flex justify="space-between" align="center" mb={3} fontSize="xs">
                    <Text color="myGray.500">待审队列</Text>
                    <Badge colorScheme={pendingKnowledge.length > 0 ? 'orange' : 'green'}>
                      {pendingKnowledge.length > 0 ? `${pendingKnowledge.length} 项待审` : '已清空'}
                    </Badge>
                  </Flex>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="orange"
                    variant={canReviewKnowledge ? 'solid' : 'outline'}
                    isDisabled={!canReviewKnowledge}
                    onClick={() => void router.push('/customer-service/reviewer')}
                  >
                    {canReviewKnowledge ? '进入审核工作台 ➔' : '无权限 (仅审核员)'}
                  </Button>
                </Box>
              </Box>

              {/* Workspace 3: Role & Permissions Center */}
              <Box
                bg="white"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="blue.200"
                p={5}
                shadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                _hover={{ shadow: 'md', borderColor: 'blue.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Box p={2.5} bg="blue.50" color="blue.600" borderRadius="lg">
                      <MyIcon name="support/user/usersLight" w={6} />
                    </Box>
                    <Badge colorScheme="blue" borderRadius="full" px={2} py={0.5}>
                      权限中心
                    </Badge>
                  </Flex>
                  <Heading size="sm" color="myGray.900">
                    岗位与权限中心
                  </Heading>
                  <Text fontSize="xs" color="myGray.500" mt={1.5} lineHeight="tall">
                    客服管理员/采编/审核三权分立配置、产品品类管辖范围划分与岗位流转合规审计日志。
                  </Text>
                </Box>

                <Box mt={5} pt={4} borderTopWidth="1px" borderColor="myGray.100">
                  <Flex justify="space-between" align="center" mb={3} fontSize="xs">
                    <Text color="myGray.500">在岗成员</Text>
                    <Badge colorScheme="blue">{roles.length} 人在岗</Badge>
                  </Flex>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="blue"
                    variant={canManageRoles ? 'solid' : 'outline'}
                    isDisabled={!canManageRoles}
                    onClick={() => void router.push('/customer-service/roles')}
                  >
                    {canManageRoles ? '进入权限中心 ➔' : '无权限 (仅管理员)'}
                  </Button>
                </Box>
              </Box>

              {/* Workspace 4: Admin Console */}
              <Box
                bg="white"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="gray.300"
                p={5}
                shadow="xs"
                display="flex"
                flexDirection="column"
                justifyContent="space-between"
                _hover={{ shadow: 'md', borderColor: 'gray.400', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <Box>
                  <Flex justify="space-between" align="center" mb={3}>
                    <Box p={2.5} bg="gray.100" color="gray.700" borderRadius="lg">
                      <MyIcon name="support/config/configLight" w={6} />
                    </Box>
                    <Badge colorScheme="gray" borderRadius="full" px={2} py={0.5}>
                      管理台
                    </Badge>
                  </Flex>
                  <Heading size="sm" color="myGray.900">
                    管理员全景控制台
                  </Heading>
                  <Text fontSize="xs" color="myGray.500" mt={1.5} lineHeight="tall">
                    客服项目编排、4级产品拓扑树、OpenAPI Key 绑定与限流、对话运营监控与应急下架。
                  </Text>
                </Box>

                <Box mt={5} pt={4} borderTopWidth="1px" borderColor="myGray.100">
                  <Flex justify="space-between" align="center" mb={3} fontSize="xs">
                    <Text color="myGray.500">项目/绑Key</Text>
                    <Text fontWeight="600" color="myGray.700">
                      {projectData.projects.length} 个 / {projectData.keyBindings.length} Key
                    </Text>
                  </Flex>
                  <Button
                    w="100%"
                    size="sm"
                    colorScheme="gray"
                    variant={canManageProjects ? 'solid' : 'outline'}
                    isDisabled={!canManageProjects}
                    onClick={() => void router.push('/customer-service/admin')}
                  >
                    {canManageProjects ? '进入全景控制台 ➔' : '无权限 (仅管理员)'}
                  </Button>
                </Box>
              </Box>
            </SimpleGrid>
          </Box>

          {/* Bottom Insights: High-frequency Questions & Health Readiness */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            {/* Widget 1: Frequent Questions Hotspot */}
            <Box
              bg="white"
              p={5}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="myGray.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center" mb={3}>
                <Heading size="xs" color="myGray.800">
                  🔥 客户高频提问与未解决热点
                </Heading>
                <Button
                  size="xs"
                  variant="link"
                  colorScheme="blue"
                  onClick={() => void router.push('/customer-service/admin?tab=operations')}
                >
                  查看全部运营记录
                </Button>
              </Flex>
              {frequentQuestions.list.length === 0 ? (
                <Text fontSize="xs" color="myGray.400" py={6} textAlign="center">
                  暂无高频聚合问题
                </Text>
              ) : (
                <Stack spacing={2.5}>
                  {frequentQuestions.list.slice(0, 4).map((item, idx) => (
                    <Flex
                      key={item.requestRecordId}
                      p={3}
                      bg="myGray.50"
                      borderRadius="lg"
                      justify="space-between"
                      align="center"
                      gap={3}
                    >
                      <Box minW={0} flex="1">
                        <Text fontSize="xs" fontWeight="600" noOfLines={1} color="myGray.800">
                          #{idx + 1} {item.question}
                        </Text>
                        <Text fontSize="10px" color="myGray.500" mt={0.5}>
                          {item.projectName} {item.modelName && `· ${item.modelName}`}
                        </Text>
                      </Box>
                      <HStack spacing={2}>
                        <Badge colorScheme="blue" fontSize="xs">
                          {item.count} 次提问
                        </Badge>
                        {item.unresolvedCount > 0 && (
                          <Badge colorScheme="red" fontSize="xs">
                            未解决 {item.unresolvedCount}
                          </Badge>
                        )}
                      </HStack>
                    </Flex>
                  ))}
                </Stack>
              )}
            </Box>

            {/* Widget 2: Health & Sync Readiness */}
            <Box
              bg="white"
              p={5}
              borderRadius="xl"
              borderWidth="1px"
              borderColor="myGray.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center" mb={3}>
                <Heading size="xs" color="myGray.800">
                  ⚙️ 服务就绪状态与知识库同步
                </Heading>
                <Badge colorScheme={systemHealth?.status === 'ok' ? 'green' : 'orange'}>
                  {systemHealth?.status === 'ok' ? '系统健康运行中' : '存在降级项目'}
                </Badge>
              </Flex>

              <Stack spacing={3}>
                <Box p={3} bg="myGray.50" borderRadius="lg">
                  <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="xs" color="myGray.600">
                      托管工作流与产品知识库同步
                    </Text>
                    <Badge colorScheme={unsyncedProjects.length === 0 ? 'green' : 'orange'}>
                      {unsyncedProjects.length === 0
                        ? '全量已同步'
                        : `${unsyncedProjects.length} 项目待同步`}
                    </Badge>
                  </Flex>
                  <Text fontSize="10px" color="myGray.400">
                    当产品型号知识库变更时，托管工作流需同步更新以注入最新知识库路由。
                  </Text>
                </Box>

                <Box p={3} bg="myGray.50" borderRadius="lg">
                  <Flex justify="space-between" align="center" mb={1}>
                    <Text fontSize="xs" color="myGray.600">
                      模型与知识库基础设施
                    </Text>
                    <Badge colorScheme="green">已连接 Mongo / 向量引擎</Badge>
                  </Flex>
                  <Text fontSize="10px" color="myGray.400">
                    LLM 模型可用: {systemHealth?.llmModelCount || 0} 个 · 向量/Embedding 模型可用:{' '}
                    {systemHealth?.embeddingModelCount || 0} 个
                  </Text>
                </Box>
              </Stack>
            </Box>
          </SimpleGrid>
        </Stack>
      </Box>
    </Box>
  );
};

/**
 * 智能客服控制台主页面（作为 4 个专属工作台的入口门户大厅）
 */
const CustomerServiceConsolePage = () => {
  return (
    <CustomerServiceProvider>
      <WorkspacePortalContent />
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
