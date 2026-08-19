import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Center, Spinner, Text, VStack } from '@chakra-ui/react';

const CustomerServiceEditorRedirect = () => {
  const router = useRouter();
  useEffect(() => {
    void router.replace('/dataset/list');
  }, [router]);
  return (
    <Center minH="100vh" bg="myGray.50">
      <VStack spacing={3}>
        <Spinner color="primary.500" size="lg" />
        <Text fontSize="sm" color="myGray.600">
          正在跳转至知识库...
        </Text>
      </VStack>
    </Center>
  );
};
export default CustomerServiceEditorRedirect;
