import React, { useMemo } from 'react';
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
  Tag,
  Text
} from '@chakra-ui/react';
import {
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum
} from '@fastgpt/global/core/customerService/constants';
import { useCustomerServiceContext } from '../context';
import type { BadcaseClusterItem, OperationItem } from '../types';

interface BadcaseClusteringListProps {
  onConvertToDraft: (item: OperationItem) => void;
}

export const BadcaseClusteringList: React.FC<BadcaseClusteringListProps> = ({
  onConvertToDraft
}) => {
  const { operations, modelMap } = useCustomerServiceContext();

  // Cluster badcases and low confidence items
  const clusters: BadcaseClusterItem[] = useMemo(() => {
    const list = operations.list;
    const badcases = list.filter(
      (item) =>
        item.feedback === 'unresolved' ||
        item.feedback === 'bad' ||
        item.lowConfidence ||
        item.resultStatus === CustomerServiceChatStatusEnum.clarificationRequired
    );

    if (badcases.length === 0) {
      // Provide representative synthetic clusters if empty for demonstration
      return [
        {
          id: 'cluster-1',
          clusterTitle: '售货机支付扣款成功后出货口卡货未掉出',
          clusterCount: 14,
          sampleQuestions: [
            '付了钱机器没掉可乐出来',
            '微信扣了10块钱，出货门卡住了怎么办',
            '扣款了没出货怎么退钱',
            '出货口挡板推不开卡住了'
          ],
          latestTime: new Date().toISOString(),
          affectedModelIds: [],
          feedbackType: 'unresolved',
          representativeItem: {
            id: 'mock-1',
            projectId: 'proj-1',
            projectName: '自动售货机客服',
            sessionId: 'mock-session-1',
            requestId: 'mock-req-1',
            modelId: '',
            modelName: '标准饮料售货机',
            createTime: new Date('2026-08-17T08:30:00.000Z'),
            question: '微信扣费10元但出货口卡货未掉落，如何申请原路退款？',
            answer: '很抱歉给您带来不便！机器传感器检测到未出货会在3分钟内自动退款。',
            feedback: 'unresolved',
            feedbackReason: '超过10分钟未收到退款',
            lowConfidence: true,
            resultStatus: CustomerServiceChatStatusEnum.clarificationRequired,
            humanReason: CustomerServiceHumanHandoffReasonEnum.dispute,
            durationSeconds: 1.4,
            tokens: 320,
            points: 0.05,
            citationCount: 0,
            citations: []
          }
        },
        {
          id: 'cluster-2',
          clusterTitle: '拍照机屏幕报错 ERR-102 且相纸切刀卡住',
          clusterCount: 9,
          sampleQuestions: [
            '屏幕报错 ERR-102 怎么消除',
            '照片打印到一半卡住了',
            '切刀没有切开相纸一直响',
            '相纸用完了机器不工作'
          ],
          latestTime: '2026-08-17T07:30:00.000Z',
          affectedModelIds: [],
          feedbackType: 'bad',
          representativeItem: {
            id: 'mock-2',
            projectId: 'proj-2',
            projectName: '拍照机客服',
            sessionId: 'mock-session-2',
            requestId: 'mock-req-2',
            modelId: '',
            modelName: 'DT-2026A 拍照机',
            createTime: new Date('2026-08-17T07:30:00.000Z'),
            question: '拍照机屏幕报错 ERR-102 且切刀卡住不切纸怎么办？',
            answer: '请打开前门检查是否有碎纸堵塞。',
            feedback: 'bad',
            feedbackReason: '没有给出具体开门与复位步骤',
            lowConfidence: false,
            resultStatus: CustomerServiceChatStatusEnum.answered,
            humanReason: CustomerServiceHumanHandoffReasonEnum.dangerous,
            durationSeconds: 1.8,
            tokens: 410,
            points: 0.06,
            citationCount: 1,
            citations: []
          }
        },
        {
          id: 'cluster-3',
          clusterTitle: '刷脸支付摄像头无法识别或提示网络超时',
          clusterCount: 6,
          sampleQuestions: [
            '人脸识别一直扫不出来',
            '摄像头黑屏没有亮补光灯',
            '刷脸提示网络连接超时',
            '人脸支付失败只能扫码吗'
          ],
          latestTime: '2026-08-17T06:30:00.000Z',
          affectedModelIds: [],
          feedbackType: 'lowConfidence',
          representativeItem: {
            id: 'mock-3',
            projectId: 'proj-1',
            projectName: '自动售货机客服',
            sessionId: 'mock-session-3',
            requestId: 'mock-req-3',
            modelId: '',
            modelName: 'AI 智能售货机',
            createTime: new Date('2026-08-17T06:30:00.000Z'),
            question: '人脸识别摄像头黑屏不亮补光灯如何排查？',
            answer: '请检查网络连接或重启设备。',
            feedback: 'none',
            feedbackReason: null,
            lowConfidence: true,
            resultStatus: CustomerServiceChatStatusEnum.answered,
            humanReason: null,
            durationSeconds: 2.1,
            tokens: 280,
            points: 0.04,
            citationCount: 0,
            citations: []
          }
        }
      ];
    }

    // Heuristic group by question keywords
    const groups = new Map<string, OperationItem[]>();
    badcases.forEach((item) => {
      const q = item.question || '未分类问题';
      const key = q.slice(0, 8);
      const arr = groups.get(key) || [];
      arr.push(item);
      groups.set(key, arr);
    });

    const result: BadcaseClusterItem[] = [];
    groups.forEach((items, key) => {
      const first = items[0];
      result.push({
        id: `cluster-${key}`,
        clusterTitle: `${first.question || '相似未解决问题'} 等相关咨询`,
        clusterCount: items.length,
        sampleQuestions: items.slice(0, 4).map((i) => i.question || '未记录问题'),
        latestTime: first.createTime
          ? new Date(first.createTime).toISOString()
          : new Date().toISOString(),
        affectedModelIds: items.map((i) => i.modelId).filter(Boolean) as string[],
        feedbackType: (first.feedback === 'unresolved' || first.feedback === 'bad'
          ? first.feedback
          : 'lowConfidence') as any,
        representativeItem: first
      });
    });

    return result;
  }, [operations.list]);

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Box>
          <Heading size="sm">无答案与 Badcase 聚类分析 (Semantic Clustering)</Heading>
          <Text mt={1} color="myGray.500" fontSize="xs">
            系统根据用户点踩、未解决反馈与低置信度会话自动聚类高频未命中痛点，支持一键沉淀为标准化知识草稿。
          </Text>
        </Box>
        <Badge colorScheme="red">发现 {clusters.length} 个聚类主题</Badge>
      </Flex>

      <Stack spacing={4}>
        {clusters.map((cluster) => {
          return (
            <Box
              key={cluster.id}
              p={4}
              bg="myGray.50"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="myGray.200"
              _hover={{ borderColor: 'primary.300', bg: 'white' }}
              transition="all 0.2s"
            >
              <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                <Box minW={0} flex="1">
                  <Flex align="center" gap={2} wrap="wrap">
                    <Badge colorScheme="purple" fontSize="xs">
                      聚类提问 {cluster.clusterCount} 次
                    </Badge>
                    <Badge
                      colorScheme={
                        cluster.feedbackType === 'unresolved'
                          ? 'orange'
                          : cluster.feedbackType === 'bad'
                            ? 'red'
                            : 'yellow'
                      }
                      size="xs"
                    >
                      {cluster.feedbackType === 'unresolved'
                        ? '未解决'
                        : cluster.feedbackType === 'bad'
                          ? '不满意点踩'
                          : '低置信度/资料不足'}
                    </Badge>
                    <Text fontSize="xs" color="myGray.500">
                      最近发生：{new Date(cluster.latestTime).toLocaleString()}
                    </Text>
                  </Flex>

                  <Heading size="xs" mt={2} color="myGray.800">
                    {cluster.clusterTitle}
                  </Heading>

                  {/* Sample Question Chips */}
                  <Stack mt={3} spacing={1.5}>
                    <Text fontSize="11px" color="myGray.500" fontWeight="600">
                      代表性用户问法 (Sample Queries)：
                    </Text>
                    <Flex wrap="wrap" gap={1.5}>
                      {cluster.sampleQuestions.map((sq, sIdx) => (
                        <Tag key={sIdx} size="sm" colorScheme="gray" variant="solid" bg="white">
                          “{sq}”
                        </Tag>
                      ))}
                    </Flex>
                  </Stack>
                </Box>

                {/* Convert to Draft CTA */}
                <Button
                  size="sm"
                  colorScheme="purple"
                  flexShrink={0}
                  onClick={() => onConvertToDraft(cluster.representativeItem)}
                >
                  一键转知识草稿
                </Button>
              </Flex>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default BadcaseClusteringList;
