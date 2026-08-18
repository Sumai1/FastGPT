import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import { useCSAuthStore } from './useCSAuthStore';

/** 客服工作台鉴权守卫：未登录用户自动跳转至登录页 */
const CSAuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const currentUser = useCSAuthStore((s) => s.currentUser);

  useEffect(() => {
    if (!currentUser) {
      void router.replace('/customer-service/login');
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return (
      <Flex minH="100vh" justify="center" align="center" bg="myGray.50">
        <Box textAlign="center">
          <Spinner size="lg" color="primary.500" mb={4} />
          <Text color="myGray.500" fontSize="sm">
            正在跳转登录页...
          </Text>
        </Box>
      </Flex>
    );
  }

  return <>{children}</>;
};

export default CSAuthGuard;
