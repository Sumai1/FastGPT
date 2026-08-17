import React from 'react';
import { useRouter } from 'next/router';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr
} from '@chakra-ui/react';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext, memberRoleMap, statusMap } from '../context';

export const SettingsStudio: React.FC = () => {
  const router = useRouter();
  const {
    roles,
    roleMembers,
    roleTmbId,
    setRoleTmbId,
    roleType,
    setRoleType,
    roleReason,
    setRoleReason,
    roleDisclosure,
    openRoleManager,
    saveMemberRole,
    saving,
    currentMember
  } = useCustomerServiceContext();

  return (
    <Stack spacing={6}>
      {/* Header */}
      <Box>
        <Heading size="md">系统设置与权限治理中心 (Settings Studio)</Heading>
        <Text mt={1} color="myGray.500" fontSize="sm">
          管理团队成员客服职责角色，落实【知识编辑】与【知识审核】互斥规则，保障知识安全合规。
        </Text>
      </Box>

      {/* Principle Banner: Separation of Duties */}
      <Alert status="info" borderRadius="xl" p={4}>
        <AlertIcon />
        <Box>
          <Text fontWeight="700" fontSize="sm">
            知识治理原则：三权分立与岗位互斥 (Separation of Duties)
          </Text>
          <Text mt={0.5} fontSize="xs" color="myGray.600">
            为防止未经校验的内容直接发布入库，系统严格实行岗位互斥规则：具有【知识编辑】岗位的成员无法审批自己或他人的知识草稿；【知识审核】人员独立把关，审核通过后方可正式参与客服问答。
          </Text>
        </Box>
      </Alert>

      {/* Main Grid: Roles List + Advanced Workbenches */}
      <SimpleGrid columns={{ base: 1, xl: 3 }} gap={5}>
        {/* Left 2 Cols: Member Roles Table */}
        <Box
          gridColumn={{ xl: 'span 2' }}
          bg="white"
          borderWidth="1px"
          borderColor="myGray.200"
          borderRadius="xl"
          p={5}
        >
          <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
            <Box>
              <Heading size="sm">客服专职岗位成员清单</Heading>
              <Text mt={1} color="myGray.500" fontSize="xs">
                当前已配置 {roles.filter((r) => r.status === 'active').length} 个有效客服岗位。
              </Text>
            </Box>
            {currentMember?.capabilities.manageRoles && (
              <Button size="sm" colorScheme="blue" onClick={() => void openRoleManager()}>
                + 配置客服岗位
              </Button>
            )}
          </Flex>

          {roles.length === 0 ? (
            <Text color="myGray.400" fontSize="sm" py={8} textAlign="center">
              暂未配置独立客服专职岗位，由团队管理员承担日常客服与审核管理。
            </Text>
          ) : (
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead bg="myGray.50">
                  <Tr>
                    <Th fontSize="10px">成员名称</Th>
                    <Th fontSize="10px">岗位职责</Th>
                    <Th fontSize="10px">岗位状态</Th>
                    <Th fontSize="10px">调整原因说明</Th>
                    <Th fontSize="10px">更新时间</Th>
                  </Tr>
                </Thead>
                <Tbody fontSize="xs">
                  {roles.map((item) => {
                    const statusConfig = statusMap[item.status] || {
                      label: item.status,
                      color: 'gray'
                    };
                    return (
                      <Tr key={item.id}>
                        <Td fontWeight="600">{item.memberName}</Td>
                        <Td>
                          <Badge
                            colorScheme={
                              item.role === CustomerServiceMemberRoleEnum.customerServiceAdmin
                                ? 'purple'
                                : item.role === CustomerServiceMemberRoleEnum.knowledgeReviewer
                                  ? 'orange'
                                  : 'blue'
                            }
                          >
                            {memberRoleMap[item.role]}
                          </Badge>
                        </Td>
                        <Td>
                          <Badge colorScheme={statusConfig.color}>{statusConfig.label}</Badge>
                        </Td>
                        <Td color="myGray.600" maxW="200px" noOfLines={1}>
                          {item.reason || '-'}
                        </Td>
                        <Td color="myGray.400">{new Date(item.updateTime).toLocaleDateString()}</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>

        {/* Right 1 Col: Advanced Workbenches Shortcuts */}
        <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
          <Heading size="sm" mb={2}>
            底层高级工作台入口
          </Heading>
          <Text color="myGray.500" fontSize="xs" mb={4}>
            仅在需要修改底层编排 Flow、管理数据集向量分块或分发 API Key 时进入。
          </Text>

          <Stack spacing={3}>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/customer-service/admin')}
            >
              ⚙️ 客服高级管理设置（兼容页）
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/dashboard/agent')}
            >
              ⚡ FastGPT Flow 工作流编排
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/dataset/list')}
            >
              📚 FastGPT 向量与知识库中心
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/account/apikey')}
            >
              🔑 专用 API Key 访问凭证
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>

      {/* Role Management Modal */}
      <Modal isOpen={roleDisclosure.isOpen} onClose={roleDisclosure.onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex align="center" gap={2}>
              <Heading size="md">配置成员客服岗位</Heading>
              <Badge colorScheme="purple">职责分配</Badge>
            </Flex>
            <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
              为团队成员分配专职客服角色，落实编辑与审核分离机制。
            </Text>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody pb={6}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="xs">选择团队成员</FormLabel>
                <Select size="sm" value={roleTmbId} onChange={(e) => setRoleTmbId(e.target.value)}>
                  <option value="">请选择成员</option>
                  {roleMembers.map((member) => (
                    <option key={member.tmbId} value={member.tmbId}>
                      {member.name}
                      {member.customerServiceRole
                        ? `（当前已任：${memberRoleMap[member.customerServiceRole]}）`
                        : ''}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="xs">分配客服岗位</FormLabel>
                <Select
                  size="sm"
                  value={roleType}
                  onChange={(e) => setRoleType(e.target.value as CustomerServiceMemberRoleEnum)}
                >
                  {Object.values(CustomerServiceMemberRoleEnum).map((role) => (
                    <option key={role} value={role}>
                      {memberRoleMap[role]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel fontSize="xs">岗位调整事由说明</FormLabel>
                <Textarea
                  size="sm"
                  rows={3}
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="例如：指派为售后技术支持专员，负责故障诊断知识录入"
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter gap={2} bg="myGray.50">
            <Button variant="whiteBase" onClick={roleDisclosure.onClose}>
              取消
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              isLoading={saving}
              isDisabled={!roleTmbId || !roleReason.trim()}
              onClick={() => void saveMemberRole(CustomerServiceResourceStatusEnum.inactive)}
            >
              停用此岗位
            </Button>
            <Button
              colorScheme="blue"
              isLoading={saving}
              isDisabled={!roleTmbId || !roleReason.trim()}
              onClick={() => void saveMemberRole()}
            >
              保存岗位配置
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

export default SettingsStudio;
