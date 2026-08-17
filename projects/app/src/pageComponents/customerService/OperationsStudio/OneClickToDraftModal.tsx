import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
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
  Stack,
  Text,
  Textarea,
  useToast
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import { DatasetResourceSelect } from '../ResourceSelectors';
import { useCustomerServiceContext, audienceMap, requestAdminApi } from '../context';
import type { KnowledgeDraftSource } from '../types';

interface OneClickToDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  draftItem?: KnowledgeDraftSource;
}

const OneClickToDraftContent: React.FC<{
  onClose: () => void;
  draftItem: KnowledgeDraftSource;
}> = ({ onClose, draftItem }) => {
  const toast = useToast();
  const { catalog, loadData, loadOperations, operationPage } = useCustomerServiceContext();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(() =>
    draftItem.question ? `${draftItem.question.slice(0, 30)} 解决方案` : '未解决问题标准知识'
  );
  const [question, setQuestion] = useState(() => draftItem.question || '');
  const [answer, setAnswer] = useState(() => draftItem.answer || '');
  const [dataset, setDataset] = useState<SelectedDatasetType>();
  const [modelId, setModelId] = useState(() => draftItem.modelId || '');
  const [audience, setAudience] = useState<CustomerServiceAudienceEnum>(
    CustomerServiceAudienceEnum.public
  );

  const handleSubmit = async () => {
    if (!draftItem || !dataset || !answer.trim()) {
      toast({ status: 'warning', title: '请选择目标知识库并填写参考答案' });
      return;
    }

    setSubmitting(true);
    try {
      await requestAdminApi({
        url: '/api/customer-service/admin/operation/toKnowledge',
        method: 'POST',
        body: {
          requestRecordId: draftItem.id,
          datasetId: dataset.datasetId,
          title: title.trim() || question || '客服未解决问题',
          answer: answer.trim(),
          knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
          audienceLevel: audience,
          modelIds: modelId ? [modelId] : []
        }
      });

      toast({ status: 'success', title: '已成功转入知识草稿并提交审核中心' });
      await loadData();
      await loadOperations(operationPage);
      onClose();
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : '转知识草稿失败'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="2xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex align="center" gap={3}>
            <Heading size="md">一键转知识草稿 (One-Click To Knowledge Draft)</Heading>
            <Badge colorScheme="purple">Badcase 闭环</Badge>
          </Flex>
          <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
            将未解决或低置信度的问答上下文自动提取，由运营人员核实修正答案后直接生成待审核知识草稿。
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="xs">草稿知识标题</FormLabel>
              <Input
                size="sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：售货机退款常见问题处理"
              />
            </FormControl>

            <Box p={3} bg="myGray.50" borderRadius="md" borderWidth="1px" borderColor="myGray.200">
              <Text fontSize="xs" color="myGray.500" fontWeight="600" mb={1}>
                原始客户问题：
              </Text>
              <Text fontSize="sm" fontWeight="600" color="myGray.800">
                {question || '未记录问题'}
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
              <FormControl isRequired gridColumn={{ md: 'span 2' }}>
                <FormLabel fontSize="xs">保存目标知识库</FormLabel>
                <DatasetResourceSelect value={dataset} onChange={setDataset} title="选择知识库" />
              </FormControl>

              <FormControl>
                <FormLabel fontSize="xs">适用产品型号</FormLabel>
                <Select size="sm" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                  <option value="">全部型号</option>
                  {catalog.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>

            <FormControl isRequired>
              <Flex justify="space-between" align="center" mb={1}>
                <FormLabel fontSize="xs" mb={0}>
                  修订后标准答案 (Revised Knowledge Content)
                </FormLabel>
                <Badge colorScheme="green" size="xs">
                  支持 Markdown
                </Badge>
              </Flex>
              <Textarea
                rows={6}
                size="sm"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="请核实并完善正确标准的解答内容，避免将错误回答直接沉淀入知识库..."
              />
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter gap={3} bg="myGray.50">
          <Button variant="whiteBase" onClick={onClose} isDisabled={submitting}>
            取消
          </Button>
          <Button
            colorScheme="purple"
            isLoading={submitting}
            isDisabled={!dataset || !answer.trim()}
            onClick={handleSubmit}
          >
            生成草稿并转入审核中心
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const OneClickToDraftModal: React.FC<OneClickToDraftModalProps> = ({
  isOpen,
  onClose,
  draftItem
}) => {
  if (!isOpen || !draftItem) return null;
  return <OneClickToDraftContent key={draftItem.id} onClose={onClose} draftItem={draftItem} />;
};

export default OneClickToDraftModal;
