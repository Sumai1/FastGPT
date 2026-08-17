import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Divider,
  Flex,
  Heading,
  HStack,
  Radio,
  RadioGroup,
  SimpleGrid,
  Stack,
  Text
} from '@chakra-ui/react';
import type { KnowledgeItem } from '../types';
import { audienceMap, knowledgeTypeMap } from '../context';

interface KnowledgeDiffViewerProps {
  currentKnowledge: KnowledgeItem;
  previousContent?: string;
  newContent?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

function computeSimpleDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx < oldLines.length && newIdx < newLines.length) {
      if (oldLines[oldIdx] === newLines[newIdx]) {
        result.push({
          type: 'unchanged',
          oldLineNumber: oldIdx + 1,
          newLineNumber: newIdx + 1,
          text: oldLines[oldIdx]
        });
        oldIdx++;
        newIdx++;
      } else {
        // Simple lookahead
        result.push({
          type: 'removed',
          oldLineNumber: oldIdx + 1,
          text: oldLines[oldIdx]
        });
        oldIdx++;
        if (newIdx < newLines.length) {
          result.push({
            type: 'added',
            newLineNumber: newIdx + 1,
            text: newLines[newIdx]
          });
          newIdx++;
        }
      }
    } else if (oldIdx < oldLines.length) {
      result.push({
        type: 'removed',
        oldLineNumber: oldIdx + 1,
        text: oldLines[oldIdx]
      });
      oldIdx++;
    } else if (newIdx < newLines.length) {
      result.push({
        type: 'added',
        newLineNumber: newIdx + 1,
        text: newLines[newIdx]
      });
      newIdx++;
    }
  }

  return result;
}

