import React, { useMemo } from 'react';
import { useRouter } from 'next/router';
import { Badge, Box, Button, Flex, HStack, Heading, Tag, Text } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useCustomerServiceContext, memberRoleMap } from './context';

export interface CustomerServiceHeaderProps {
  currentRoute?: 'console' | 'editor' | 'reviewer' | 'roles' | 'admin';
  title?: string;
  subtitle?: string;
}

/**
 * 智能客服统一顶部导航栏
 * 依据登录用户真实 RBAC 岗位动态渲染可见工作台导航项
 */
export const CustomerServiceHeader: React.FC<CustomerServiceHeaderProps> = ({
  currentRoute,
  title,
  subtitle
}) => {
  const router = useRouter();
  const { userInfo } = useUserStore();
  const {
    effectiveRole,
    canEditKnowledge,
    canReviewKnowledge,
    canManageRoles,
    canManageProjects,
    pendingKnowledge,
    loadData
  } = useCustomerServiceContext();

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

  // 依据当前账号的真实角色权限动态构建可见工作台列表
  const navItems = useMemo(() => {
    const items: Array<{
      key: string;
      label: string;
      path: string;
      icon: string;
      badge?: number;
    }> = [
      {
        key: 'console',
        label: '工作台大厅',
        path: '/customer-service/console',
        icon: 'common/overviewLight'
      }
    ];

    if (canEditKnowledge) {
      items.push({
        key: 'editor',
        label: '知识采编台',
        path: '/customer-service/editor',
        icon: 'core/dataset/datasetLight'
      });
    }

    if (canReviewKnowledge) {
      items.push({
        key: 'reviewer',
        label: '知识审核台',
        path: '/customer-service/reviewer',
        icon: 'common/check',
        badge: pendingKnowledge.length
      });
    }

    if (canManageRoles) {
      items.push({
        key: 'roles',
        label: '岗位权限中心',
        path: '/customer-service/roles',
        icon: 'support/user/usersLight'
      });
    }

    if (canManageProjects) {
      items.push({
        key: 'admin',
        label: '管理员控制台',
        path: '/customer-service/admin',
        icon: 'support/config/configLight'
      });
    }

    return items;
  }, [
    canEditKnowledge,
    canReviewKnowledge,
    canManageRoles,
    canManageProjects,
    pendingKnowledge.length
  ]);

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

        {/* Right: Real User & Role Badge, Refresh & Terminal Link */}
        <Flex align="center" gap={2.5} wrap="wrap">
          <Tag size="md" colorScheme={roleColor} variant="subtle" borderRadius="full" px={3} py={1}>
            <Text fontSize="xs" fontWeight="700">
              {roleIcon}{' '}
              {userInfo?.username
                ? `${userInfo.username} · ${memberRoleMap[effectiveRole] || '客服成员'}`
                : memberRoleMap[effectiveRole] || '客服成员'}
            </Text>
          </Tag>

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
        </Flex>
      </Flex>
    </Box>
  );
};

export default CustomerServiceHeader;
