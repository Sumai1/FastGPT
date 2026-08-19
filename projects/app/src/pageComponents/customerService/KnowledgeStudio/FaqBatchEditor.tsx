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
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
  useToast,
  VStack
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import { DatasetResourceSelect } from '../ResourceSelectors';
import { useCustomerServiceContext, audienceMap, requestAdminApi } from '../context';
import type { StructuredFaqItem } from '../types';
import Markdown from '@/components/Markdown';

interface FaqBatchEditorProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDataset?: SelectedDatasetType;
  defaultDatasetId?: string;
  defaultDatasetName?: string;
  onSuccess?: () => void;
}

const initialFaqs: StructuredFaqItem[] = [
  {
    id: 'faq-1',
    standardQuestion: '设备出货时卡货/扣费未出货怎么办？',
    similarQuestions: [
      '付了钱没有掉东西出来',
      '机器卡住了货没出来',
      '商品卡在出货口了',
      '扣费失败但出货了'
    ],
    conciseAnswer:
      '请检查出货口挡板是否被异物阻挡；若未掉落，系统将在 3 分钟内自动发起退款，您也可以点击“转人工客服”提交订单号核实。',
    detailedAnswer:
      '1. 检查出货门是否完全回位；\n2. 观察机器屏幕是否有“正在退款”提示；\n3. 售货机光电检测传感器会在确认未掉落后自动原路退款至支付账户。',
    categoryTag: '售卖出货'
  },
  {
    id: 'faq-2',
    standardQuestion: '拍照机屏幕显示“打印机缺纸”如何处理？',
    similarQuestions: [
      '相纸用完了去哪里加',
      '屏幕提示纸张耗尽',
      '打印不出照片显示缺纸',
      'ERR-102 缺纸报错'
    ],
    conciseAnswer: '此提示表示热敏相纸已用尽，请联系现场运维人员开锁更换 80mm*80mm 标准相纸卷。',
    detailedAnswer:
      '更换步骤：使用钥匙打开前维护门 -> 取出空纸芯 -> 装入新纸卷并拉出 5cm -> 合盖扣紧自检。',
    categoryTag: '耗材与故障'
  }
];

