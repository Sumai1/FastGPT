import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Input,
  Progress,
  Stack,
  Text,
  Textarea
} from '@chakra-ui/react';
import type { KnowledgeItem } from '../types';
import Markdown from '@/components/Markdown';

interface InlineTestSandboxProps {
  knowledge: KnowledgeItem;
}

export const InlineTestSandbox: React.FC<InlineTestSandboxProps> = ({ knowledge }) => {
  const [testQuery, setTestQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    similarityScore: number;
    matchedChunk: string;
    generatedAnswer: string;
  } | null>(null);

  const presetQuestions = [
    `如何处理${knowledge.title.slice(0, 10)}？`,
    '出现故障怎么排查？',
    '这个型号的功率和尺寸是多少？',
    '什么时候需要联系人工售后？'
  ];

  const runSimulation = (query: string) => {
    const q = query.trim() || testQuery.trim();
    if (!q) return;
    setTesting(true);

    // Simulate RAG Retrieval Score and answer generation
    setTimeout(() => {
      // Calculate a heuristic similarity score
      const titleOverlap = knowledge.title.split('').filter((c) => q.includes(c)).length;
      const score = Math.min(0.96, Math.max(0.72, 0.75 + (titleOverlap / 20) * 0.2));

      setTestResult({
        similarityScore: score,
        matchedChunk: `【检索命中切片 · 来源：${knowledge.title}】\n- 知识类型：${knowledge.knowledgeType}\n- 关键内容：关于 ${q} 的标准处置规范，请首先确认设备电源与指示灯状态，按照 SOP 步骤执行。`,
        generatedAnswer: `您好！针对您咨询的 **“${q}”**：\n\n根据《${knowledge.title}》最新规程：\n1. **初步核验**：请确认设备处于就绪模式，电源指示灯常亮；\n2. **标准步骤**：按对应指引进行排查，切勿带电强行拆卸；\n3. **转人工提示**：若重试 2 次仍异常，请点击转人工客服由工程师协助。`
      });
      setTesting(false);
    }, 450);
  };

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="sm">在线检索问答试问沙盒 (Inline Test Sandbox)</Heading>
        <Badge colorScheme="blue" variant="subtle">
          DeepSeek + RAG 模拟
        </Badge>
      </Flex>
      <Text fontSize="xs" color="myGray.500" mb={4}>
        在审核页面输入测试问法，实时检验当前知识在 RAG 知识检索中的召回匹配分与智能客服回答效果。
      </Text>

      {/* Preset Question Pills */}
      <Flex wrap="wrap" gap={2} mb={3}>
        {presetQuestions.map((pq, idx) => (
          <Button
            key={idx}
            size="xs"
            variant="outline"
            colorScheme="blue"
            onClick={() => {
              setTestQuery(pq);
              runSimulation(pq);
            }}
          >
            {pq}
          </Button>
        ))}
      </Flex>

      {/* Query Input Box */}
      <HStack mb={4}>
        <Input
          size="sm"
          value={testQuery}
          onChange={(e) => setTestQuery(e.target.value)}
          placeholder="输入试问问题（例如：机器卡纸了怎么清理？）"
          onKeyDown={(e) => e.key === 'Enter' && runSimulation(testQuery)}
        />
        <Button
          size="sm"
          colorScheme="blue"
          isLoading={testing}
          onClick={() => runSimulation(testQuery)}
        >
          立即试问
        </Button>
      </HStack>

      {/* Test Result Sandbox Output */}
      {testResult && (
        <Stack
          spacing={3}
          p={4}
          bg="myGray.50"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="myGray.200"
        >
          {/* Retrieval Match Score Bar */}
          <Box>
            <Flex justify="space-between" align="center" mb={1}>
              <Text fontSize="xs" fontWeight="600" color="myGray.700">
                语义召回匹配度 (Similarity Score)
              </Text>
              <Badge colorScheme={testResult.similarityScore >= 0.85 ? 'green' : 'orange'}>
                {(testResult.similarityScore * 100).toFixed(1)}% (
                {testResult.similarityScore >= 0.85 ? '高置信度召回' : '中置信度'})
              </Badge>
            </Flex>
            <Progress
              value={testResult.similarityScore * 100}
              colorScheme={testResult.similarityScore >= 0.85 ? 'green' : 'orange'}
              size="xs"
              borderRadius="full"
            />
          </Box>

          {/* Matched Chunk Highlight */}
          <Box
            p={2.5}
            bg="white"
            borderRadius="md"
            borderWidth="1px"
            borderColor="myGray.200"
            fontSize="xs"
          >
            <Text color="myGray.500" fontWeight="600" mb={1}>
              命中知识切片引用预览：
            </Text>
            <Text whiteSpace="pre-wrap" color="myGray.700" fontFamily="monospace">
              {testResult.matchedChunk}
            </Text>
          </Box>

          {/* Generated Answer */}
          <Box p={3} bg="white" borderRadius="md" borderWidth="1px" borderColor="myGray.200">
            <Text fontSize="xs" color="myGray.500" fontWeight="600" mb={2}>
              模拟生成客服回答：
            </Text>
            <Markdown source={testResult.generatedAnswer} />
          </Box>
        </Stack>
      )}
    </Box>
  );
};

export default InlineTestSandbox;
