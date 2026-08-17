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
  Text,
  useDisclosure
} from '@chakra-ui/react';
import { useCustomerServiceContext, knowledgeTypeMap, audienceMap } from '../context';
import ProductMasterForm from '../KnowledgeStudio/ProductMasterForm';
import ManualForm from '../KnowledgeStudio/ManualForm';
import FaqBatchEditor from '../KnowledgeStudio/FaqBatchEditor';
import FaultCardForm from '../KnowledgeStudio/FaultCardForm';

const MetricCard = ({
  label,
  value,
  help,
  color = 'primary.600'
}: {
  label: string;
  value: number;
  help: string;
  color?: string;
}) => (
  <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
    <Text color="myGray.500" fontSize="xs">
      {label}
    </Text>
    <Text mt={2} fontSize="3xl" lineHeight="1" fontWeight="700" color={color}>
      {value}
    </Text>
    <Text mt={3} color="myGray.500" fontSize="xs">
      {help}
    </Text>
  </Box>
);

export const OverviewWorkspace: React.FC = () => {
  const router = useRouter();
  const {
    currentMember,
    activeProjects,
    catalog,
    publishedKnowledge,
    pendingKnowledge,
    todoCounts,
    trainingErrors,
    unsyncedProjects,
    systemHealth,
    createDisclosure,
    knowledgeCreateDisclosure,
    navigateSection
  } = useCustomerServiceContext();

  const productMasterDisclosure = useDisclosure();
  const manualDisclosure = useDisclosure();
  const faqBatchDisclosure = useDisclosure();
  const faultCardDisclosure = useDisclosure();

  return (
    <Stack spacing={6}>
      {/* Hero Welcome Banner */}
      <Box
        color="white"
        borderRadius="2xl"
        p={{ base: 6, lg: 8 }}
        bgGradient="linear(to-r, #3155D9, #5678F0)"
      >
        <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={5} wrap="wrap">
          <Box>
            <Text fontSize="xs" opacity={0.8} letterSpacing="wider">
              企业无人自助设备 · 智能客服与知识治理系统
            </Text>
            <Heading mt={2} size="lg">
              智能客服管理运营控制台
            </Heading>
            <Text mt={2} opacity={0.88} maxW="680px" fontSize="sm">
              标准化录入产品主档、操作规程、FAQ
              与售后排查卡，统一流转审核与检索沙盒试问，实现端到端服务体验。
            </Text>
          </Box>
          <Flex gap={3} wrap="wrap">
            {currentMember?.capabilities.manageProjects && (
              <Button
                bg="white"
                color="primary.700"
                _hover={{ bg: 'whiteAlpha.900' }}
                onClick={createDisclosure.onOpen}
              >
                创建智能客服
              </Button>
            )}
            <Button
              variant="outline"
              borderColor="whiteAlpha.700"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => void router.push('/customer-service')}
            >
              打开客户试用端
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* 4 Top Metric Cards */}
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
        <MetricCard
          label="运行中的智能客服"
          value={activeProjects.length}
          help="可直接对外提供服务"
        />
        <MetricCard
          label="已管理产品型号"
          value={catalog.models.length}
          help="已纳入客服体系的设备型号"
        />
        <MetricCard
          label="已生效发布知识"
          value={publishedKnowledge.length}
          help="当前正参与正式语义检索"
          color="green.500"
        />
        <MetricCard
          label="待审核知识草稿"
          value={pendingKnowledge.length}
          help="需要知识审核人员处理"
          color={pendingKnowledge.length > 0 ? 'orange.500' : 'myGray.500'}
        />
      </SimpleGrid>

      {/* Main Grid: Urgent Todos + Quick Launch Portals */}
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        {/* Left: Urgent Action / Todo Queue */}
        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="myGray.200" p={5}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="sm">待办事项与运行告警 (Action Required)</Heading>
            {currentMember?.capabilities.reviewKnowledge && pendingKnowledge.length > 0 && (
              <Button
                size="xs"
                colorScheme="orange"
                variant="outline"
                onClick={() => navigateSection('review')}
              >
                进入审核台 ({pendingKnowledge.length})
              </Button>
            )}
          </Flex>

          <Stack spacing={3}>
            {/* Unresolved Chat Followup */}
            {(todoCounts.unresolved > 0 || todoCounts.noAnswer > 0 || todoCounts.human > 0) && (
              <Flex p={3} borderRadius="lg" bg="blue.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600" fontSize="sm" color="blue.900">
                    客服对话待跟进与转人工工单
                  </Text>
                  <Text fontSize="xs" color="myGray.600">
                    未解决反馈 {todoCounts.unresolved} · 资料不足 {todoCounts.noAnswer} · 转人工申请{' '}
                    {todoCounts.human}
                  </Text>
                </Box>
                <Button size="xs" colorScheme="blue" onClick={() => navigateSection('operations')}>
                  去处理
                </Button>
              </Flex>
            )}

            {/* Pending Reviews */}
            {pendingKnowledge.length > 0 ? (
              pendingKnowledge.slice(0, 3).map((item) => (
                <Flex key={item.id} p={3} borderRadius="lg" bg="orange.50" align="center" gap={3}>
                  <Box flex="1" minW={0}>
                    <Text fontWeight="600" fontSize="sm" noOfLines={1} color="orange.900">
                      待审知识：《{item.title}》
                    </Text>
                    <Text fontSize="xs" color="myGray.600">
                      {knowledgeTypeMap[item.knowledgeType]} · {audienceMap[item.audienceLevel]} · V
                      {item.version}
                    </Text>
                  </Box>
                  <Button size="xs" colorScheme="orange" onClick={() => navigateSection('review')}>
                    去审核
                  </Button>
                </Flex>
              ))
            ) : (
              <Text color="myGray.400" fontSize="xs">
                当前暂无待审核知识。
              </Text>
            )}

            {/* Models missing datasets */}
            {catalog.models.some((model) => model.datasetIds.length === 0) && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600" fontSize="sm" color="red.800">
                    部分产品型号尚未绑定知识库
                  </Text>
                  <Text fontSize="xs" color="red.600">
                    未绑定知识库的型号无法被智能客服检索，请及时配置。
                  </Text>
                </Box>
                <Button size="xs" colorScheme="red" onClick={() => navigateSection('products')}>
                  去绑定
                </Button>
              </Flex>
            )}

            {/* Training Errors */}
            {trainingErrors.length > 0 && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600" fontSize="sm" color="red.800">
                    {trainingErrors.length} 份资料在 FastGPT 训练异常
                  </Text>
                  <Text fontSize="xs" color="red.600">
                    请到知识中心查看具体切片错误并重试。
                  </Text>
                </Box>
                <Button size="xs" colorScheme="red" onClick={() => navigateSection('knowledge')}>
                  去重试
                </Button>
              </Flex>
            )}

            {/* Unsynced Workflows */}
            {unsyncedProjects.length > 0 && (
              <Flex p={3} borderRadius="lg" bg="orange.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600" fontSize="sm" color="orange.800">
                    {unsyncedProjects.length} 个智能客服知识范围待同步
                  </Text>
                  <Text fontSize="xs" color="myGray.600">
                    旧版服务仍正常运行，可前往客服管理一键同步。
                  </Text>
                </Box>
                {currentMember?.capabilities.manageProjects && (
                  <Button
                    size="xs"
                    colorScheme="orange"
                    onClick={() => navigateSection('assistants')}
                  >
                    同步
                  </Button>
                )}
              </Flex>
            )}

            {/* System Health */}
            {systemHealth?.status === 'degraded' && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600" fontSize="sm" color="red.800">
                    系统运行条件降级
                  </Text>
                  <Text fontSize="xs" color="red.600">
                    {systemHealth.messages.join('；')}
                  </Text>
                </Box>
              </Flex>
            )}
          </Stack>
        </Box>

        {/* Right: Quick Launch Portals */}
        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="myGray.200" p={5}>
          <Heading size="sm" mb={4}>
            知识生产与治理快捷通道
          </Heading>

          <SimpleGrid columns={{ base: 1, sm: 2 }} gap={3}>
            {currentMember?.capabilities.editKnowledge && (
              <>
                <Box
                  p={3.5}
                  borderWidth="1px"
                  borderColor="blue.200"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'blue.50', borderColor: 'blue.400' }}
                  onClick={productMasterDisclosure.onOpen}
                >
                  <Text fontWeight="700" fontSize="xs" color="blue.700">
                    📄 新建产品主档
                  </Text>
                  <Text mt={1} color="myGray.500" fontSize="11px">
                    录入功率/尺寸/网络/耗材/质保标准规格
                  </Text>
                </Box>

                <Box
                  p={3.5}
                  borderWidth="1px"
                  borderColor="green.200"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'green.50', borderColor: 'green.400' }}
                  onClick={manualDisclosure.onOpen}
                >
                  <Text fontWeight="700" fontSize="xs" color="green.700">
                    🛠️ 新建操作说明
                  </Text>
                  <Text mt={1} color="myGray.500" fontSize="11px">
                    录入前提/步骤/完成标志/防错警告
                  </Text>
                </Box>

                <Box
                  p={3.5}
                  borderWidth="1px"
                  borderColor="purple.200"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'purple.50', borderColor: 'purple.400' }}
                  onClick={faqBatchDisclosure.onOpen}
                >
                  <Text fontWeight="700" fontSize="xs" color="purple.700">
                    ❓ FAQ 批量导入
                  </Text>
                  <Text mt={1} color="myGray.500" fontSize="11px">
                    批量解析多相似问与核心简答
                  </Text>
                </Box>

                <Box
                  p={3.5}
                  borderWidth="1px"
                  borderColor="red.200"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ bg: 'red.50', borderColor: 'red.400' }}
                  onClick={faultCardDisclosure.onOpen}
                >
                  <Text fontWeight="700" fontSize="xs" color="red.700">
                    ⚠️ 新建售后故障卡
                  </Text>
                  <Text mt={1} color="myGray.500" fontSize="11px">
                    错误码/危险级别/排查树/工单规则
                  </Text>
                </Box>
              </>
            )}

            <Box
              p={3.5}
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="lg"
              cursor="pointer"
              _hover={{ bg: 'myGray.50', borderColor: 'primary.400' }}
              onClick={() => navigateSection('products')}
            >
              <Text fontWeight="700" fontSize="xs" color="myGray.800">
                🌳 产品四级拓扑树
              </Text>
              <Text mt={1} color="myGray.500" fontSize="11px">
                大类 ➔ 系列 ➔ 型号 ➔ 版本钻取看板
              </Text>
            </Box>

            <Box
              p={3.5}
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="lg"
              cursor="pointer"
              _hover={{ bg: 'myGray.50', borderColor: 'primary.400' }}
              onClick={() => navigateSection('operations')}
            >
              <Text fontWeight="700" fontSize="xs" color="myGray.800">
                📊 对话运营与 Badcase
              </Text>
              <Text mt={1} color="myGray.500" fontSize="11px">
                满意度/转人工归因/一键转知识草稿
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </SimpleGrid>

      {/* Modals */}
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

export default OverviewWorkspace;
