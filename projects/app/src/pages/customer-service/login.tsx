import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Flex,
  VStack,
  Text,
  Input,
  Button,
  InputGroup,
  InputRightElement,
  IconButton,
  Heading,
  HStack,
  useToast,
  Badge
} from '@chakra-ui/react';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import {
  useCSAuthStore,
  CS_DEMO_ACCOUNTS,
  getDefaultRouteForRole,
  type CSUserAccount
} from '@/pageComponents/customerService/useCSAuthStore';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { memberRoleMap } from '@/pageComponents/customerService/context';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import MyIcon from '@fastgpt/web/components/common/Icon';

/** 根据角色返回对应主题色 */
const getRoleColor = (role: CustomerServiceMemberRoleEnum) => {
  switch (role) {
    case CustomerServiceMemberRoleEnum.customerServiceAdmin:
      return 'blue';
    case CustomerServiceMemberRoleEnum.knowledgeEditor:
      return 'purple';
    case CustomerServiceMemberRoleEnum.knowledgeReviewer:
      return 'orange';
    default:
      return 'gray';
  }
};

/** 根据角色返回对应描述文案 */
const getRoleDescription = (role: CustomerServiceMemberRoleEnum) => {
  switch (role) {
    case CustomerServiceMemberRoleEnum.customerServiceAdmin:
      return '项目编排 · 产品拓扑 · 运营监控 · 紧急下架';
    case CustomerServiceMemberRoleEnum.knowledgeEditor:
      return '知识录入 · 草稿管理 · 模板创建 · 检索自测';
    case CustomerServiceMemberRoleEnum.knowledgeReviewer:
      return '审核队列 · Diff 对比 · 沙盒试问 · 双人复核';
    default:
      return '';
  }
};

/**
 * 智能客服统一登录页
 * 支持邮箱密码登录和演示账号一键快捷登录，登录后按角色自动跳转对应工作台
 */
