import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
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
  Radio,
  RadioGroup,
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
import { DatasetResourceSelect } from '../ResourceSelectors';
import { useCustomerServiceContext, audienceMap, requestAdminApi } from '../context';
import type { StructuredFaultStep } from '../types';
import Markdown from '@/components/Markdown';

interface FaultCardFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataset?: SelectedDatasetType;
  defaultDatasetId?: string;
  defaultDatasetName?: string;
  onSuccess?: () => void;
}

const defaultFaultSteps: StructuredFaultStep[] = [
  {
    stepNumber: 1,
    checkPoint: '检查电源与总闸指示灯',
    action: '观察设备背部总电源开关指示灯是否常亮；若熄灭，检查插座供电或空开。',
    normalResult: '电源指示灯保持绿色常亮，电压处于 220V 正常区间。',
    abnormalFix: '若指示灯不亮，更换插座测试；若跳闸，请联系场馆电工。',
    isDangerous: false
  },
  {
    stepNumber: 2,
    checkPoint: '排查出货/切刀通道异物',
    action: '使用专用钥匙开门，肉眼观察切刀滑动导轨与齿轮处是否有卡纸碎屑。',
    normalResult: '通道无异物遮挡，切刀滑块复位顺畅。',
    abnormalFix: '使用防静电镊子小心清理卡纸碎屑，切勿使用暴力拉扯。',
    isDangerous: false
  },
  {
    stepNumber: 3,
    checkPoint: '主控板与高压电源模块自检',
    action: '观察主控板 LED3 诊断灯闪烁频率（正常为 1 秒 1 闪）。',
    normalResult: '主控板自检通讯正常，无持续蜂鸣报警。',
    abnormalFix: '若持续蜂鸣报警或伴随烧焦味，严禁私自拆卸高压电源盒，立即断电转人工。',
    isDangerous: true
  }
];

