import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
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
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  useToast
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import { postCreateDatasetTextCollection } from '@/web/core/dataset/api/collection';
import { DatasetResourceSelect } from '../ResourceSelectors';
import { useCustomerServiceContext, audienceMap } from '../context';
import type { StructuredManualStep } from '../types';
import Markdown from '@/components/Markdown';
import MyIcon from '@fastgpt/web/components/common/Icon';

interface ManualFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultSteps: StructuredManualStep[] = [
  {
    stepNumber: 1,
    title: '打开前置维护门',
    action: '使用专用钥匙逆时针旋转 90 度打开设备前维护门，确认内部照明灯点亮。',
    expectedResult: '前门顺畅开启，面板显示进入维护模式提示。',
    precautions: '开门动作需平稳，避免撞击内部光学镜头。'
  },
  {
    stepNumber: 2,
    title: '取出旧纸卷并装入新纸卷',
    action:
      '按压纸仓卡扣，取出用尽的纸芯；取全新 80mm 热敏纸，热敏面朝外放入纸仓，拉出约 5cm 纸头。',
    expectedResult: '纸卷平整卡入转轴槽，无偏斜阻滞。',
    precautions: '禁止使用受潮或破损纸卷，以免发生卡纸。'
  },
  {
    stepNumber: 3,
    title: '闭合机盖并触发自检试打',
    action:
      '用力下压纸仓盖直至听到“咔哒”锁定声，合上前维护门并顺时针上锁；在屏幕点击【自检出纸测试】。',
    expectedResult: '设备自动吐出 1 张测试样张，切刀切纸平整且文字清晰。',
    precautions: '若未听到锁定声，切刀可能报错 ERR-201。'
  }
];