export default function CustomerServiceLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const currentUser = useCSAuthStore((s) => s.currentUser);
  const isLoggedIn = useCSAuthStore((s) => s.isLoggedIn);
  const login = useCSAuthStore((s) => s.login);
  const loginAs = useCSAuthStore((s) => s.loginAs);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 已登录时自动跳转
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      void router.replace(getDefaultRouteForRole(currentUser.role));
    }
  }, [isLoggedIn, currentUser, router]);

  /** 邮箱密码登录 */
  const handleLogin = () => {
    if (!email.trim()) {
      toast({ title: '请输入邮箱地址', status: 'warning', duration: 2000 });
      return;
    }
    if (!password) {
      toast({ title: '请输入密码', status: 'warning', duration: 2000 });
      return;
    }
    setIsLoading(true);
    // 模拟短暂延迟增强真实感
    setTimeout(() => {
      const success = login(email.trim(), password);
      setIsLoading(false);
      if (!success) {
        toast({
          title: '登录失败',
          description: '账号不存在，请使用下方演示账号登录',
          status: 'error',
          duration: 3000
        });
      }
    }, 400);
  };

  /** 演示账号一键登录 */
  const handleQuickLogin = (account: CSUserAccount) => {
    loginAs(account);
    toast({
      title: `欢迎，${account.name}`,
      description: `即将进入${memberRoleMap[account.role]}工作台`,
      status: 'success',
      duration: 1500
    });
  };

  /** Enter 键提交表单 */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Box minH="100vh" bg="gray.50" position="relative" overflow="hidden">
      <Head>
        <title>登录 - FastGPT 智能客服</title>
        <meta name="description" content="FastGPT 智能客服多角色 RBAC 协同管理平台登录" />
      </Head>

      {/* 背景装饰 */}
      <Box
        position="absolute"
        top="-200px"
        right="-200px"
        w="500px"
        h="500px"
        bg="blue.50"
        borderRadius="full"
        opacity={0.5}
        filter="blur(80px)"
      />
      <Box
        position="absolute"
        bottom="-150px"
        left="-150px"
        w="400px"
        h="400px"
        bg="purple.50"
        borderRadius="full"
        opacity={0.4}
        filter="blur(80px)"
      />

      <Flex minH="100vh" align="center" justify="center" py={12} px={4} position="relative">
        <VStack spacing={8} w="full" maxW="440px">
          {/* 品牌标识 */}
          <VStack spacing={3} textAlign="center">
            <Flex
              w={14}
              h={14}
              align="center"
              justify="center"
              bg="blue.500"
              borderRadius="xl"
              shadow="md"
            >
              <MyIcon name="core/chat/chatLight" w={7} color="white" />
            </Flex>
            <Box>
              <Heading size="lg" color="gray.800" fontWeight="800" letterSpacing="tight">
                FastGPT 智能客服
              </Heading>
              <Text color="gray.500" fontSize="sm" mt={1}>
                多角色 RBAC 协同管理平台
              </Text>
            </Box>
          </VStack>

          {/* 登录表单卡片 */}
          <Box w="full" bg="white" borderRadius="2xl" shadow="lg" p={8}>
            <VStack spacing={5}>
              <Box w="full">
                <Text fontSize="xs" color="gray.500" mb={1.5} fontWeight="500">
                  账号邮箱
                </Text>
                <Input
                  placeholder="请输入账号邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  size="lg"
                  borderRadius="lg"
                  bg="gray.50"
                  _focus={{ bg: 'white', borderColor: 'blue.400' }}
                />
              </Box>

              <Box w="full">
                <Text fontSize="xs" color="gray.500" mb={1.5} fontWeight="500">
                  密码
                </Text>
                <InputGroup size="lg">
                  <Input
                    placeholder="请输入密码"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    borderRadius="lg"
                    bg="gray.50"
                    _focus={{ bg: 'white', borderColor: 'blue.400' }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      onClick={() => setShowPassword(!showPassword)}
                      variant="ghost"
                      size="sm"
                      color="gray.400"
                    />
                  </InputRightElement>
                </InputGroup>
              </Box>

              <Button
                colorScheme="blue"
                size="lg"
                w="full"
                borderRadius="lg"
                onClick={handleLogin}
                isLoading={isLoading}
                loadingText="登录中..."
                fontWeight="600"
                _hover={{ transform: 'translateY(-1px)', shadow: 'md' }}
                transition="all 0.2s"
              >
                登 录
              </Button>
            </VStack>
          </Box>

          {/* 快速体验区域 */}
          <Box w="full">
            <HStack justify="center" spacing={2} mb={4}>
              <Box w="60px" h="1px" bg="gray.200" />
              <Text color="gray.400" fontSize="xs" fontWeight="500" whiteSpace="nowrap">
                ✨ 快速体验 · 演示账号
              </Text>
              <Box w="60px" h="1px" bg="gray.200" />
            </HStack>

            <VStack w="full" spacing={3}>
              {CS_DEMO_ACCOUNTS.map((account) => {
                const color = getRoleColor(account.role);
                return (
                  <Box
                    key={account.id}
                    w="full"
                    bg="white"
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor={`${color}.100`}
                    p={4}
                    cursor="pointer"
                    onClick={() => handleQuickLogin(account)}
                    _hover={{
                      shadow: 'md',
                      transform: 'translateY(-2px)',
                      borderColor: `${color}.300`
                    }}
                    transition="all 0.2s"
                    role="button"
                    tabIndex={0}
                  >
                    <HStack justify="space-between">
                      <HStack spacing={3}>
                        <Flex
                          w={10}
                          h={10}
                          align="center"
                          justify="center"
                          bg={`${color}.50`}
                          borderRadius="lg"
                          fontSize="xl"
                        >
                          {account.avatar}
                        </Flex>
                        <Box>
                          <HStack spacing={2} mb={0.5}>
                            <Text fontWeight="700" fontSize="sm" color="gray.800">
                              {account.name}
                            </Text>
                            <Badge
                              colorScheme={color}
                              borderRadius="full"
                              px={2}
                              py={0.5}
                              fontSize="2xs"
                            >
                              {memberRoleMap[account.role]}
                            </Badge>
                          </HStack>
                          <Text fontSize="xs" color="gray.400">
                            {account.email} · {getRoleDescription(account.role)}
                          </Text>
                        </Box>
                      </HStack>
                      <Button
                        size="sm"
                        variant="ghost"
                        colorScheme={color}
                        fontSize="xs"
                        pointerEvents="none"
                      >
                        一键登录 →
                      </Button>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </Box>

          {/* 底部提示 */}
          <Text color="gray.400" fontSize="xs" textAlign="center">
            演示模式：任意非空密码即可登录 · 登录状态自动保持
          </Text>
        </VStack>
      </Flex>
    </Box>
  );
}

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}
