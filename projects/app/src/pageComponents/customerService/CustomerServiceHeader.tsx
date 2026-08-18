import React from 'react';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Heading,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Tag,
  Text,
  useToast
} from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext, memberRoleMap } from './context';
import { useCSAuthStore, getDefaultRouteForRole } from './useCSAuthStore';

export interface CustomerServiceHeaderProps {
  currentRoute?: 'console' | 'editor' | 'reviewer' | 'roles' | 'admin';
  title?: string;
  subtitle?: string;
}

/**
 * 智能客服统一顶部导航栏
 * 包含全局角色标识、管理员模拟视角切换器与工作区快捷入口
 */
export const CustomerServiceHeader: React.FC<CustomerServiceHeaderProps> = ({
  currentRoute,
  title,
  subtitle
}) => {
  const router = useRouter();
  const toast = useToast();
  const {
    currentMember,
    effectiveRole,
    simulatedRole,
    setSimulatedRole,
    isAdmin,
    pendingKnowledge,
    loadData
  } = useCustomerServiceContext();

  const csAuthUser = useCSAuthStore((s) => s.currentUser);
  const csLogout = useCSAuthStore((s) => s.logout);

  const roleColor = (() => {
    switch (effectiveRole) {
      case CustomerServiceMemberRoleEnum.customerServiceAdmin:
        return 'blue';
      case CustomerServiceMemberRoleEnum.knowledgeEditor:
        return 'purple';
      case CustomerServiceMemberRoleEnum.knowledgeReviewer:
        return 'orange';
      default:
        return 'gray';
    }
  })();

  const roleIcon = (() => {
    switch (effectiveRole) {
      case CustomerServiceMemberRoleEnum.customerServiceAdmin:
        return '🛡️';
      case CustomerServiceMemberRoleEnum.knowledgeEditor:
        return '📝';
      case CustomerServiceMemberRoleEnum.knowledgeReviewer:
        return '🔍';
      default:
        return '👤';
    }
  })();

  const navItems = [
    {
      key: 'console',
      label: '工作台大厅',
      path: '/customer-service/console',
      icon: 'common/overviewLight'
    },
    {
      key: 'editor',
      label: '知识采编台',
      path: '/customer-service/editor',
      icon: 'core/dataset/datasetLight'
    },
    {
      key: 'reviewer',
      label: '知识审核台',
      path: '/customer-service/reviewer',
      icon: 'common/check',
      badge: pendingKnowledge.length
    },
    {
      key: 'roles',
      label: '岗位权限中心',
      path: '/customer-service/roles',
      icon: 'support/user/usersLight'
    },
    {
      key: 'admin',
      label: '管理员控制台',
      path: '/customer-service/admin',
      icon: 'support/config/configLight'
    }
  ];

  const handleSimulateRole = (role: CustomerServiceMemberRoleEnum | null) => {
    setSimulatedRole(role);
    toast({
      status: 'info',
      title: role ? `已切换为【${memberRoleMap[role]}】视角` : '已恢复管理员全量视角'
    });
  };

  return (
    <Box bg="white" borderBottomWidth="1px" borderColor="myGray.200" px={{ base: 4, lg: 6 }} py={3}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        {/* Left: Brand, Active Route Title & Navigation Tabs */}
        <Flex align="center" gap={4} wrap="wrap">
          <Box cursor="pointer" onClick={() => void router.push('/customer-service/console')}>
            <Flex align="center" gap={2}>
              <Box p={1.5} bg="primary.50" color="primary.600" borderRadius="md">
                <MyIcon name="core/chat/chatLight" w={5} />
              </Box>
              <Box>
                <Heading size="xs" color="myGray.900" fontWeight="700">
                  智能客服
                </Heading>
                <Text fontSize="10px" color="myGray.500">
                  Multi-Role RBAC
                </Text>
              </Box>
            </Flex>
          </Box>

          {/* Desktop Navigation Links */}
          <HStack
            spacing={1}
            display={{ base: 'none', md: 'flex' }}
            pl={3}
            borderLeftWidth="1px"
            borderColor="myGray.200"
          >
            {navItems.map((item) => {
              const active = currentRoute === item.key;
              return (
                <Button
                  key={item.key}
                  size="sm"
                  variant={active ? 'solid' : 'ghost'}
                  colorScheme={active ? 'blue' : 'gray'}
                  color={active ? 'white' : 'myGray.600'}
                  onClick={() => void router.push(item.path)}
                  borderRadius="md"
                  px={3}
                  fontSize="xs"
                >
                  {item.label}
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <Badge ml={1.5} colorScheme="orange" borderRadius="full" size="xs">
                      {item.badge}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </HStack>
        </Flex>

        {/* Right: Role Switcher Simulator, Active Badge & Terminal Link */}
        <Flex align="center" gap={2.5} wrap="wrap">
          {/* Active Role Badge with Simulator indicator */}
          <HStack spacing={1.5}>
            <Tag
              size="md"
              colorScheme={roleColor}
              variant="subtle"
              borderRadius="full"
              px={3}
              py={1}
            >
              <Text fontSize="xs" fontWeight="700">
                {roleIcon}{' '}
                {csAuthUser
                  ? `${csAuthUser.name} · ${memberRoleMap[effectiveRole]}`
                  : memberRoleMap[effectiveRole] || '客服成员'}
              </Text>
            </Tag>
            {simulatedRole && (
              <Tag size="sm" colorScheme="purple" variant="solid" borderRadius="full">
                模拟视角
              </Tag>
            )}
          </HStack>

          {/* Role Switcher Menu (Admin Simulator) */}
          {isAdmin && (
            <Menu autoSelect={false}>
              <MenuButton
                as={Button}
                size="sm"
                variant="outline"
                colorScheme="purple"
                leftIcon={<MyIcon name="support/user/usersLight" w={4} />}
              >
                {simulatedRole ? '切换视角' : '模拟角色视角'}
              </MenuButton>
              <MenuList zIndex={100} shadow="lg" p={2} fontSize="sm">
                <Box px={3} py={1.5} fontSize="xs" color="myGray.500">
                  管理员多角色模拟中心
                </Box>
                <MenuItem
                  icon={<Text fontSize="sm">🛡️</Text>}
                  fontWeight={!simulatedRole ? '700' : 'normal'}
                  bg={!simulatedRole ? 'primary.50' : 'transparent'}
                  onClick={() => handleSimulateRole(null)}
                >
                  恢复管理员全权视角
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<Text fontSize="sm">📝</Text>}
                  fontWeight={
                    simulatedRole === CustomerServiceMemberRoleEnum.knowledgeEditor
                      ? '700'
                      : 'normal'
                  }
                  bg={
                    simulatedRole === CustomerServiceMemberRoleEnum.knowledgeEditor
                      ? 'purple.50'
                      : 'transparent'
                  }
                  onClick={() => handleSimulateRole(CustomerServiceMemberRoleEnum.knowledgeEditor)}
                >
                  模拟知识采编员视角
                </MenuItem>
                <MenuItem
                  icon={<Text fontSize="sm">🔍</Text>}
                  fontWeight={
                    simulatedRole === CustomerServiceMemberRoleEnum.knowledgeReviewer
                      ? '700'
                      : 'normal'
                  }
                  bg={
                    simulatedRole === CustomerServiceMemberRoleEnum.knowledgeReviewer
                      ? 'orange.50'
                      : 'transparent'
                  }
                  onClick={() =>
                    handleSimulateRole(CustomerServiceMemberRoleEnum.knowledgeReviewer)
                  }
                >
                  模拟知识审核员视角
                </MenuItem>
              </MenuList>
            </Menu>
          )}

          <Button size="sm" variant="whiteBase" onClick={() => void loadData()}>
            刷新
          </Button>
          <Button
            size="sm"
            colorScheme="blue"
            onClick={() => void router.push('/customer-service')}
          >
            打开客服终端
          </Button>
          {csAuthUser && (
            <Button
              size="sm"
              variant="ghost"
              color="myGray.500"
              onClick={() => {
                csLogout();
                void router.push('/customer-service/login');
              }}
            >
              退出登录
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default CustomerServiceHeader;