export const FaultCardForm: React.FC<FaultCardFormProps> = ({
  isOpen,
  onClose,
  defaultDataset,
  defaultDatasetId,
  defaultDatasetName,
  onSuccess
}) => {
  const toast = useToast();
  const { catalog, createKnowledge, loadData } = useCustomerServiceContext();
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [title, setTitle] = useState('');
  const [errorCode, setErrorCode] = useState('ERR-1002');
  const [symptom, setSymptom] = useState('设备通电后无响应且屏幕黑屏 / 打印切刀卡死报错');
  const [dataset, setDataset] = useState<SelectedDatasetType | undefined>(
    defaultDataset
      ? defaultDataset
      : defaultDatasetId
        ? {
            datasetId: defaultDatasetId,
            name: defaultDatasetName || '当前知识库',
            avatar: 'core/dataset/fileCollection',
            vectorModel: { model: '' }
          }
        : undefined
  );
  const [modelId, setModelId] = useState('');
  const [applicableVersions, setApplicableVersions] = useState('V2.0 及以上硬件版本 / 全固件版本');
  const [riskLevel, setRiskLevel] = useState<'normal' | 'warning' | 'hazard'>('warning');
  const [audience, setAudience] = useState<CustomerServiceAudienceEnum>(
    CustomerServiceAudienceEnum.public
  );

  const [steps, setSteps] = useState<StructuredFaultStep[]>(defaultFaultSteps);
  const [escalationRules, setEscalationRules] = useState(
    '1. 经步骤 1-2 排查后错误码 ERR-1002 依然未清除；\n2. 发现电源或电机发热严重（>60℃）或有异味；\n3. 涉及强电箱拆装，普通用户与经销商严禁自行操作，必须升级售后工单。'
  );

  const selectedModel = useMemo(
    () => catalog.models.find((m) => m.id === modelId),
    [catalog.models, modelId]
  );

  const addStep = () => {
    const nextNum = steps.length + 1;
    setSteps([
      ...steps,
      {
        stepNumber: nextNum,
        checkPoint: `排查点 ${nextNum}`,
        action: '',
        normalResult: '',
        abnormalFix: '',
        isDangerous: false
      }
    ]);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) {
      toast({ status: 'warning', title: '至少保留一项排查步骤' });
      return;
    }
    const filtered = steps.filter((_, i) => i !== idx);
    setSteps(filtered.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const updateStep = (idx: number, field: keyof StructuredFaultStep, val: any) => {
    const next = [...steps];
    next[idx] = { ...next[idx], [field]: val };
    setSteps(next);
  };

  const generatedMarkdown = useMemo(() => {
    const modelNameStr = selectedModel
      ? `${selectedModel.name} (${selectedModel.modelCode})`
      : '通用设备';
    const cardTitle = title.trim() || `【故障卡】${errorCode} ${symptom}`;

    let md = `# ${cardTitle}

> **文档类别**：售后故障诊断卡 | **错误代码**：\`${errorCode}\` | **适用型号**：${modelNameStr} | **危险级别**：${
      riskLevel === 'hazard'
        ? '🔴 高危阻断 (严禁自行拆机)'
        : riskLevel === 'warning'
          ? '🟡 注意警告'
          : '🟢 普通排查'
    } | **可见受众**：${audienceMap[audience]}

---

## 1. 故障现象描述与适用版本
- **故障现象**：${symptom}
- **错误代码**：\`${errorCode}\`
- **适用软硬件版本**：${applicableVersions || '全部版本'}

`;

    if (riskLevel === 'hazard') {
      md += `
> ⚠️ **【强安全危险阻断警告】**：
> 本故障涉及内部 220V 强电系统或高速机械部件！非专业受训售后工程师**严禁私自拆开设备外壳或触碰电源模块**，违规操作可能导致触电或设备永久损坏！
`;
    }

    md += `
---

## 2. 标准故障排查步骤树 (Checklist)
`;

    steps.forEach((step) => {
      md += `
### 步骤 ${step.stepNumber}：${step.checkPoint}
- **排查动作**：${step.action || '按规范执行排查'}
- **正常状态**：${step.normalResult || '功能正常'}
- **异常处置**：${step.abnormalFix || '参考说明书修复'}
${step.isDangerous ? '- **⚠️ 安全警示**：此步骤涉及微动开关或电源，操作时请务必先断电！' : ''}
`;
    });

    md += `
---

## 3. 转人工客服与售后工单判定规则
> **触发以下条件时，客服系统将自动生成工单摘要并转接人工**：
${escalationRules}

- **工单生成建议格式**：\`【${modelNameStr}】故障代码:${errorCode} | 现象:${symptom} | 已执行排查步骤:${steps.map((s) => `S${s.stepNumber}`).join('+')}\`
`;

    return md;
  }, [
    selectedModel,
    title,
    errorCode,
    symptom,
    riskLevel,
    audience,
    applicableVersions,
    steps,
    escalationRules
  ]);

  const handleSubmit = async () => {
    if (!dataset) {
      toast({ status: 'warning', title: '请选择目标知识库' });
      return;
    }
    const finalTitle = title.trim() || `【故障卡】${errorCode} ${symptom.slice(0, 30)}`;

    setSubmitting(true);
    try {
      await requestAdminApi({
        url: '/api/customer-service/admin/knowledge/createStructured',
        method: 'POST',
        body: {
          datasetId: dataset.datasetId,
          title: finalTitle,
          templateType: 'faultCard',
          audienceLevel: audience,
          modelIds: modelId ? [modelId] : [],
          templateData: {
            markdown: generatedMarkdown,
            faultCode: errorCode,
            faultPhenomenon: symptom,
            possibleCauses: `1. 对应部位机械部件卡死或异物阻挡；\n2. 光电/接近传感器积灰信号丢失；\n3. 驱动电机过载或线束松脱。`,
            troubleshootingSteps: steps
              .map(
                (s) =>
                  `步骤 ${s.stepNumber}：${s.checkPoint} - 检查项：${s.action} - 正常现象：${s.normalResult} - 处置：${s.abnormalFix}`
              )
              .join('\n'),
            spareParts: '标准备品备件库对应备件',
            escalationCondition: escalationRules || '若完成排查后故障仍未消除，自动触发转人工工单。'
          }
        }
      });

      toast({ status: 'success', title: '售后故障卡已成功登记并进入审核流' });
      await loadData();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : '创建故障卡失败'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent maxH="92vh">
        <ModalHeader>
          <Flex align="center" gap={3}>
            <Heading size="md">新建售后故障卡（排查树录入）</Heading>
            <Badge
              colorScheme={
                riskLevel === 'hazard' ? 'red' : riskLevel === 'warning' ? 'orange' : 'green'
              }
            >
              {riskLevel === 'hazard'
                ? '高危故障'
                : riskLevel === 'warning'
                  ? '警告故障'
                  : '常规故障'}
            </Badge>
          </Flex>
          <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
            标准化录入错误码、故障现象、危险等级划分、结构化排查步骤与智能转人工工单触发规则。
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={6}>
          <Tabs variant="enclosed" colorScheme="red">
            <TabList mb={4}>
              <Tab fontWeight="600">故障诊断配置</Tab>
              <Tab fontWeight="600">Markdown 知识预览</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={2}>
                <Stack spacing={5}>
                  {/* 基本与风险等级 */}
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="myGray.200"
                    borderRadius="lg"
                    bg="myGray.50"
                  >
                    <Heading size="xs" mb={3} color="myGray.700">
                      1. 故障基本定义与危险等级
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                      <FormControl isRequired>
                        <FormLabel fontSize="xs">错误代码 (Error Code)</FormLabel>
                        <Input
                          size="sm"
                          bg="white"
                          value={errorCode}
                          onChange={(e) => setErrorCode(e.target.value)}
                          placeholder="例如：ERR-1002"
                        />
                      </FormControl>
                      <FormControl isRequired gridColumn={{ md: 'span 2' }}>
                        <FormLabel fontSize="xs">故障卡标题 / 故障现象</FormLabel>
                        <Input
                          size="sm"
                          bg="white"
                          value={symptom}
                          onChange={(e) => setSymptom(e.target.value)}
                          placeholder="例如：通电黑屏或切刀卡死"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="xs">目标知识库</FormLabel>
                        <DatasetResourceSelect
                          value={dataset}
                          onChange={setDataset}
                          title="选择目标知识库"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">适用产品型号</FormLabel>
                        <Select
                          size="sm"
                          bg="white"
                          value={modelId}
                          onChange={(e) => setModelId(e.target.value)}
                        >
                          <option value="">全部型号</option>
                          {catalog.models.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">受众可见权限</FormLabel>
                        <Select
                          size="sm"
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

                    {/* 危险级别单选 */}
                    <Box
                      mt={4}
                      p={3}
                      bg="white"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="myGray.200"
                    >
                      <FormLabel fontSize="xs" fontWeight="600" mb={2}>
                        安全危险级别 (Safety Risk Level)
                      </FormLabel>
                      <RadioGroup value={riskLevel} onChange={(v: any) => setRiskLevel(v)}>
                        <Stack direction={{ base: 'column', md: 'row' }} spacing={5}>
                          <Radio value="normal" colorScheme="green">
                            <Text fontSize="xs">🟢 普通排查（客户可自助排查）</Text>
                          </Radio>
                          <Radio value="warning" colorScheme="orange">
                            <Text fontSize="xs">🟡 注意警告（需注意高温/机械夹伤）</Text>
                          </Radio>
                          <Radio value="hazard" colorScheme="red">
                            <Text fontSize="xs" fontWeight="600" color="red.600">
                              🔴 高危阻断（强电/拆机阻断警告）
                            </Text>
                          </Radio>
                        </Stack>
                      </RadioGroup>
                    </Box>
                  </Box>

                  {/* 排查步骤树 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Flex justify="space-between" align="center" mb={3}>
                      <Heading size="xs" color="myGray.700">
                        2. 结构化排查步骤清单 ({steps.length} 步)
                      </Heading>
                      <Button size="xs" colorScheme="red" variant="outline" onClick={addStep}>
                        + 添加排查步骤
                      </Button>
                    </Flex>

                    <Stack spacing={3}>
                      {steps.map((step, idx) => (
                        <Box
                          key={step.stepNumber}
                          p={3}
                          borderWidth="1px"
                          borderColor="myGray.200"
                          borderRadius="md"
                          bg="myGray.50"
                        >
                          <Flex justify="space-between" align="center" mb={2}>
                            <HStack>
                              <Badge colorScheme="red">步骤 {step.stepNumber}</Badge>
                              <Input
                                size="sm"
                                maxW="240px"
                                bg="white"
                                fontWeight="600"
                                value={step.checkPoint}
                                onChange={(e) => updateStep(idx, 'checkPoint', e.target.value)}
                                placeholder="排查重点项目"
                              />
                            </HStack>
                            <HStack>
                              <Checkbox
                                size="sm"
                                colorScheme="red"
                                isChecked={step.isDangerous}
                                onChange={(e) => updateStep(idx, 'isDangerous', e.target.checked)}
                              >
                                <Text fontSize="xs" color="red.600">
                                  带电/危险动作
                                </Text>
                              </Checkbox>
                              <Button
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => removeStep(idx)}
                              >
                                删除
                              </Button>
                            </HStack>
                          </Flex>
                          <SimpleGrid columns={{ base: 1, md: 3 }} gap={2}>
                            <FormControl>
                              <FormLabel fontSize="xs">排查操作动作</FormLabel>
                              <Textarea
                                size="sm"
                                rows={2}
                                bg="white"
                                value={step.action}
                                onChange={(e) => updateStep(idx, 'action', e.target.value)}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="xs">正常状态标志</FormLabel>
                              <Textarea
                                size="sm"
                                rows={2}
                                bg="white"
                                value={step.normalResult}
                                onChange={(e) => updateStep(idx, 'normalResult', e.target.value)}
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="xs">异常对策处置</FormLabel>
                              <Textarea
                                size="sm"
                                rows={2}
                                bg="white"
                                value={step.abnormalFix}
                                onChange={(e) => updateStep(idx, 'abnormalFix', e.target.value)}
                              />
                            </FormControl>
                          </SimpleGrid>
                        </Box>
                      ))}
                    </Stack>
                  </Box>

                  {/* 转人工判定规则 */}
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="orange.200"
                    bg="orange.50"
                    borderRadius="lg"
                  >
                    <Heading size="xs" mb={2} color="orange.800">
                      3. 转人工客服与工单判定规则
                    </Heading>
                    <Textarea
                      size="sm"
                      rows={3}
                      bg="white"
                      value={escalationRules}
                      onChange={(e) => setEscalationRules(e.target.value)}
                      placeholder="指定哪些情况触发一键转人工或生成工单"
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
            colorScheme="red"
            isLoading={submitting}
            isDisabled={!dataset}
            onClick={handleSubmit}
          >
            生成并登记故障卡
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FaultCardForm;
