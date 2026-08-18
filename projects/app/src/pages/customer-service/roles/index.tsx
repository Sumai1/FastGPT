import React, { useState } from 'react';
import Head from 'next/head';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import {
  CustomerServiceProvider,
  useCustomerServiceContext,
  memberRoleMap
} from '@/pageComponents/customerService/context';
import CustomerServiceHeader from '@/pageComponents/customerService/CustomerServiceHeader';

/**
 * 岗位与权限中心核心内容
 */
const RolesCenterContent: React.FC = () => {
  const toast = useToast();
  const {
    roles,
    roleMembers,
    roleAudits,
    catalog,
    modelMap,
    categoryMap,
    loading,
    saving,
    openRoleManager,
    saveMemberRole,
    roleDisclosure,
    roleTmbId,
    setRoleTmbId,
    roleType,
    setRoleType,
    roleReason,
    setRoleReason,
    roleAllowedCategoryIds,
    setRoleAllowedCategoryIds,
    roleAllowedModelIds,
    setRoleAllowedModelIds,
    canManageRoles
  } = useCustomerServiceContext();

  const [activeTab, setActiveTab] = useState<'matrix' | 'audits'>('matrix');

  // Compute metrics
  const adminCount = roles.filter(
    (r) =>
      r.role === CustomerServiceMemberRoleEnum.customerServiceAdmin &&
      r.status === CustomerServiceResourceStatusEnum.active
  ).length;

  const editorCount = roles.filter(
    (r) =>
      r.role === CustomerServiceMemberRoleEnum.knowledgeEditor &&
      r.status === CustomerServiceResourceStatusEnum.active
  ).length;

  const reviewerCount = roles.filter(
    (r) =>
      r.role === CustomerServiceMemberRoleEnum.knowledgeReviewer &&
      r.status === CustomerServiceResourceStatusEnum.active
  ).length;

  const handleOpenAssignModal = (
    tmbId = '',
    currentRole = CustomerServiceMemberRoleEnum.knowledgeEditor
  ) => {
    setRoleTmbId(tmbId);
    setRoleType(currentRole);
    setRoleReason('调整客服日常分工与品类管辖范围');
    setRoleAllowedCategoryIds([]);
    setRoleAllowedModelIds([]);
    void openRoleManager();
  };

  const handleToggleCategory = (catId: string) => {
    setRoleAllowedCategoryIds(
      roleAllowedCategoryIds.includes(catId)
        ? roleAllowedCategoryIds.filter((id) => id !== catId)
        : [...roleAllowedCategoryIds, catId]
    );
  };

  const handleToggleModel = (modelId: string) => {
    setRoleAllowedModelIds(
      roleAllowedModelIds.includes(modelId)
        ? roleAllowedModelIds.filter((id) => id !== modelId)
        : [...roleAllowedModelIds, modelId]
    );
  };

  return (
    <Box minH="100vh" bg="myGray.50">
      <Head>
        <title>岗位与权限中心 - 智能客服</title>
      </Head>

      {/* Top Header */}
      <CustomerServiceHeader currentRoute="roles" />

      <Box maxW="1600px" mx="auto" p={{ base: 4, md: 6, xl: 8 }}>
        <Stack spacing={6}>
          {/* Header Banner */}
          <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={4} wrap="wrap">
            <Box>
              <Heading size="md" color="myGray.900">
                👥 客服岗位与权限中心 (Role & Permissions Center)
              </Heading>
              <Text mt={1} color="myGray.500" fontSize="sm">
                分配客服管理员、知识采编员、知识审核员岗位，严格践行采编与审核天然互斥及品类范围约束。
              </Text>
            </Box>
            {canManageRoles && (
              <Button
                colorScheme="blue"
                leftIcon={<MyIcon name="support/user/usersLight" w={4} />}
                onClick={() => handleOpenAssignModal()}
              >
                分配客服岗位与范围
              </Button>
            )}
          </Flex>

          {/* Metric Cards */}
          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
            <Box
              p={5}
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="blue.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="xs" color="myGray.500" fontWeight="600">
                    🛡️ 客服管理员
                  </Text>
                  <Heading size="lg" color="blue.600" mt={1}>
                    {adminCount}
                  </Heading>
                </Box>
                <Badge colorScheme="blue" borderRadius="full" px={2} py={0.5} fontSize="xs">
                  全权管理
                </Badge>
              </Flex>
              <Text fontSize="10px" color="myGray.400" mt={2}>
                项目编排、产品树、Key配额与成员权限
              </Text>
            </Box>

            <Box
              p={5}
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="purple.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="xs" color="myGray.500" fontWeight="600">
                    📝 知识采编员
                  </Text>
                  <Heading size="lg" color="purple.600" mt={1}>
                    {editorCount}
                  </Heading>
                </Box>
                <Badge colorScheme="purple" borderRadius="full" px={2} py={0.5} fontSize="xs">
                  草稿采编
                </Badge>
              </Flex>
              <Text fontSize="10px" color="myGray.400" mt={2}>
                结构化模板录入、草稿维护与检索自测
              </Text>
            </Box>

            <Box
              p={5}
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="orange.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="xs" color="myGray.500" fontWeight="600">
                    🔍 知识审核员
                  </Text>
                  <Heading size="lg" color="orange.600" mt={1}>
                    {reviewerCount}
                  </Heading>
                </Box>
                <Badge colorScheme="orange" borderRadius="full" px={2} py={0.5} fontSize="xs">
                  双人复核
                </Badge>
              </Flex>
              <Text fontSize="10px" color="myGray.400" mt={2}>
                Diff对比、影响面审查、试问与发布上线
              </Text>
            </Box>

            <Box
              p={5}
              bg="white"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="green.200"
              shadow="xs"
            >
              <Flex justify="space-between" align="center">
                <Box>
                  <Text fontSize="xs" color="myGray.500" fontWeight="600">
                    ⚖️ 岗位互斥合规率
                  </Text>
                  <Heading size="lg" color="green.600" mt={1}>
                    100%
                  </Heading>
                </Box>
                <Badge colorScheme="green" borderRadius="full" px={2} py={0.5} fontSize="xs">
                  天然互斥
                </Badge>
              </Flex>
              <Text fontSize="10px" color="myGray.400" mt={2}>
                单成员单岗位模型，杜绝自审自发风险
              </Text>
            </Box>
          </SimpleGrid>

          {/* Navigation Toggle */}
          <Flex gap={2} borderBottomWidth="1px" borderColor="myGray.200" pb={3}>
            <Button
              size="sm"
              variant={activeTab === 'matrix' ? 'solid' : 'ghost'}
              colorScheme={activeTab === 'matrix' ? 'blue' : 'gray'}
              onClick={() => setActiveTab('matrix')}
            >
              团队成员岗位矩阵 ({roles.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === 'audits' ? 'solid' : 'ghost'}
              colorScheme={activeTab === 'audits' ? 'blue' : 'gray'}
              onClick={() => setActiveTab('audits')}
            >
              岗位流转审计日志 ({roleAudits.length})
            </Button>
          </Flex>

          {/* Tab 1: Role Matrix Table */}
          {activeTab === 'matrix' && (
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="xl"
              overflow="hidden"
              shadow="xs"
            >
              {loading ? (
                <Flex minH="300px" align="center" justify="center">
                  <Spinner color="primary.600" />
                </Flex>
              ) : roles.length === 0 ? (
                <Flex
                  minH="240px"
                  align="center"
                  justify="center"
                  direction="column"
                  p={8}
                  textAlign="center"
                >
                  <Heading size="sm" color="myGray.700">
                    暂未分配任何客服岗位
                  </Heading>
                  <Text mt={2} color="myGray.500" fontSize="sm">
                    点击右上角“分配客服岗位与范围”为团队成员配置职责。
                  </Text>
                </Flex>
              ) : (
                <Table variant="simple" size="md">
                  <Thead bg="myGray.50">
                    <Tr>
                      <Th>成员姓名</Th>
                      <Th>当前客服业务岗位</Th>
                      <Th>管辖产品范围</Th>
                      <Th>状态</Th>
                      <Th>最近变更原因</Th>
                      <Th>更新时间</Th>
                      {canManageRoles && <Th textAlign="right">操作</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {roles.map((item) => {
                      const categoryNames = item.allowedCategoryIds
                        .map((id) => categoryMap.get(id)?.name)
                        .filter(Boolean)
                        .join('、');
                      const modelNames = item.allowedModelIds
                        .map((id) => modelMap.get(id)?.name)
                        .filter(Boolean)
                        .join('、');

                      const scopeText =
                        categoryNames || modelNames
                          ? [
                              categoryNames && `大类: ${categoryNames}`,
                              modelNames && `型号: ${modelNames}`
                            ]
                              .filter(Boolean)
                              .join(' | ')
                          : '全品类与型号 (全局)';

                      const roleColor =
                        item.role === CustomerServiceMemberRoleEnum.customerServiceAdmin
                          ? 'blue'
                          : item.role === CustomerServiceMemberRoleEnum.knowledgeEditor
                            ? 'purple'
                            : 'orange';

                      return (
                        <Tr key={item.id} _hover={{ bg: 'myGray.50' }}>
                          <Td>
                            <Flex align="center" gap={3}>
                              <Avatar size="sm" name={item.memberName} src={item.memberAvatar} />
                              <Box>
                                <Text fontWeight="600" fontSize="sm">
                                  {item.memberName}
                                </Text>
                              </Box>
                            </Flex>
                          </Td>
                          <Td>
                            <Badge colorScheme={roleColor} px={2.5} py={0.5} borderRadius="full">
                              {memberRoleMap[item.role]}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color="myGray.700" maxW="300px" noOfLines={2}>
                              {scopeText}
                            </Text>
                          </Td>
                          <Td>
                            <Badge
                              colorScheme={
                                item.status === CustomerServiceResourceStatusEnum.active
                                  ? 'green'
                                  : 'gray'
                              }
                            >
                              {item.status === CustomerServiceResourceStatusEnum.active
                                ? '运行中'
                                : '已停用'}
                            </Badge>
                          </Td>
                          <Td>
                            <Text fontSize="xs" color="myGray.500" maxW="200px" noOfLines={2}>
                              {item.reason || '-'}
                            </Text>
                          </Td>
                          <Td fontSize="xs" color="myGray.500">
                            {new Date(item.updateTime).toLocaleString()}
                          </Td>
                          {canManageRoles && (
                            <Td textAlign="right">
                              <Button
                                size="xs"
                                variant="whiteBase"
                                onClick={() => handleOpenAssignModal(item.tmbId, item.role)}
                              >
                                调整范围与岗位
                              </Button>
                            </Td>
                          )}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              )}
            </Box>
          )}

          {/* Tab 2: Role Change Audit History Log Table */}
          {activeTab === 'audits' && (
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="xl"
              overflow="hidden"
              shadow="xs"
            >
              {roleAudits.length === 0 ? (
                <Flex
                  minH="240px"
                  align="center"
                  justify="center"
                  direction="column"
                  p={8}
                  textAlign="center"
                >
                  <Heading size="sm" color="myGray.700">
                    暂无岗位流转审计日志
                  </Heading>
                  <Text mt={2} color="myGray.500" fontSize="sm">
                    岗位分配、调整与停用操作将自动生成合规审计记录。
                  </Text>
                </Flex>
              ) : (
                <Table variant="simple" size="sm">
                  <Thead bg="myGray.50">
                    <Tr>
                      <Th>操作时间</Th>
                      <Th>操作人</Th>
                      <Th>目标成员</Th>
                      <Th>动作</Th>
                      <Th>原岗位 ➔ 新岗位</Th>
                      <Th>状态流转</Th>
                      <Th>变更说明与原因</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {roleAudits.map((audit) => (
                      <Tr key={audit.id} _hover={{ bg: 'myGray.50' }}>
                        <Td fontSize="xs" color="myGray.600">
                          {new Date(audit.createTime).toLocaleString()}
                        </Td>
                        <Td>
                          <Flex align="center" gap={2}>
                            <Avatar
                              size="xs"
                              name={audit.operatorName}
                              src={audit.operatorAvatar}
                            />
                            <Text fontSize="xs" fontWeight="500">
                              {audit.operatorName}
                            </Text>
                          </Flex>
                        </Td>
                        <Td>
                          <Flex align="center" gap={2}>
                            <Avatar size="xs" name={audit.memberName} src={audit.memberAvatar} />
                            <Text fontSize="xs" fontWeight="600">
                              {audit.memberName}
                            </Text>
                          </Flex>
                        </Td>
                        <Td>
                          <Badge colorScheme={audit.action === 'set' ? 'blue' : 'gray'}>
                            {audit.action === 'set' ? '岗位分配' : '岗位停用'}
                          </Badge>
                        </Td>
                        <Td fontSize="xs">
                          <HStack spacing={1}>
                            <Text color="myGray.500">
                              {audit.fromRole ? memberRoleMap[audit.fromRole] : '未分配'}
                            </Text>
                            <Text color="myGray.400">➔</Text>
                            <Text fontWeight="700" color="primary.600">
                              {memberRoleMap[audit.toRole]}
                            </Text>
                          </HStack>
                        </Td>
                        <Td fontSize="xs">
                          <Badge colorScheme={audit.toStatus === 'active' ? 'green' : 'gray'}>
                            {audit.toStatus === 'active' ? '生效' : '停用'}
                          </Badge>
                        </Td>
                        <Td fontSize="xs" color="myGray.700">
                          {audit.reason}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Box>
          )}
        </Stack>
      </Box>

      {/* Role Assignment Modal */}
      <Modal isOpen={roleDisclosure.isOpen} onClose={roleDisclosure.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>分配客服岗位与管辖产品范围</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              {/* Mutual Exclusion Prompt Banner */}
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="xs" fontWeight="700">
                    采编与审核天然互斥原则：
                  </AlertTitle>
                  <AlertDescription fontSize="xs">
                    💡
                    知识采编与知识审核岗位天然互斥，一个成员在同一时间只能担任单一业务岗位，确保知识全生命周期双人复核。
                  </AlertDescription>
                </Box>
              </Alert>

              <FormControl isRequired>
                <FormLabel fontSize="xs">选择团队成员</FormLabel>
                <Select
                  size="sm"
                  value={roleTmbId}
                  onChange={(e) => setRoleTmbId(e.target.value)}
                  placeholder="请选择团队成员"
                >
                  {roleMembers.map((m) => (
                    <option key={m.tmbId} value={m.tmbId}>
                      {m.name} (
                      {m.customerServiceRole ? memberRoleMap[m.customerServiceRole] : '未分配'})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="xs">目标客服岗位</FormLabel>
                <Select
                  size="sm"
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as CustomerServiceMemberRoleEnum)}
                >
                  <option value={CustomerServiceMemberRoleEnum.knowledgeEditor}>
                    📝 知识采编员 (负责结构化录入与草稿提交)
                  </option>
                  <option value={CustomerServiceMemberRoleEnum.knowledgeReviewer}>
                    🔍 知识审核员 (负责 Diff 对比与发布审批)
                  </option>
                  <option value={CustomerServiceMemberRoleEnum.customerServiceAdmin}>
                    🛡️ 客服管理员 (负责项目编排与全面治理)
                  </option>
                </Select>
              </FormControl>

              {/* Product Scope Selection */}
              <FormControl>
                <FormLabel fontSize="xs">管辖产品大类 (可选限定，留空表示全部大类)</FormLabel>
                <SimpleGrid
                  columns={2}
                  gap={2}
                  maxH="120px"
                  overflowY="auto"
                  p={2}
                  borderWidth="1px"
                  borderColor="myGray.200"
                  borderRadius="md"
                >
                  {catalog.categories.map((c) => (
                    <Checkbox
                      key={c.id}
                      size="sm"
                      isChecked={roleAllowedCategoryIds.includes(c.id)}
                      onChange={() => handleToggleCategory(c.id)}
                    >
                      <Text fontSize="xs">{c.name}</Text>
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">管辖产品型号 (可选限定，留空表示全部型号)</FormLabel>
                <SimpleGrid
                  columns={2}
                  gap={2}
                  maxH="140px"
                  overflowY="auto"
                  p={2}
                  borderWidth="1px"
                  borderColor="myGray.200"
                  borderRadius="md"
                >
                  {catalog.models.map((m) => (
                    <Checkbox
                      key={m.id}
                      size="sm"
                      isChecked={roleAllowedModelIds.includes(m.id)}
                      onChange={() => handleToggleModel(m.id)}
                    >
                      <Text fontSize="xs">{m.name}</Text>
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="xs">变更原因与审批记录</FormLabel>
                <Input
                  size="sm"
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="例如：调整产品日常采编职责"
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter gap={2}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              isLoading={saving}
              onClick={() => saveMemberRole(CustomerServiceResourceStatusEnum.inactive)}
            >
              停用该成员岗位
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              isLoading={saving}
              onClick={() => saveMemberRole(CustomerServiceResourceStatusEnum.active)}
            >
              确认分配并生效
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

/**
 * 岗位与权限中心主页面
 */
const CustomerServiceRolesPage = () => {
  return (
    <CustomerServiceProvider>
      <RolesCenterContent />
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

export default CustomerServiceRolesPage;
