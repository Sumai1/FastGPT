import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
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
import { useCustomerServiceContext, audienceMap, requestAdminApi } from '../context';
import Markdown from '@/components/Markdown';

interface ProductMasterFormProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataset?: SelectedDatasetType;
  defaultDatasetId?: string;
  defaultDatasetName?: string;
  onSuccess?: () => void;
}

export const ProductMasterForm: React.FC<ProductMasterFormProps> = ({
  isOpen,
  onClose,
  defaultDataset,
  defaultDatasetId,
  defaultDatasetName,
  onSuccess
}) => {
  const toast = useToast();
  const { catalog, seriesMap, createKnowledge, loadData } = useCustomerServiceContext();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
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
  const [audience, setAudience] = useState<CustomerServiceAudienceEnum>(
    CustomerServiceAudienceEnum.public
  );

  // Dimensions & Housing
  const [lengthMm, setLengthMm] = useState<number>(450);
  const [widthMm, setWidthMm] = useState<number>(380);
  const [heightMm, setHeightMm] = useState<number>(1650);
  const [weightKg, setWeightKg] = useState<number>(45);
  const [housingMaterial, setHousingMaterial] = useState('冷轧碳素钢板 + 汽车级烤漆');

  // Electrical & Power
  const [ratedPowerW, setRatedPowerW] = useState<number>(150);
  const [voltageRange, setVoltageRange] = useState('AC 220V ± 10%, 50Hz');
  const [standbyPowerW, setStandbyPowerW] = useState<number>(15);
  const [powerPlugType, setPowerPlugType] = useState('国标三脚插头（须可靠接地）');

  // Network & Connectivity
  const [wifiSupported, setWifiSupported] = useState(true);
  const [cellularType, setCellularType] = useState('4G 全网通 (Cat.1)');
  const [rj45Ethernet, setRj45Ethernet] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);

  // Consumables & Options
  const [paperSpec, setPaperSpec] = useState('80mm × 80mm 热敏打印纸卷');
  const [inkOrRibbon, setInkOrRibbon] = useState('热升华 6 寸相纸色带套装');
  const [capacityNotes, setCapacityNotes] = useState(
    '最大装纸容量 350 张，建议余量低于 30 张时补充'
  );
  const [optionalFeatures, setOptionalFeatures] = useState(
    '二维码扫码器、人脸识别摄像头、补光灯、现金纸币器'
  );

  // Warranty & Support
  const [warrantyMonths, setWarrantyMonths] = useState<number>(12);
  const [freeMaintenanceConditions, setFreeMaintenanceConditions] = useState(
    '非人为损坏情况下整机质保 1 年，核心主板与电源模块质保 2 年。'
  );
  const [supportHotline, setSupportHotline] = useState('400-800-6688');

  // Generate Markdown representation
  const selectedModel = useMemo(
    () => catalog.models.find((m) => m.id === modelId),
    [catalog.models, modelId]
  );

  const generatedMarkdown = useMemo(() => {
    const modelNameStr = selectedModel
      ? `${selectedModel.name} (${selectedModel.modelCode})`
      : '通用设备';
    const docTitle = title.trim() || `${modelNameStr} 产品主档规格书`;

    return `# ${docTitle}

> **文档类别**：产品主档与规格参数 | **适用型号**：${modelNameStr} | **可见范围**：${audienceMap[audience]}

---

## 1. 设备基本信息与外形规格
- **设备型号**：${modelNameStr}
- **整机尺寸**：${lengthMm} mm (长) × ${widthMm} mm (宽) × ${heightMm} mm (高)
- **设备净重**：约 ${weightKg} kg
- **外壳材质与工艺**：${housingMaterial}

## 2. 电气与供电参数
- **额定功率**：${ratedPowerW} W
- **工作电压**：${voltageRange}
- **待机功耗**：${standbyPowerW} W
- **电源接口与接地要求**：${powerPlugType}
- **安全防范**：严禁私自改装电源接线；雷雨天气需确保防雷接地良好。

## 3. 网络与通讯接口
- **Wi-Fi 支持**：${wifiSupported ? '支持 (2.4GHz / 5GHz 双频)' : '不支持'}
- **蜂窝移动网络**：${cellularType}
- **有线以太网**：${rj45Ethernet ? '标准 RJ45 千兆/百兆自适应网口' : '无'}
- **蓝牙通讯**：${bluetooth ? '支持 Bluetooth 5.0' : '无'}

## 4. 耗材规格与装载容量
- **打印介质规格**：${paperSpec}
- **色带 / 墨水耗材**：${inkOrRibbon}
- **装载容量与维护周期**：${capacityNotes}

## 5. 选配功能与外设
- **支持外设组件**：${optionalFeatures}

## 6. 售后质保与技术支持
- **标准质保期限**：${warrantyMonths} 个月
- **保修政策约定**：${freeMaintenanceConditions}
- **技术支持热线**：${supportHotline}
`;
  }, [
    selectedModel,
    title,
    audience,
    lengthMm,
    widthMm,
    heightMm,
    weightKg,
    housingMaterial,
    ratedPowerW,
    voltageRange,
    standbyPowerW,
    powerPlugType,
    wifiSupported,
    cellularType,
    rj45Ethernet,
    bluetooth,
    paperSpec,
    inkOrRibbon,
    capacityNotes,
    optionalFeatures,
    warrantyMonths,
    freeMaintenanceConditions,
    supportHotline
  ]);

  const handleSubmit = async () => {
    if (!dataset) {
      toast({ status: 'warning', title: '请选择目标知识库' });
      return;
    }
    const finalTitle = title.trim() || `${selectedModel?.name || '设备'}产品主档规格书`;

    setSubmitting(true);
    try {
      await requestAdminApi({
        url: '/api/customer-service/admin/knowledge/createStructured',
        method: 'POST',
        body: {
          datasetId: dataset.datasetId,
          title: finalTitle,
          templateType: 'productMaster',
          audienceLevel: audience,
          modelIds: modelId ? [modelId] : [],
          templateData: {
            markdown: generatedMarkdown,
            brand:
              (selectedModel ? seriesMap.get(selectedModel.seriesId)?.name : '标准品牌') ||
              '标准品牌',
            modelName: selectedModel?.name || '标准型号',
            category: '无人自助设备',
            powerSpecs: `${ratedPowerW}W (${voltageRange}, 待机 ${standbyPowerW}W)`,
            dimensions: `${lengthMm}×${widthMm}×${heightMm}mm, ${weightKg}kg (${housingMaterial})`,
            operatingEnv: '0℃~40℃, 湿度 20%~80% RH',
            consumables: `${paperSpec} / ${inkOrRibbon} (${capacityNotes})`,
            interfaces: `${wifiSupported ? 'Wi-Fi ' : ''}${cellularType} ${rj45Ethernet ? 'RJ45' : ''}`,
            warrantyPolicy: `整机保修 ${warrantyMonths} 个月 (${freeMaintenanceConditions}, 服务热线: ${supportHotline})`
          }
        }
      });

      toast({ status: 'success', title: '产品主档标准化知识已登记为草稿' });
      await loadData();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : '创建产品主档失败'
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
            <Heading size="md">新建产品主档（标准化录入）</Heading>
            <Badge colorScheme="blue" variant="subtle">
              产品规格模板
            </Badge>
          </Flex>
          <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
            标准化结构录入额定功率、尺寸重量、网络供电、耗材规格与质保条款，一键生成高质量 Markdown
            知识并提交审核。
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={6}>
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList mb={4}>
              <Tab fontWeight="600">标准化参数录入</Tab>
              <Tab fontWeight="600">Markdown 知识预览</Tab>
            </TabList>

            <TabPanels>
              <TabPanel px={0} py={2}>
                <Stack spacing={5}>
                  {/* 基本归属 */}
                  <Box
                    p={4}
                    borderWidth="1px"
                    borderColor="myGray.200"
                    borderRadius="lg"
                    bg="myGray.50"
                  >
                    <Heading size="xs" mb={3} color="myGray.700">
                      1. 基础信息与知识库归属
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">文档标题</FormLabel>
                        <Input
                          bg="white"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="例如：DT-2026A 拍照机产品主档与规格参数"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel fontSize="sm">保存到知识库</FormLabel>
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
                        <FormLabel fontSize="sm">最高可见受众</FormLabel>
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

                  {/* 尺寸与外壳 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={3} color="myGray.700">
                      2. 外形尺寸与材质重量
                    </Heading>
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
                      <FormControl>
                        <FormLabel fontSize="xs">长度 (mm)</FormLabel>
                        <NumberInput value={lengthMm} onChange={(_, val) => setLengthMm(val || 0)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">宽度 (mm)</FormLabel>
                        <NumberInput value={widthMm} onChange={(_, val) => setWidthMm(val || 0)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">高度 (mm)</FormLabel>
                        <NumberInput value={heightMm} onChange={(_, val) => setHeightMm(val || 0)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">设备净重 (kg)</FormLabel>
                        <NumberInput value={weightKg} onChange={(_, val) => setWeightKg(val || 0)}>
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>
                      <FormControl gridColumn={{ base: 'span 2', md: 'span 4' }}>
                        <FormLabel fontSize="xs">外壳材质与工艺</FormLabel>
                        <Input
                          size="sm"
                          value={housingMaterial}
                          onChange={(e) => setHousingMaterial(e.target.value)}
                          placeholder="例如：冷轧钢板机身 + 防刮耐磨喷塑工艺"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* 电气与电源 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={3} color="myGray.700">
                      3. 电气参数与供电规格
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <FormControl>
                        <FormLabel fontSize="xs">额定功率 (W)</FormLabel>
                        <NumberInput
                          value={ratedPowerW}
                          onChange={(_, val) => setRatedPowerW(val || 0)}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">工作电压范围</FormLabel>
                        <Input
                          size="sm"
                          value={voltageRange}
                          onChange={(e) => setVoltageRange(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">待机功耗 (W)</FormLabel>
                        <NumberInput
                          value={standbyPowerW}
                          onChange={(_, val) => setStandbyPowerW(val || 0)}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">电源插头及接地规格</FormLabel>
                        <Input
                          size="sm"
                          value={powerPlugType}
                          onChange={(e) => setPowerPlugType(e.target.value)}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* 网络与通讯 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={3} color="myGray.700">
                      4. 网络与通讯接口
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <FormControl>
                        <FormLabel fontSize="xs">移动蜂窝网络制式</FormLabel>
                        <Input
                          size="sm"
                          value={cellularType}
                          onChange={(e) => setCellularType(e.target.value)}
                          placeholder="例如：4G Cat.1 全网通"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">网络与接口开关</FormLabel>
                        <HStack spacing={4} mt={2}>
                          <Checkbox
                            isChecked={wifiSupported}
                            onChange={(e) => setWifiSupported(e.target.checked)}
                          >
                            Wi-Fi 支持
                          </Checkbox>
                          <Checkbox
                            isChecked={rj45Ethernet}
                            onChange={(e) => setRj45Ethernet(e.target.checked)}
                          >
                            RJ45 有线网口
                          </Checkbox>
                          <Checkbox
                            isChecked={bluetooth}
                            onChange={(e) => setBluetooth(e.target.checked)}
                          >
                            蓝牙
                          </Checkbox>
                        </HStack>
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* 耗材与选配 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={3} color="myGray.700">
                      5. 耗材规格与选配组件
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <FormControl>
                        <FormLabel fontSize="xs">纸卷 / 打印耗材规格</FormLabel>
                        <Input
                          size="sm"
                          value={paperSpec}
                          onChange={(e) => setPaperSpec(e.target.value)}
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">色带 / 墨盒规格</FormLabel>
                        <Input
                          size="sm"
                          value={inkOrRibbon}
                          onChange={(e) => setInkOrRibbon(e.target.value)}
                        />
                      </FormControl>
                      <FormControl gridColumn={{ base: 'span 1', md: 'span 2' }}>
                        <FormLabel fontSize="xs">耗材容量与装载周期说明</FormLabel>
                        <Input
                          size="sm"
                          value={capacityNotes}
                          onChange={(e) => setCapacityNotes(e.target.value)}
                        />
                      </FormControl>
                      <FormControl gridColumn={{ base: 'span 1', md: 'span 2' }}>
                        <FormLabel fontSize="xs">支持外设与选配功能</FormLabel>
                        <Input
                          size="sm"
                          value={optionalFeatures}
                          onChange={(e) => setOptionalFeatures(e.target.value)}
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Box>

                  {/* 质保售后 */}
                  <Box p={4} borderWidth="1px" borderColor="myGray.200" borderRadius="lg">
                    <Heading size="xs" mb={3} color="myGray.700">
                      6. 售后质保与服务热线
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <FormControl>
                        <FormLabel fontSize="xs">质保期限 (月)</FormLabel>
                        <NumberInput
                          value={warrantyMonths}
                          onChange={(_, val) => setWarrantyMonths(val || 0)}
                        >
                          <NumberInputField />
                        </NumberInput>
                      </FormControl>
                      <FormControl>
                        <FormLabel fontSize="xs">服务支持热线</FormLabel>
                        <Input
                          size="sm"
                          value={supportHotline}
                          onChange={(e) => setSupportHotline(e.target.value)}
                        />
                      </FormControl>
                      <FormControl gridColumn={{ base: 'span 1', md: 'span 2' }}>
                        <FormLabel fontSize="xs">保修与免费维护条款</FormLabel>
                        <Textarea
                          size="sm"
                          rows={2}
                          value={freeMaintenanceConditions}
                          onChange={(e) => setFreeMaintenanceConditions(e.target.value)}
                        />
                      </FormControl>
                    </SimpleGrid>
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
            colorScheme="blue"
            isLoading={submitting}
            isDisabled={!dataset}
            onClick={handleSubmit}
          >
            生成并登记知识草稿
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductMasterForm;