export const KnowledgeDiffViewer: React.FC<KnowledgeDiffViewerProps> = ({
  currentKnowledge,
  previousContent,
  newContent
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  // Simulated content if not supplied
  const effectiveOldText = useMemo(() => {
    if (previousContent !== undefined) return previousContent;
    return `# ${currentKnowledge.title} (旧版本 V${Math.max(1, currentKnowledge.version - 1)})
> 资料类型：${knowledgeTypeMap[currentKnowledge.knowledgeType]}
> 适用受众：${audienceMap[currentKnowledge.audienceLevel]}

## 1. 基础说明
- 原有基础参数及操作说明。
- 注意事项：常规检查电源与接口。
`;
  }, [currentKnowledge, previousContent]);

  const effectiveNewText = useMemo(() => {
    if (newContent !== undefined) return newContent;
    return `# ${currentKnowledge.title} (待审版本 V${currentKnowledge.version})
> 资料类型：${knowledgeTypeMap[currentKnowledge.knowledgeType]}
> 适用受众：${audienceMap[currentKnowledge.audienceLevel]}

## 1. 基础说明与升级规范
- 新增：升级后的高精度传感器参数校验。
- 新增：全流程防呆卡纸排查步骤 1、2、3。
- ⚠️ 强安全警告：高压 220V 电源盒严禁非专业人员拆卸！
`;
  }, [currentKnowledge, newContent]);

  const diffLines = useMemo(
    () => computeSimpleDiff(effectiveOldText, effectiveNewText),
    [effectiveOldText, effectiveNewText]
  );

  const additionsCount = diffLines.filter((l) => l.type === 'added').length;
  const deletionsCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
      {/* Header with Mode switcher & metrics */}
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={3}>
        <HStack spacing={3}>
          <Heading size="sm">新旧版本 Diff 对比</Heading>
          <HStack spacing={2}>
            <Badge colorScheme="green" variant="subtle">
              + {additionsCount} 行新增
            </Badge>
            <Badge colorScheme="red" variant="subtle">
              - {deletionsCount} 行删除
            </Badge>
          </HStack>
        </HStack>

        <RadioGroup value={viewMode} onChange={(v: any) => setViewMode(v)}>
          <HStack spacing={4}>
            <Radio value="split" size="sm">
              <Text fontSize="xs">双栏对比 (Side-by-Side)</Text>
            </Radio>
            <Radio value="unified" size="sm">
              <Text fontSize="xs">单栏合并 (Unified)</Text>
            </Radio>
          </HStack>
        </RadioGroup>
      </Flex>

      {/* Metadata Diff Pill */}
      <Box p={3} bg="myGray.50" borderRadius="lg" mb={4} fontSize="xs">
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={2}>
          <Box>
            <Text color="myGray.500">知识版本</Text>
            <Text fontWeight="600">
              V{Math.max(1, currentKnowledge.version - 1)} ➔ V{currentKnowledge.version}
            </Text>
          </Box>
          <Box>
            <Text color="myGray.500">知识类型</Text>
            <Text fontWeight="600">{knowledgeTypeMap[currentKnowledge.knowledgeType]}</Text>
          </Box>
          <Box>
            <Text color="myGray.500">最高受众</Text>
            <Badge colorScheme="purple">{audienceMap[currentKnowledge.audienceLevel]}</Badge>
          </Box>
          <Box>
            <Text color="myGray.500">适用产品数</Text>
            <Text fontWeight="600">
              {currentKnowledge.modelIds.length > 0
                ? `${currentKnowledge.modelIds.length} 款型号`
                : '通用全部'}
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* Diff Content Viewer */}
      {viewMode === 'split' ? (
        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={2} fontFamily="monospace" fontSize="xs">
          {/* Left: Old Version */}
          <Box borderWidth="1px" borderColor="myGray.200" borderRadius="md" overflow="hidden">
            <Box bg="myGray.100" px={3} py={1.5} fontWeight="600" color="myGray.600">
              旧版本 (V{Math.max(1, currentKnowledge.version - 1)})
            </Box>
            <Box maxH="380px" overflowY="auto" p={2} bg="white">
              {effectiveOldText.split('\n').map((line, idx) => (
                <Flex key={idx} py={0.5} px={1} _hover={{ bg: 'myGray.50' }}>
                  <Text w="30px" color="myGray.400" userSelect="none" flexShrink={0}>
                    {idx + 1}
                  </Text>
                  <Text whiteSpace="pre-wrap" wordBreak="break-all">
                    {line || ' '}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Box>

          {/* Right: New Version */}
          <Box borderWidth="1px" borderColor="green.200" borderRadius="md" overflow="hidden">
            <Box bg="green.50" px={3} py={1.5} fontWeight="600" color="green.700">
              待审新版本 (V{currentKnowledge.version})
            </Box>
            <Box maxH="380px" overflowY="auto" p={2} bg="white">
              {effectiveNewText.split('\n').map((line, idx) => (
                <Flex
                  key={idx}
                  py={0.5}
                  px={1}
                  bg={line.startsWith('- 新增') || line.includes('⚠️') ? 'green.50' : 'transparent'}
                >
                  <Text w="30px" color="green.600" userSelect="none" flexShrink={0}>
                    {idx + 1}
                  </Text>
                  <Text whiteSpace="pre-wrap" wordBreak="break-all" color="myGray.800">
                    {line || ' '}
                  </Text>
                </Flex>
              ))}
            </Box>
          </Box>
        </SimpleGrid>
      ) : (
        /* Unified View */
        <Box
          borderWidth="1px"
          borderColor="myGray.200"
          borderRadius="md"
          maxH="400px"
          overflowY="auto"
          fontFamily="monospace"
          fontSize="xs"
          bg="white"
        >
          {diffLines.map((line, idx) => (
            <Flex
              key={idx}
              px={2}
              py={0.5}
              bg={
                line.type === 'added'
                  ? 'green.50'
                  : line.type === 'removed'
                    ? 'red.50'
                    : 'transparent'
              }
              color={
                line.type === 'added'
                  ? 'green.800'
                  : line.type === 'removed'
                    ? 'red.800'
                    : 'myGray.800'
              }
              borderLeftWidth={line.type !== 'unchanged' ? '3px' : '0px'}
              borderLeftColor={line.type === 'added' ? 'green.500' : 'red.500'}
            >
              <Text w="35px" color="myGray.400" userSelect="none" flexShrink={0}>
                {line.type === 'added'
                  ? `+${line.newLineNumber}`
                  : line.type === 'removed'
                    ? `-${line.oldLineNumber}`
                    : line.newLineNumber}
              </Text>
              <Text whiteSpace="pre-wrap" wordBreak="break-all">
                {line.text || ' '}
              </Text>
            </Flex>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default KnowledgeDiffViewer;
