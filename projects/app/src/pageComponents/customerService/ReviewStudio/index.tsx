import React, { useState } from 'react';
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { useCustomerServiceContext, audienceMap, knowledgeTypeMap } from '../context';
import type { KnowledgeItem } from '../types';
import KnowledgeDiffViewer from './KnowledgeDiffViewer';
import AuditScopePreview from './AuditScopePreview';
import InlineTestSandbox from './InlineTestSandbox';
import RejectReasonModal from './RejectReasonModal';

export const ReviewStudio: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const { pendingKnowledge, currentMember, saving, knowledgeAction, datasetNameMap } =
    useCustomerServiceContext();

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const rejectDisclosure = useDisclosure();
  const [rejectingItem, setRejectingItem] = useState<KnowledgeItem>();

  const selectedKnowledge: KnowledgeItem | undefined =
    pendingKnowledge[selectedIndex] ?? pendingKnowledge[0];

  const handleOpenReject = (item: KnowledgeItem) => {
    setRejectingItem(item);
    rejectDisclosure.onOpen();
  };

  const handleConfirmReject = async (reason: string) => {
    if (!rejectingItem) return;
    await knowledgeAction('review', rejectingItem.id, 'reject', reason);
    rejectDisclosure.onClose();
    setRejectingItem(undefined);
  };

  return (
    <Stack spacing={5}>
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={3}>
        <Box>
          <Heading size="md">知识审核工作台 (Review Studio)</Heading>
          <Text mt={1} color="myGray.500" fontSize="sm">
            集中审核知识的适用产品、可见范围、新旧版本 Diff 与检索问答效果，审核通过后正式生效。
          </Text>
        </Box>
        <HStack spacing={3}>
          <Badge
            colorScheme={pendingKnowledge.length > 0 ? 'orange' : 'green'}
            px={3}
            py={1}
            borderRadius="full"
          >
            待审核 {pendingKnowledge.length} 项
          </Badge>
        </HStack>
      </Flex>

      {pendingKnowledge.length === 0 ? (
        <Flex
          minH="320px"
          bg="white"
          borderWidth="1px"
          borderColor="myGray.200"
          borderRadius="xl"
          align="center"
          justify="center"
          direction="column"
          p={8}
          textAlign="center"
        >
          <Heading size="sm" color="green.600">
            🎉 全部知识已审核完毕
          </Heading>
          <Text mt={2} color="myGray.500" fontSize="sm">
            当前没有待审核的知识草稿。创作者提交新知识或修改后将自动进入此工作台。
          </Text>
        </Flex>
      ) : (
        <Flex gap={5} direction={{ base: 'column', lg: 'row' }} align="start">
          {/* Left Pending Queue Navigation (w: 300px) */}
          <Box
            w={{ base: '100%', lg: '300px' }}
            flexShrink={0}
            bg="white"
            borderWidth="1px"
            borderColor="myGray.200"
            borderRadius="xl"
            p={4}
          >
            <Text fontWeight="700" fontSize="sm" mb={3}>
              待审清单 ({pendingKnowledge.length})
            </Text>
            <Stack maxH="680px" overflowY="auto" spacing={2} pr={1}>
              {pendingKnowledge.map((item, idx) => {
                const isSelected = selectedKnowledge?.id === item.id;
                return (
                  <Box
                    key={item.id}
                    p={3}
                    borderRadius="lg"
                    cursor="pointer"
                    bg={isSelected ? 'orange.50' : 'myGray.50'}
                    borderWidth="1px"
                    borderColor={isSelected ? 'orange.400' : 'transparent'}
                    onClick={() => setSelectedIndex(idx)}
                    _hover={{ bg: isSelected ? 'orange.50' : 'myGray.100' }}
                  >
                    <Flex justify="space-between" align="center">
                      <Badge size="xs" colorScheme="purple">
                        {knowledgeTypeMap[item.knowledgeType]}
                      </Badge>
                      <Text fontSize="10px" color="myGray.500">
                        V{item.version}
                      </Text>
                    </Flex>
                    <Text mt={1.5} fontSize="xs" fontWeight="600" noOfLines={2} color="myGray.800">
                      {item.title}
                    </Text>
                    <Flex
                      mt={2}
                      justify="space-between"
                      align="center"
                      fontSize="10px"
                      color="myGray.500"
                    >
                      <Text>{audienceMap[item.audienceLevel]}</Text>
                      <Text>{item.dataAmount} 段切片</Text>
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Right Main Review Canvas */}
          {selectedKnowledge && (
            <Box flex="1" minW={0}>
              <Stack spacing={4}>
                {/* Header Action Banner */}
                <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
                  <Flex justify="space-between" align="start" gap={4} wrap="wrap">
                    <Box minW={0} flex="1">
                      <Heading size="md" noOfLines={2}>
                        {selectedKnowledge.title}
                      </Heading>
                      <Flex mt={2} gap={2} align="center" wrap="wrap">
                        <Badge colorScheme="orange">待审核 (Pending)</Badge>
                        <Badge variant="subtle">
                          {knowledgeTypeMap[selectedKnowledge.knowledgeType]}
                        </Badge>
                        <Badge colorScheme="purple">
                          {audienceMap[selectedKnowledge.audienceLevel]}
                        </Badge>
                        <Text fontSize="xs" color="myGray.500">
                          版本：V{selectedKnowledge.version} · 来源：
                          {selectedKnowledge.sourceName ||
                            datasetNameMap.get(selectedKnowledge.datasetId) ||
                            '知识库'}
                        </Text>
                      </Flex>
                    </Box>

                    {/* Action Bar */}
                    {currentMember?.capabilities.reviewKnowledge && (
                      <HStack spacing={3}>
                        <Button
                          colorScheme="red"
                          variant="outline"
                          isLoading={saving}
                          onClick={() => handleOpenReject(selectedKnowledge)}
                        >
                          驳回修改
                        </Button>
                        <Button
                          colorScheme="green"
                          isLoading={saving}
                          onClick={() => knowledgeAction('review', selectedKnowledge.id, 'publish')}
                        >
                          通过并正式发布
                        </Button>
                      </HStack>
                    )}
                  </Flex>
                </Box>

                {/* Tabbed Review Inspectors */}
                <Tabs variant="enclosed" colorScheme="blue">
                  <TabList
                    bg="white"
                    p={2}
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="myGray.200"
                  >
                    <Tab fontWeight="600" fontSize="sm">
                      新旧版本 Diff 对比
                    </Tab>
                    <Tab fontWeight="600" fontSize="sm">
                      发布影响面分析
                    </Tab>
                    <Tab fontWeight="600" fontSize="sm">
                      在线检索问答沙盒
                    </Tab>
                  </TabList>

                  <TabPanels mt={3}>
                    {/* Tab 1: Diff Viewer */}
                    <TabPanel p={0}>
                      <KnowledgeDiffViewer currentKnowledge={selectedKnowledge} />
                    </TabPanel>

                    {/* Tab 2: Audit Scope */}
                    <TabPanel p={0}>
                      <AuditScopePreview knowledge={selectedKnowledge} />
                    </TabPanel>

                    {/* Tab 3: Sandbox */}
                    <TabPanel p={0}>
                      <InlineTestSandbox knowledge={selectedKnowledge} />
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Stack>
            </Box>
          )}
        </Flex>
      )}

      {/* Reject Modal */}
      <RejectReasonModal
        isOpen={rejectDisclosure.isOpen}
        onClose={rejectDisclosure.onClose}
        knowledge={rejectingItem}
        onConfirmReject={handleConfirmReject}
        isLoading={saving}
      />
    </Stack>
  );
};

export default ReviewStudio;