export const ManualForm: React.FC<ManualFormProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const { catalog, createKnowledge, loadData } = useCustomerServiceContext();
  const [submitting, setSubmitting] = useState(false);

  // Form Basic Info
  const [title, setTitle] = useState('');
  const [dataset, setDataset] = useState<SelectedDatasetType>();
  const [modelId, setModelId] = useState('');
  const [audience, setAudience] = useState<CustomerServiceAudienceEnum>(
    CustomerServiceAudienceEnum.public
  );

  // Manual Structured Steps & Guidance
  const [prerequisites, setPrerequisites] = useState(
    '1. 设备处于通电待机或维护模式；\n2. 准备对应规格备用耗材；\n3. 确认操作环境干燥无明火。'
  );
  const [steps, setSteps] = useState<StructuredManualStep[]>(defaultSteps);
  const [completionCriteria, setCompletionCriteria] = useState(
    '设备维护门锁闭，屏幕维护提示消失，自检测试样张正常打印切纸，系统状态恢复为【就绪】。'
  );
  const [failureTroubleshooting, setFailureTroubleshooting] = useState(
    '- 若提示卡纸：重新开盖取出纸卷，检查进纸通道有无碎纸残留；\n- 若打印空白：检查纸卷是否装反（热敏涂层面方向）；\n- 若切刀卡住：长按维护按钮 3 秒复位切刀。'
  );
  const [escalationConditions, setEscalationConditions] = useState(
    '1. 连续 2 次自检报错且无法硬件复位；\n2. 打印头或主控板出现烧灼异味或冒烟；\n3. 门锁卡死无法开启。'
  );

  const selectedModel = useMemo(
    () => catalog.models.find((m) => m.id === modelId),
    [catalog.models, modelId]
  );

  const addStep = () => {
    const nextNumber = steps.length + 1;
    setSteps([
      ...steps,
      {
        stepNumber: nextNumber,
        title: `步骤 ${nextNumber}`,
        action: '',
        expectedResult: '',
        precautions: ''
      }
    ]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) {
      toast({ status: 'warning', title: '至少保留一个操作步骤' });
      return;
    }
    const filtered = steps.filter((_, i) => i !== index);
    // re-number steps
    const renumbered = filtered.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
    setSteps(renumbered);
  };

  const updateStep = (index: number, field: keyof StructuredManualStep, value: any) => {
    const next = [...steps];
    next[index] = { ...next[index], [field]: value };
    setSteps(next);
  };

  const generatedMarkdown = useMemo(() => {
    const modelNameStr = selectedModel
      ? `${selectedModel.name} (${selectedModel.modelCode})`
      : '通用设备';
    const docTitle = title.trim() || `${modelNameStr} 标准操作指导规程`;

    let content = `# ${docTitle}

> **文档类别**：标准操作说明与步骤指南 | **适用型号**：${modelNameStr} | **受众范围**：${audienceMap[audience]}

---

## 一、 操作前准备与前提条件
${prerequisites.trim() || '无特殊前置条件。'}

---

## 二、 标准操作步骤分解
`;

    steps.forEach((step) => {
      content += `
### 步骤 ${step.stepNumber}：${step.title || `步骤 ${step.stepNumber}`}
- **操作动作**：${step.action || '执行对应维护操作'}
- **预期确认标志**：${step.expectedResult || '操作完成'}
${step.precautions ? `- **⚠️ 注意事项**：${step.precautions}` : ''}
`;
    });

    content += `
---

## 三、 操作完成检验标志
${completionCriteria.trim() || '操作顺利完成，系统功能自检通过。'}

---

## 四、 常见异常排查与自救方案
${failureTroubleshooting.trim() || '若遇异常，请核对上述步骤重试。'}

---

## 五、 转人工与技术支持升级触发条件
> **重要**：当发生以下任一情况时，请立即停止操作并联系售后技术支持：
${escalationConditions.trim() || '常规排查无效时请转接人工客服。'}
`;

    return content;
  }, [
    selectedModel,
    title,
    audience,
    prerequisites,
    steps,
    completionCriteria,
    failureTroubleshooting,
    escalationConditions
  ]);

  const handleSubmit = async () => {
    if (!dataset) {
      toast({ status: 'warning', title: '请选择目标知识库' });
      return;
    }
    const finalTitle = title.trim() || `${selectedModel?.name || '设备'}操作说明书`;

    setSubmitting(true);
    try {
      const created = await postCreateDatasetTextCollection({
        datasetId: dataset.datasetId,
        name: `${finalTitle}.md`,
        text: generatedMarkdown,
        metadata: { customerServicePendingRegistration: true },
        forbid: true
      });

      await createKnowledge({
        datasetId: dataset.datasetId,
        collectionId: created.collectionId,
        title: finalTitle,
        sourceName: `${finalTitle}.md`,
        knowledgeType: CustomerServiceKnowledgeTypeEnum.manual,
        audienceLevel: audience,
        modelIds: modelId ? [modelId] : [],
        hardwareVersionIds: [],
        softwareVersionIds: []
      });

      toast({ status: 'success', title: '操作说明书已成功生成并登记为草稿' });
      await loadData();
      onClose();
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : '创建操作说明失败'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <Flex align="center" gap={3}>
            <Heading size="md">新建操作说明（步骤化录入）</Heading>
            <Badge colorScheme="green" variant="subtle">
              操作 SOP 模板
            </Badge>
          </Flex>
          <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
            标准结构录入操作前提、多步骤分解、完成确认标志、常见异常排查与转人工升级条件。
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={6}>
          <Tabs variant="enclosed" colorScheme="green">
            <TabList mb={4}>
              <Tab fontWeight="600">步骤流程编辑器</Tab>
              <Tab fontWeight="600">Markdown 知识预览</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={2}>
                <Stack spacing={5}>
                  {/* 基本属性 */}
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="myGray.200"
                    borderRadius="lg"
                    bg="myGray.50"
                  >
                    <Heading size="xs" mb={3} color="myGray.700">
                      1. 基础信息
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">操作规程标题</FormLabel>
                        <Input
                          bg="white"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="例如：DT-2026A 更换相纸与色带标准操作规程"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">目标知识库</FormLabel>
                        <DatasetResourceSelect
                          value={dataset}
                          onChange={setDataset}
                          title="选择目标知识库"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">适用产品型号</FormLabel>
                        <Select
                          bg="white"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                        >
                          <option value="">全部/通用产品</option>
                          {catalog.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.modelCode})
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="sm">受众可见级别</FormLabel>
                        <Select
                          bg="white"
                          value={audience}
                          onChange={(e) =>
                            setAudience(e.target.value as CustomerServiceAudienceEnum)
                          }
                        >
                          {Object.values(CustomerServiceAudienceEnum).map((a) => (
                            <option key={a} value={a}>
                              {audienceMap[a]}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* 前提条件 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={2} color="myGray.700">
                      2. 操作前准备与前提条件
                    </Heading>
                    <Textarea
                      size="sm"
                      rows={3}
                      value={prerequisites}
                      onChange={(e) => setPrerequisites(e.target.value)}
                      placeholder="列出操作前所需工具、耗材规格、机器电源状态等前提条件"
                    />
                  </Box>

                  {/* 步骤列表 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="xs" color="myGray.700">
                        3. 标准操作步骤列表 ({steps.length} 个步骤)
                      </Heading>
                      <Button size="xs" colorScheme="green" variant="outline" onClick={addStep}>
                        + 添加新步骤
                      </Button>
                    </Flex>

                    <Stack spacing={4}>
                      {steps.map((step, idx) => (
                        <Box
                          key={step.stepNumber}
                          p={3}
                          borderWidth="1px"
                          borderColor="myGray.200"
                          borderRadius="md"
                          bg="white"
                        >
                          <Flex justify="space-between" align="center" mb={2}>
                            <HStack>
                              <Badge colorScheme="green">步骤 {step.stepNumber}</Badge>
                              <Input
                                size="sm"
                                maxW="280px"
                                fontWeight="600"
                                value={step.title}
                                onChange={(e) => updateStep(idx, 'title', e.target.value)}
                                placeholder="步骤简要标题"
                              />
                            </HStack>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => removeStep(idx)}
                            >
                              删除步骤
                            </Button>
                          </Flex>
                          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3} mt={2}>
                            <FormControl gridColumn={{ md: 'span 2' }}>
                              <FormLabel fontSize="xs">动作指令详解</FormLabel>
                              <Textarea
                                size="sm"
                                rows={2}
                                value={step.action}
                                onChange={(e) => updateStep(idx, 'action', e.target.value)}
                                placeholder="具体动作指导（如逆时针旋转卡扣、拉出纸头5cm等）"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="xs">预期确认标志</FormLabel>
                              <Textarea
                                size="sm"
                                rows={2}
                                value={step.expectedResult}
                                onChange={(e) => updateStep(idx, 'expectedResult', e.target.value)}
                                placeholder="如何判断该步骤成功（如听到咔哒声）"
                              />
                            </FormControl>
                            <FormControl gridColumn={{ md: 'span 3' }}>
                              <FormLabel fontSize="xs">⚠️ 注意事项与防错提示</FormLabel>
                              <Input
                                size="sm"
                                value={step.precautions || ''}
                                onChange={(e) => updateStep(idx, 'precautions', e.target.value)}
                                placeholder="例如：禁止带电插拔传感器排线"
                              />
                            </FormControl>
                          </SimpleGrid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {/* 完成标志与异常 */}
                  <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                    <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                      <Heading size="xs" mb={2} color="myGray.700">
                        4. 操作完成检验标志
                      </Heading>
                      <Textarea
                        size="sm"
                        rows={3}
                        value={completionCriteria}
                        onChange={(e) => setCompletionCriteria(e.target.value)}
                        placeholder="说明整套流程结束后的系统就绪状态与验收测试"
                      />
                    </Box>
                    <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                      <Heading size="xs" mb={2} color="myGray.700">
                        5. 常见异常排查与对策
                      </Heading>
                      <Textarea
                        size="sm"
                        rows={3}
                        value={failureTroubleshooting}
                        onChange={(e) => setFailureTroubleshooting(e.target.value)}
                        placeholder="列出操作失败时的常见原因与快速修复对策"
                      />
                    </Box>
                  </SimpleGrid>

                  {/* 转人工触发条件 */}
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="orange.200"
                    bg="orange.50"
                    borderRadius="lg"
                  >
                    <Heading size="xs" mb={2} color="orange.800">
                      6. 转人工客服与技术支持升级条件
                    </Heading>
                    <Textarea
                      size="sm"
                      rows={2}
                      bg="white"
                      value={escalationConditions}
                      onChange={(e) => setEscalationConditions(e.target.value)}
                      placeholder="明确指出不可自行处理的危险或重大硬件故障条件"
                    />
                  </Box>
                </Stack>
              </TabPanel>

              <TabPanel px={0} py={2}>
                <Box
                  p={4}
                  bg="myGray.50"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="myGray.200"
                >
                  <Markdown source={generatedMarkdown} />
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>

        <ModalFooter gap={3} bg="myGray.50" borderTopWidth="1px" borderColor="myGray.200">
          <Button variant="whiteBase" onClick={onClose}>
            取消
          </Button>
          <Button
            colorScheme="green"
            isLoading={submitting}
            isDisabled={!dataset}
            onClick={handleSubmit}
          >
            生成并登记操作指导
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ManualForm;
