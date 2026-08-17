import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
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
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  useToast
} from '@chakra-ui/react';
import type { KnowledgeItem } from '../types';

interface RejectReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledge?: KnowledgeItem;
  onConfirmReject: (reason: string) => Promise<void>;
  isLoading?: boolean;
}

const presetReasons = [
  {
    key: 'param_inaccurate',
    label: '参数与规格不准确',
    detail: '经核对硬件工程图纸，尺寸/功率/耗材型号等核心参数存在偏差，需修正后重新提交。'
  },
  {
    key: 'missing_safety',
    label: '缺少必要安全警告',
    detail: '该故障涉及高压电或拆机动作，缺少强视觉安全阻断警告，需补充危险警示声明。'
  },
  {
    key: 'format_issue',
    label: '格式不符合标准模板',
    detail: '步骤缺少明确的操作动作或预期确认标志，请使用标准录入模板重新整理。'
  },
  {
    key: 'audience_broad',
    label: '受众权限设置过宽',
    detail: '包含内部维修排查与工程代码，不宜面向普通客户公开，请收窄受众为【内部售后】。'
  },
  {
    key: 'version_unspecified',
    label: '未注明软硬件版本兼容性',
    detail: '该操作仅适用于新版主板，未注明适用版本范围可能导致旧款机型误操作。'
  },
  {
    key: 'policy_conflict',
    label: '话术与售后政策冲突',
    detail: '回答承诺了超出标准服务约定的退款或保修时限，需按最新企业服务政策修正。'
  }
];

export const RejectReasonModal: React.FC<RejectReasonModalProps> = ({
  isOpen,
  onClose,
  knowledge,
  onConfirmReject,
  isLoading = false
}) => {
  const toast = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customComment, setCustomComment] = useState<string>('');

  const handleSelectPreset = (preset: (typeof presetReasons)[number]) => {
    setSelectedPreset(preset.key);
    setCustomComment(preset.detail);
  };

  const handleConfirm = async () => {
    const finalReason = customComment.trim();
    if (!finalReason) {
      toast({ status: 'warning', title: '请填写驳回原因或修改批注' });
      return;
    }
    await onConfirmReject(finalReason);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex align="center" gap={3}>
            <Heading size="md" color="red.600">
              知识审核驳回与修改批注
            </Heading>
            <Badge colorScheme="red">审核流转</Badge>
          </Flex>
          {knowledge && (
            <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal" noOfLines={1}>
              正在驳回：《{knowledge.title}》
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <Stack spacing={4}>
            <Box>
              <Text fontSize="xs" fontWeight="600" color="myGray.600" mb={2}>
                常用驳回原因预设（点击快速填入）：
              </Text>
              <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
                {presetReasons.map((preset) => {
                  const isSelected = selectedPreset === preset.key;
                  return (
                    <Button
                      key={preset.key}
                      size="sm"
                      variant={isSelected ? 'solid' : 'outline'}
                      colorScheme={isSelected ? 'red' : 'gray'}
                      justifyContent="start"
                      onClick={() => handleSelectPreset(preset)}
                      fontSize="xs"
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </SimpleGrid>
            </Box>

            <FormControl isRequired>
              <FormLabel fontSize="xs">详细批注与修订建议说明</FormLabel>
              <Textarea
                rows={5}
                size="sm"
                value={customComment}
                onChange={(e) => setCustomComment(e.target.value)}
                placeholder="请详细描述需要知识创作者修改的地方..."
              />
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter gap={3} bg="myGray.50">
          <Button variant="whiteBase" onClick={onClose} isDisabled={isLoading}>
            取消
          </Button>
          <Button
            colorScheme="red"
            isLoading={isLoading}
            isDisabled={!customComment.trim()}
            onClick={handleConfirm}
          >
            确认驳回并通知创作者
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default RejectReasonModal;
