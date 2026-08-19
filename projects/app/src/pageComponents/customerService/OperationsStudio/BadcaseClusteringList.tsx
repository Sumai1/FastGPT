import React, { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Stack,
  Tag,
  Text
} from '@chakra-ui/react';
import {
  CustomerServiceChatStatusEnum,
  CustomerServiceHumanHandoffReasonEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceAdminOperationClusterItem,
  CustomerServiceAdminOperationClustersResponse
} from '@fastgpt/global/openapi/customerService/api';
import { useCustomerServiceContext, requestAdminApi } from '../context';
import type { BadcaseClusterItem, OperationItem } from '../types';

interface BadcaseClusteringListProps {
  onConvertToDraft: (item: OperationItem) => void;
}

export const BadcaseClusteringList: React.FC<BadcaseClusteringListProps> = ({
  onConvertToDraft
}) => {
  const { operations } = useCustomerServiceContext();
  const [loading, setLoading] = useState(false);
  const [serverClusters, setServerClusters] =
    useState<CustomerServiceAdminOperationClustersResponse | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const fetchClusters = async () => {
      setLoading(true);
      try {
        const res = await requestAdminApi<CustomerServiceAdminOperationClustersResponse>({
          url: '/api/customer-service/admin/operation/clusters'
        });
        if (isSubscribed) setServerClusters(res);
      } catch {
        // Fallback to client mock clusters
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchClusters();
    return () => {
      isSubscribed = false;
    };
  }, []);

  const clusters: BadcaseClusterItem[] =
    serverClusters?.clusters && serverClusters.clusters.length > 0
      ? serverClusters.clusters.map((c: CustomerServiceAdminOperationClusterItem) => ({
          id: c.id,
          clusterTitle: c.clusterTitle,
          clusterCount: c.clusterCount,
          sampleQuestions: c.sampleQuestions,
          latestTime:
            typeof c.latestTime === 'string' ? c.latestTime : new Date(c.latestTime).toISOString(),
          affectedModelIds: c.affectedModelIds,
          feedbackType: c.feedbackType as 'unresolved' | 'bad' | 'lowConfidence',
          representativeItem: {
            id: c.representativeItem.id,
            projectId: c.representativeItem.projectId,
            projectName: c.representativeItem.projectName,
            sessionId: c.representativeItem.sessionId,
            requestId: c.representativeItem.requestId,
            modelId: c.representativeItem.modelId,
            modelName: c.representativeItem.modelName,
            createTime: new Date(c.representativeItem.createTime),
            question: c.representativeItem.question,
            answer: c.representativeItem.answer,
            feedback: c.representativeItem.feedback,
            lowConfidence: c.representativeItem.lowConfidence,
            resultStatus: c.representativeItem.resultStatus,
            humanReason: c.representativeItem.humanReason,
            durationSeconds: c.representativeItem.durationSeconds,
            tokens: c.representativeItem.tokens,
            points: c.representativeItem.points,
            citationCount: c.representativeItem.citationCount,
            citations: c.representativeItem.citations
          }
        }))
      : [
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
              modelName: '标准饮料售货机',
              createTime: new Date('2026-08-17T06:30:00.000Z'),
              question: '人脸识别摄像头黑屏未亮起，如何改用手机扫码支付？',
              answer: '请检查网络连接或重启设备。',
              feedback: 'none',
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

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
      <Flex justify="space-between" align="center" mb={4} wrap="wrap" gap={2}>
        <Box>
          <Heading size="sm">无答案与 Badcase 聚类分析 (Semantic Clustering)</Heading>
          <Text mt={1} color="myGray.500" fontSize="xs">
            系统根据用户点踩、未解决反馈与低置信度会话自动聚类高频未命中痛点，支持一键沉淀为标准化知识草稿。
          </Text>
        </Box>
        <Flex align="center" gap={2}>
          {loading && <Spinner size="xs" color="primary.500" />}
          <Badge colorScheme="red">发现 {clusters.length} 个聚类主题</Badge>
        </Flex>
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