export const FaqBatchEditor: React.FC<FaqBatchEditorProps> = ({
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

  // Group Info
  const [batchTitle, setBatchTitle] = useState('企业智能客服常见问题集 (FAQ)');
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

  // FAQ Items
  const [faqList, setFaqList] = useState<StructuredFaqItem[]>(initialFaqs);
  const [activeFaqIndex, setActiveFaqIndex] = useState<number>(0);
  const [newTagInput, setNewTagInput] = useState('');
  const [quickPasteText, setQuickPasteText] = useState('');

  const currentFaq = faqList[activeFaqIndex] ?? faqList[0];

  const selectedModel = useMemo(
    () => catalog.models.find((m) => m.id === modelId),
    [catalog.models, modelId]
  );

  // Add empty FAQ
  const handleAddFaq = () => {
    const newItem: StructuredFaqItem = {
      id: `faq-${Date.now()}`,
      standardQuestion: '',
      similarQuestions: [],
      conciseAnswer: '',
      detailedAnswer: '',
      categoryTag: '常用问答'
    };
    const nextList = [...faqList, newItem];
    setFaqList(nextList);
    setActiveFaqIndex(nextList.length - 1);
  };

  // Remove FAQ
  const handleRemoveFaq = (index: number) => {
    if (faqList.length <= 1) {
      toast({ status: 'warning', title: '至少保留一条问答记录' });
      return;
    }
    const nextList = faqList.filter((_, i) => i !== index);
    setFaqList(nextList);
    setActiveFaqIndex(Math.max(0, index - 1));
  };

  // Update current FAQ field
  const updateCurrentFaq = (field: keyof StructuredFaqItem, value: any) => {
    const nextList = [...faqList];
    nextList[activeFaqIndex] = { ...nextList[activeFaqIndex], [field]: value };
    setFaqList(nextList);
  };

  // Add similar question tag
  const handleAddSimilarQuestion = () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (currentFaq.similarQuestions.includes(trimmed)) {
      toast({ status: 'warning', title: '该相似问已存在' });
      return;
    }
    const nextTags = [...currentFaq.similarQuestions, trimmed];
    updateCurrentFaq('similarQuestions', nextTags);
    setNewTagInput('');
  };

  const handleRemoveSimilarQuestion = (tagIndex: number) => {
    const nextTags = currentFaq.similarQuestions.filter((_, i) => i !== tagIndex);
    updateCurrentFaq('similarQuestions', nextTags);
  };

  // Quick text parser (Q: ... A: ...)
  const handleParseQuickText = () => {
    if (!quickPasteText.trim()) return;
    const blocks = quickPasteText.split(/\n\s*\n/);
    const parsedItems: StructuredFaqItem[] = [];

    blocks.forEach((block, idx) => {
      const lines = block
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      let q = '';
      let a = '';
      const similar: string[] = [];

      lines.forEach((line) => {
        if (/^(Q|问|问题)[:：]/i.test(line)) {
          q = line.replace(/^(Q|问|问题)[:：]\s*/i, '');
        } else if (/^(A|答|回答)[:：]/i.test(line)) {
          a = line.replace(/^(A|答|回答)[:：]\s*/i, '');
        } else if (/^(相似问|同义句)[:：]/i.test(line)) {
          const sims = line
            .replace(/^(相似问|同义句)[:：]\s*/i, '')
            .split(/[,，、|]/)
            .map((s) => s.trim())
            .filter(Boolean);
          similar.push(...sims);
        } else {
          if (a) a += '\n' + line;
          else if (!q) q = line;
          else similar.push(line);
        }
      });

      if (q && (a || lines.length > 1)) {
        parsedItems.push({
          id: `parsed-${Date.now()}-${idx}`,
          standardQuestion: q,
          similarQuestions: similar,
          conciseAnswer: a || '请参考相关知识库操作说明',
          detailedAnswer: '',
          categoryTag: '批量导入'
        });
      }
    });

    if (parsedItems.length > 0) {
      setFaqList([...faqList, ...parsedItems]);
      setQuickPasteText('');
      toast({ status: 'success', title: `成功解析追加 ${parsedItems.length} 条常见问题` });
    } else {
      toast({ status: 'warning', title: '未能识别问答格式，请使用“Q:问题 A:回答”格式' });
    }
  };

  // Markdown representation
  const generatedMarkdown = useMemo(() => {
    const modelNameStr = selectedModel
      ? `${selectedModel.name} (${selectedModel.modelCode})`
      : '通用设备';
    const docTitle = batchTitle.trim() || `${modelNameStr} 常见问题解答 FAQ`;

    let md = `# ${docTitle}

> **文档类别**：常见问题 (FAQ) 知识库 | **适用型号**：${modelNameStr} | **可见范围**：${audienceMap[audience]} | **条目总数**：${faqList.length} 条

---
`;

    faqList.forEach((item, index) => {
      md += `
## FAQ ${index + 1}：${item.standardQuestion || '未命名问题'}
- **分类标签**：\`${item.categoryTag || '通用'}\`
- **相似问 / 触发词**：${item.similarQuestions.length > 0 ? item.similarQuestions.map((s) => `\`${s}\``).join('、') : '无额外相似问'}
- **核心简答**：
> ${item.conciseAnswer || '暂无答案'}

${item.detailedAnswer ? `**详细说明与指引**：\n${item.detailedAnswer}\n` : ''}
---
`;
    });

    return md;
  }, [batchTitle, selectedModel, audience, faqList]);

  // Submit to Dataset
  const handleSubmit = async () => {
    if (!dataset) {
      toast({ status: 'warning', title: '请选择目标知识库' });
      return;
    }
    const emptyCount = faqList.filter(
      (f) => !f.standardQuestion.trim() || !f.conciseAnswer.trim()
    ).length;
    if (emptyCount > 0) {
      toast({ status: 'warning', title: `有 ${emptyCount} 条问答的标准问题或回答未填写完整` });
      return;
    }

    setSubmitting(true);
    try {
      const finalTitle = batchTitle.trim() || `FAQ 问答集 (${faqList.length}条)`;
      await requestAdminApi({
        url: '/api/customer-service/admin/knowledge/importBatch',
        method: 'POST',
        body: {
          datasetId: dataset.datasetId,
          title: finalTitle,
          audienceLevel: audience,
          modelIds: modelId ? [modelId] : [],
          items: faqList.map((f) => ({
            question: f.standardQuestion.trim(),
            similarQuestions: f.similarQuestions,
            answer: f.conciseAnswer.trim(),
            detailedAnswer: f.detailedAnswer?.trim() || undefined,
            categoryTag: f.categoryTag?.trim() || undefined
          }))
        }
      });

      toast({ status: 'success', title: `成功登记 ${faqList.length} 条 FAQ 知识到草稿库` });
      await loadData();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast({
        status: 'error',
        title: err instanceof Error ? err.message : 'FAQ 批量录入失败'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent maxH="92vh">
        <ModalHeader>
          <Flex align="center" gap={3}>
            <Heading size="md">FAQ 批量导入与多相似问编辑器</Heading>
            <Badge colorScheme="purple" variant="subtle">
              {faqList.length} 条问答
            </Badge>
          </Flex>
          <Text mt={1} fontSize="xs" color="myGray.500" fontWeight="normal">
            支持标准问答维护、多相似问 Tags 扩展，可单条精细化编辑或文本格式快速批量粘贴导入。
          </Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody p={6}>
          <Tabs variant="enclosed" colorScheme="purple">
            <TabList mb={4}>
              <Tab fontWeight="600">问答可视化编辑</Tab>
              <Tab fontWeight="600">快速批量文本导入</Tab>
              <Tab fontWeight="600">Markdown 知识预览</Tab>
            </TabList>

            <TabPanels>
              {/* Tab 1: Visual Editor */}
              <TabPanel px={0} py={2}>
                <Stack spacing={4}>
                  {/* Top Metadata */}
                  <SimpleGrid
                    columns={{ base: 1, md: 4 }}
                    gap={3}
                    p={4}
                    bg="myGray.50"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="myGray.200"
                  >
                    <FormControl isRequired gridColumn={{ md: 'span 2' }}>
                      <FormLabel fontSize="xs">问答合集标题</FormLabel>
                      <Input
                        size="sm"
                        bg="white"
                        value={batchTitle}
                        onChange={(e) => setBatchTitle(e.target.value)}
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
                  </SimpleGrid>

                  {/* Split Layout: Left List + Right Editor */}
                  <Flex gap={4} minH="440px" direction={{ base: 'column', md: 'row' }}>
                    {/* Left FAQ Navigation list */}
                    <Box
                      w={{ base: '100%', md: '260px' }}
                      flexShrink={0}
                      borderWidth="1px"
                      borderColor="myGray.200"
                      borderRadius="lg"
                      p={3}
                      bg="white"
                    >
                      <Flex justify="space-between" align="center" mb={3}>
                        <Text fontWeight="600" fontSize="sm">
                          问答清单 ({faqList.length})
                        </Text>
                        <Button size="xs" colorScheme="purple" onClick={handleAddFaq}>
                          + 新增问答
                        </Button>
                      </Flex>
                      <Stack maxH="380px" overflowY="auto" spacing={2} pr={1}>
                        {faqList.map((item, idx) => {
                          const isActive = idx === activeFaqIndex;
                          const hasError =
                            !item.standardQuestion.trim() || !item.conciseAnswer.trim();
                          return (
                            <Flex
                              key={item.id}
                              p={2.5}
                              borderRadius="md"
                              cursor="pointer"
                              bg={isActive ? 'purple.50' : 'myGray.50'}
                              borderWidth="1px"
                              borderColor={isActive ? 'purple.400' : 'transparent'}
                              align="center"
                              justify="space-between"
                              onClick={() => setActiveFaqIndex(idx)}
                              _hover={{ bg: isActive ? 'purple.50' : 'myGray.100' }}
                            >
                              <Box minW={0} flex="1">
                                <Text
                                  fontSize="xs"
                                  fontWeight="600"
                                  noOfLines={1}
                                  color={isActive ? 'purple.700' : 'myGray.800'}
                                >
                                  {item.standardQuestion || `(未填写问题 ${idx + 1})`}
                                </Text>
                                <Text fontSize="10px" color="myGray.500" noOfLines={1}>
                                  {item.similarQuestions.length} 个相似问 ·{' '}
                                  {item.categoryTag || '通用'}
                                </Text>
                              </Box>
                              {hasError && (
                                <Badge colorScheme="red" size="xs" ml={1}>
                                  未全
                                </Badge>
                              )}
                            </Flex>
                          );
                        })}
                      </Stack>
                    </Box>

                    {/* Right FAQ Detail Editor */}
                    <Box
                      flex="1"
                      borderWidth="1px"
                      borderColor="myGray.200"
                      borderRadius="lg"
                      p={4}
                      bg="white"
                    >
                      {currentFaq ? (
                        <Stack spacing={4}>
                          <Flex justify="space-between" align="center">
                            <Heading size="xs" color="myGray.700">
                              正在编辑第 {activeFaqIndex + 1} 项 FAQ
                            </Heading>
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              onClick={() => handleRemoveFaq(activeFaqIndex)}
                            >
                              删除此条
                            </Button>
                          </Flex>

                          <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                            <FormControl isRequired gridColumn={{ md: 'span 2' }}>
                              <FormLabel fontSize="xs">标准问 (Standard Question)</FormLabel>
                              <Input
                                size="sm"
                                value={currentFaq.standardQuestion}
                                onChange={(e) =>
                                  updateCurrentFaq('standardQuestion', e.target.value)
                                }
                                placeholder="输入规范的标准用户问法"
                              />
                            </FormControl>
                            <FormControl>
                              <FormLabel fontSize="xs">分类标签</FormLabel>
                              <Input
                                size="sm"
                                value={currentFaq.categoryTag || ''}
                                onChange={(e) => updateCurrentFaq('categoryTag', e.target.value)}
                                placeholder="例如：出货退款、耗材更换"
                              />
                            </FormControl>
                          </SimpleGrid>

                          {/* Similar Questions Tag Manager */}
                          <Box p={3} bg="purple.50" borderRadius="md">
                            <FormLabel fontSize="xs" color="purple.900" mb={1}>
                              多相似问扩展 (Similar Question Tags / Synonyms)
                            </FormLabel>
                            <Text fontSize="10px" color="myGray.600" mb={2}>
                              添加用户可能提问的口语化同义句，增强 RAG 语义检索召回率。
                            </Text>

                            <Flex wrap="wrap" gap={2} mb={2}>
                              {currentFaq.similarQuestions.map((tag, tIdx) => (
                                <Tag key={tIdx} size="sm" colorScheme="purple" borderRadius="full">
                                  <TagLabel>{tag}</TagLabel>
                                  <TagCloseButton
                                    onClick={() => handleRemoveSimilarQuestion(tIdx)}
                                  />
                                </Tag>
                              ))}
                              {currentFaq.similarQuestions.length === 0 && (
                                <Text fontSize="xs" color="myGray.400">
                                  暂无相似问，可在下方输入添加
                                </Text>
                              )}
                            </Flex>

                            <HStack>
                              <Input
                                size="sm"
                                bg="white"
                                placeholder="输入口语相似问法，按回车或点击添加"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSimilarQuestion()}
                              />
                              <Button
                                size="sm"
                                colorScheme="purple"
                                onClick={handleAddSimilarQuestion}
                              >
                                添加
                              </Button>
                            </HStack>
                          </Box>

                          {/* Answers */}
                          <FormControl isRequired>
                            <FormLabel fontSize="xs">核心简答 (Concise Answer)</FormLabel>
                            <Textarea
                              size="sm"
                              rows={3}
                              value={currentFaq.conciseAnswer}
                              onChange={(e) => updateCurrentFaq('conciseAnswer', e.target.value)}
                              placeholder="直接、干脆的解答，适合在对话气泡中优先展示"
                            />
                          </FormControl>

                          <FormControl>
                            <FormLabel fontSize="xs">
                              详细说明 / 深度排查 (Detailed Answer)
                            </FormLabel>
                            <Textarea
                              size="sm"
                              rows={3}
                              value={currentFaq.detailedAnswer}
                              onChange={(e) => updateCurrentFaq('detailedAnswer', e.target.value)}
                              placeholder="可选补充详细步骤、背后的原理或操作指引（支持 Markdown）"
                            />
                          </FormControl>
                        </Stack>
                      ) : null}
                    </Box>
                  </Flex>
                </Stack>
              </TabPanel>

              {/* Tab 2: Quick text batch importer */}
              <TabPanel px={0} py={2}>
                <Stack spacing={4}>
                  <Box
                    p={4}
                    bg="purple.50"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="purple.200"
                  >
                    <Heading size="xs" color="purple.900" mb={1}>
                      批量文本解析器格式说明
                    </Heading>
                    <Text fontSize="xs" color="myGray.600">
                      每个问答块之间用空行隔开，支持以下格式：
                    </Text>
                    <Box
                      mt={2}
                      p={2}
                      bg="white"
                      borderRadius="md"
                      fontSize="xs"
                      fontFamily="monospace"
                    >
                      Q: 售货机扣费未掉货怎么退款？
                      <br />
                      相似问: 没出货怎么退钱，扣款了但东西没出来
                      <br />
                      A: 机器传感器检测到未掉货会自动原路退款，如3分钟未到账请联系人工客服。
                    </Box>
                  </Box>

                  <FormControl>
                    <FormLabel fontSize="sm">粘贴问答文本</FormLabel>
                    <Textarea
                      rows={12}
                      fontFamily="monospace"
                      fontSize="xs"
                      value={quickPasteText}
                      onChange={(e) => setQuickPasteText(e.target.value)}
                      placeholder="在此粘贴问答文本..."
                    />
                  </FormControl>

                  <Button colorScheme="purple" alignSelf="start" onClick={handleParseQuickText}>
                    解析并追加到问答列表
                  </Button>
                </Stack>
              </TabPanel>

              {/* Tab 3: Markdown Preview */}
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
            colorScheme="purple"
            isLoading={submitting}
            isDisabled={!dataset}
            onClick={handleSubmit}
          >
            批量生成并登记 FAQ ({faqList.length}条)
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FaqBatchEditor;
