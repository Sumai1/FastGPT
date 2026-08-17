import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
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
  Spinner,
  Stack,
  Text,
  Textarea,
  useDisclosure,
  useToast
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import MyIcon from '@fastgpt/web/components/common/Icon';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceMemberRoleEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceAdminKnowledgeCreateBody,
  CustomerServiceAdminFrequentQuestionListResponse,
  CustomerServiceAdminHealthResponse,
  CustomerServiceAdminKnowledgeListResponse,
  CustomerServiceAdminManagedProjectCreateResponse,
  CustomerServiceAdminMeResponse,
  CustomerServiceAdminOperationItemSchema,
  CustomerServiceAdminOperationListResponse,
  CustomerServiceAdminProductCreateBody,
  CustomerServiceAdminProductListResponse,
  CustomerServiceAdminProjectListResponse,
  CustomerServiceAdminRoleMemberListResponse,
  CustomerServiceAdminRoleListResponse,
  CustomerServiceAdminUnregisteredKnowledgeListResponse
} from '@fastgpt/global/openapi/customerService/api';
import type { z } from 'zod';
import KnowledgeCreateModal from '@/pageComponents/customerService/KnowledgeCreateModal';
import ProductCreateModal from '@/pageComponents/customerService/ProductCreateModal';
import { DatasetResourceSelect } from '@/pageComponents/customerService/ResourceSelectors';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';

type ConsoleSection =
  | 'overview'
  | 'assistants'
  | 'knowledge'
  | 'products'
  | 'operations'
  | 'review'
  | 'settings';
type OperationItem = z.infer<typeof CustomerServiceAdminOperationItemSchema>;
type KnowledgeDraftSource = Pick<OperationItem, 'id' | 'question' | 'answer' | 'modelId'>;
type UnregisteredKnowledge = CustomerServiceAdminUnregisteredKnowledgeListResponse[number];
type AdminResponse<T> = { code: number; message?: string; data: T };

const emptyCatalog: CustomerServiceAdminProductListResponse = {
  categories: [],
  series: [],
  models: [],
  versions: []
};
const emptyProjects: CustomerServiceAdminProjectListResponse = {
  projects: [],
  keyBindings: []
};

const sectionConfig: Array<{
  key: ConsoleSection;
  label: string;
  description: string;
  icon: Parameters<typeof MyIcon>[0]['name'];
}> = [
  { key: 'overview', label: '工作台', description: '运行状态与待办', icon: 'common/overviewLight' },
  {
    key: 'assistants',
    label: '客服管理',
    description: '创建、测试与发布',
    icon: 'core/chat/chatLight'
  },
  {
    key: 'knowledge',
    label: '知识中心',
    description: '资料状态与发布',
    icon: 'core/dataset/datasetLight'
  },
  {
    key: 'products',
    label: '产品管理',
    description: '型号、版本与资料',
    icon: 'common/list'
  },
  {
    key: 'operations',
    label: '对话运营',
    description: '反馈、引用与未解决问题',
    icon: 'core/app/logsLight'
  },
  {
    key: 'review',
    label: '审核中心',
    description: '待审核知识',
    icon: 'common/check'
  },
  {
    key: 'settings',
    label: '系统设置',
    description: '成员与高级功能',
    icon: 'support/config/configLight'
  }
];

const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '运行中', color: 'green' },
  inactive: { label: '已停用', color: 'gray' },
  discontinued: { label: '已停产', color: 'orange' },
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待审核', color: 'orange' },
  rejected: { label: '已驳回', color: 'red' },
  published: { label: '已发布', color: 'green' },
  offline: { label: '已下架', color: 'gray' }
};
const knowledgeTypeMap: Record<CustomerServiceKnowledgeTypeEnum, string> = {
  [CustomerServiceKnowledgeTypeEnum.productMaster]: '产品主档',
  [CustomerServiceKnowledgeTypeEnum.productParameter]: '产品参数',
  [CustomerServiceKnowledgeTypeEnum.manual]: '操作说明',
  [CustomerServiceKnowledgeTypeEnum.faq]: '常见问题',
  [CustomerServiceKnowledgeTypeEnum.fault]: '故障处理',
  [CustomerServiceKnowledgeTypeEnum.errorCode]: '错误码',
  [CustomerServiceKnowledgeTypeEnum.consumable]: '耗材说明',
  [CustomerServiceKnowledgeTypeEnum.safety]: '安全说明',
  [CustomerServiceKnowledgeTypeEnum.policy]: '服务政策',
  [CustomerServiceKnowledgeTypeEnum.serviceScript]: '服务话术',
  [CustomerServiceKnowledgeTypeEnum.internalRepair]: '内部维修',
  [CustomerServiceKnowledgeTypeEnum.other]: '其他资料'
};
const audienceMap: Record<CustomerServiceAudienceEnum, string> = {
  [CustomerServiceAudienceEnum.public]: '普通客户',
  [CustomerServiceAudienceEnum.dealer]: '经销商',
  [CustomerServiceAudienceEnum.internal]: '内部售后'
};
const memberRoleMap: Record<CustomerServiceMemberRoleEnum, string> = {
  [CustomerServiceMemberRoleEnum.customerServiceAdmin]: '客服管理员',
  [CustomerServiceMemberRoleEnum.knowledgeEditor]: '知识编辑',
  [CustomerServiceMemberRoleEnum.knowledgeReviewer]: '知识审核'
};

/** 调用客服管理接口，并统一解析 FastGPT 响应。 */
const requestAdminApi = async <T,>({
  url,
  method = 'GET',
  body
}: {
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}) => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = (await response.json()) as AdminResponse<T>;
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  return payload.data;
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusMap[status] ?? { label: status, color: 'gray' };
  return <Badge colorScheme={config.color}>{config.label}</Badge>;
};

const MetricCard = ({
  label,
  value,
  help,
  color = 'primary.600'
}: {
  label: string;
  value: number;
  help: string;
  color?: string;
}) => (
  <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
    <Text color="myGray.500" fontSize="sm">
      {label}
    </Text>
    <Text mt={2} fontSize="3xl" lineHeight="1" fontWeight="700" color={color}>
      {value}
    </Text>
    <Text mt={3} color="myGray.500" fontSize="sm">
      {help}
    </Text>
  </Box>
);

const EmptyState = ({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) => (
  <Flex
    minH="220px"
    bg="white"
    borderWidth="1px"
    borderColor="myGray.200"
    borderRadius="xl"
    align="center"
    justify="center"
    direction="column"
    textAlign="center"
    p={8}
  >
    <Heading size="sm">{title}</Heading>
    <Text mt={2} maxW="520px" color="myGray.500">
      {description}
    </Text>
    {action && <Box mt={5}>{action}</Box>}
  </Flex>
);

/**
 * 业务化智能客服控制台。页面只展示业务名称和状态，内部资源 ID 仅用于接口参数和路由跳转。
 */
const CustomerServiceConsolePage = () => {
  const router = useRouter();
  const toast = useToast();
  const createDisclosure = useDisclosure();
  const knowledgeCreateDisclosure = useDisclosure();
  const productCreateDisclosure = useDisclosure();
  const knowledgeDraftDisclosure = useDisclosure();
  const roleDisclosure = useDisclosure();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [currentMember, setCurrentMember] = useState<CustomerServiceAdminMeResponse>();
  const [systemHealth, setSystemHealth] = useState<CustomerServiceAdminHealthResponse>();
  const [knowledge, setKnowledge] = useState<CustomerServiceAdminKnowledgeListResponse>([]);
  const [unregisteredKnowledge, setUnregisteredKnowledge] =
    useState<CustomerServiceAdminUnregisteredKnowledgeListResponse>([]);
  const [recoveringKnowledge, setRecoveringKnowledge] = useState<UnregisteredKnowledge>();
  const [projectData, setProjectData] = useState(emptyProjects);
  const [roles, setRoles] = useState<CustomerServiceAdminRoleListResponse>([]);
  const [roleMembers, setRoleMembers] = useState<CustomerServiceAdminRoleMemberListResponse>([]);
  const [roleTmbId, setRoleTmbId] = useState('');
  const [roleType, setRoleType] = useState(CustomerServiceMemberRoleEnum.knowledgeEditor);
  const [roleReason, setRoleReason] = useState('调整客服日常职责');
  const [todoCounts, setTodoCounts] = useState({ unresolved: 0, noAnswer: 0, human: 0 });
  const [operations, setOperations] = useState<CustomerServiceAdminOperationListResponse>({
    total: 0,
    list: []
  });
  const [frequentQuestions, setFrequentQuestions] =
    useState<CustomerServiceAdminFrequentQuestionListResponse>({ list: [] });
  const [operationLoading, setOperationLoading] = useState(false);
  const [operationPage, setOperationPage] = useState(1);
  const [operationFeedback, setOperationFeedback] = useState('');
  const [operationProjectId, setOperationProjectId] = useState('');
  const [operationSeriesId, setOperationSeriesId] = useState('');
  const [operationModelId, setOperationModelId] = useState('');
  const [operationResultStatus, setOperationResultStatus] = useState('');
  const [operationStartTime, setOperationStartTime] = useState('');
  const [operationEndTime, setOperationEndTime] = useState('');
  const [operationKeyword, setOperationKeyword] = useState('');
  const [draftOperation, setDraftOperation] = useState<KnowledgeDraftSource>();
  const [draftDataset, setDraftDataset] = useState<SelectedDatasetType>();
  const [draftAnswer, setDraftAnswer] = useState('');

  const [wizardStep, setWizardStep] = useState(0);
  const [assistantName, setAssistantName] = useState('');
  const [assistantModelIds, setAssistantModelIds] = useState<string[]>([]);
  const [assistantAudience, setAssistantAudience] = useState(CustomerServiceAudienceEnum.public);
  const [assistantWelcome, setAssistantWelcome] = useState(
    '您好，我是企业产品智能客服。请告诉我产品名称、设备型号和问题现象。'
  );
  const [assistantQuestions, setAssistantQuestions] = useState(
    '这个产品有哪些功能？\n设备报错了怎么排查？\n如何联系人工客服？'
  );
  const [humanName, setHumanName] = useState('人工客服');
  const [humanPhone, setHumanPhone] = useState('');
  const [humanWorkTime, setHumanWorkTime] = useState('');
  const [bindingModelId, setBindingModelId] = useState('');
  const [bindingDataset, setBindingDataset] = useState<SelectedDatasetType>();

  const fetchData = useCallback(async () => {
    const member = await requestAdminApi<CustomerServiceAdminMeResponse>({
      url: '/api/customer-service/admin/me'
    });
    const data = await Promise.all([
      requestAdminApi<CustomerServiceAdminProductListResponse>({
        url: '/api/customer-service/admin/product/list'
      }),
      requestAdminApi<CustomerServiceAdminHealthResponse>({
        url: '/api/customer-service/admin/health'
      }),
      requestAdminApi<CustomerServiceAdminKnowledgeListResponse>({
        url: '/api/customer-service/admin/knowledge/list',
        method: 'POST',
        body: {}
      }),
      requestAdminApi<CustomerServiceAdminProjectListResponse>({
        url: '/api/customer-service/admin/project/list'
      }),
      member.capabilities.manageRoles
        ? requestAdminApi<CustomerServiceAdminRoleListResponse>({
            url: '/api/customer-service/admin/role/list'
          })
        : Promise.resolve([]),
      member.capabilities.editKnowledge
        ? requestAdminApi<CustomerServiceAdminUnregisteredKnowledgeListResponse>({
            url: '/api/customer-service/admin/knowledge/unregistered'
          })
        : Promise.resolve([]),
      requestAdminApi<CustomerServiceAdminOperationListResponse>({
        url: '/api/customer-service/admin/operation/list',
        method: 'POST',
        body: { pageNum: 1, pageSize: 20 }
      }),
      requestAdminApi<CustomerServiceAdminFrequentQuestionListResponse>({
        url: '/api/customer-service/admin/operation/frequentQuestions',
        method: 'POST',
        body: { limit: 10, minimumCount: 2 }
      }),
      Promise.all([
        requestAdminApi<CustomerServiceAdminOperationListResponse>({
          url: '/api/customer-service/admin/operation/list',
          method: 'POST',
          body: { pageNum: 1, pageSize: 1, feedback: 'unresolved' }
        }),
        requestAdminApi<CustomerServiceAdminOperationListResponse>({
          url: '/api/customer-service/admin/operation/list',
          method: 'POST',
          body: {
            pageNum: 1,
            pageSize: 1,
            resultStatus: CustomerServiceChatStatusEnum.clarificationRequired
          }
        }),
        requestAdminApi<CustomerServiceAdminOperationListResponse>({
          url: '/api/customer-service/admin/operation/list',
          method: 'POST',
          body: {
            pageNum: 1,
            pageSize: 1,
            resultStatus: CustomerServiceChatStatusEnum.humanRequired
          }
        })
      ])
    ]);
    return [member, ...data] as const;
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        member,
        nextCatalog,
        nextHealth,
        nextKnowledge,
        nextProjects,
        nextRoles,
        nextUnregistered,
        nextOperations,
        nextFrequentQuestions,
        nextTodos
      ] = await fetchData();
      setCurrentMember(member);
      setCatalog(nextCatalog);
      setSystemHealth(nextHealth);
      setKnowledge(nextKnowledge);
      setProjectData(nextProjects);
      setRoles(nextRoles);
      setUnregisteredKnowledge(nextUnregistered);
      setOperations(nextOperations);
      setFrequentQuestions(nextFrequentQuestions);
      setTodoCounts({
        unresolved: nextTodos[0].total,
        noAnswer: nextTodos[1].total,
        human: nextTodos[2].total
      });
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '控制台数据加载失败'
      });
    } finally {
      setLoading(false);
    }
  }, [fetchData, toast]);

  const loadOperations = useCallback(
    async (pageNum = operationPage) => {
      setOperationLoading(true);
      try {
        const scope = {
          ...(operationProjectId && { projectId: operationProjectId }),
          ...(operationSeriesId && { seriesId: operationSeriesId }),
          ...(operationModelId && { modelId: operationModelId }),
          ...(operationStartTime && { startTime: new Date(operationStartTime).toISOString() }),
          ...(operationEndTime && {
            endTime: new Date(`${operationEndTime}T23:59:59.999`).toISOString()
          })
        };
        const [nextOperations, nextFrequentQuestions] = await Promise.all([
          requestAdminApi<CustomerServiceAdminOperationListResponse>({
            url: '/api/customer-service/admin/operation/list',
            method: 'POST',
            body: {
              pageNum,
              pageSize: 20,
              ...scope,
              ...(operationResultStatus && { resultStatus: operationResultStatus }),
              ...(operationFeedback && { feedback: operationFeedback }),
              ...(operationKeyword.trim() && { keyword: operationKeyword.trim() })
            }
          }),
          requestAdminApi<CustomerServiceAdminFrequentQuestionListResponse>({
            url: '/api/customer-service/admin/operation/frequentQuestions',
            method: 'POST',
            body: { ...scope, limit: 10, minimumCount: 2 }
          })
        ]);
        setOperations(nextOperations);
        setFrequentQuestions(nextFrequentQuestions);
        setOperationPage(pageNum);
      } catch (error) {
        toast({
          status: 'error',
          title: error instanceof Error ? error.message : '对话运营记录加载失败'
        });
      } finally {
        setOperationLoading(false);
      }
    },
    [
      operationEndTime,
      operationFeedback,
      operationKeyword,
      operationModelId,
      operationPage,
      operationProjectId,
      operationResultStatus,
      operationSeriesId,
      operationStartTime,
      toast
    ]
  );

  useEffect(() => {
    let active = true;
    void fetchData()
      .then(
        ([
          member,
          nextCatalog,
          nextHealth,
          nextKnowledge,
          nextProjects,
          nextRoles,
          nextUnregistered,
          nextOperations,
          nextFrequentQuestions,
          nextTodos
        ]) => {
          if (!active) return;
          setCurrentMember(member);
          setCatalog(nextCatalog);
          setSystemHealth(nextHealth);
          setKnowledge(nextKnowledge);
          setProjectData(nextProjects);
          setRoles(nextRoles);
          setUnregisteredKnowledge(nextUnregistered);
          setOperations(nextOperations);
          setFrequentQuestions(nextFrequentQuestions);
          setTodoCounts({
            unresolved: nextTodos[0].total,
            noAnswer: nextTodos[1].total,
            human: nextTodos[2].total
          });
        }
      )
      .catch((error) => {
        toast({
          status: 'error',
          title: error instanceof Error ? error.message : '控制台数据加载失败'
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchData, toast]);

  const visibleSectionConfig = useMemo(
    () =>
      sectionConfig.filter((item) => {
        if (!currentMember) return item.key === 'overview';
        if (item.key === 'assistants' || item.key === 'settings') {
          return currentMember.capabilities.manageProjects;
        }
        if (item.key === 'review') return currentMember.capabilities.reviewKnowledge;
        if (item.key === 'operations') return currentMember.capabilities.viewOperations;
        return true;
      }),
    [currentMember]
  );

  const section = useMemo<ConsoleSection>(() => {
    const value = router.query.section;
    return typeof value === 'string' && visibleSectionConfig.some((item) => item.key === value)
      ? (value as ConsoleSection)
      : 'overview';
  }, [router.query.section, visibleSectionConfig]);

  const modelMap = useMemo(
    () => new Map(catalog.models.map((model) => [model.id, model])),
    [catalog.models]
  );
  const seriesMap = useMemo(
    () => new Map(catalog.series.map((series) => [series.id, series])),
    [catalog.series]
  );
  const categoryMap = useMemo(
    () => new Map(catalog.categories.map((category) => [category.id, category])),
    [catalog.categories]
  );
  const datasetNameMap = useMemo(() => {
    const result = new Map<string, string>();
    knowledge.forEach((item) => {
      if (!result.has(item.datasetId)) result.set(item.datasetId, item.sourceName || item.title);
    });
    return result;
  }, [knowledge]);
  const pendingKnowledge = knowledge.filter(
    (item) => item.status === CustomerServiceKnowledgeStatusEnum.pending
  );
  const publishedKnowledge = knowledge.filter(
    (item) => item.status === CustomerServiceKnowledgeStatusEnum.published
  );
  const trainingErrors = knowledge.filter((item) => item.trainingStatus === 'error');
  const unsyncedProjects = projectData.projects.filter(
    (item) => item.workflowReadiness.status !== 'ready'
  );
  const activeProjects = projectData.projects.filter((item) => item.deliveryReadiness.ready);
  const boundProjectIds = new Set(
    projectData.keyBindings
      .filter((item) => item.status === CustomerServiceResourceStatusEnum.active)
      .map((item) => item.projectId)
  );

  const navigateSection = (nextSection: ConsoleSection) => {
    void router.replace(
      { pathname: '/customer-service/console', query: { section: nextSection } },
      undefined,
      { shallow: true }
    );
  };

  const runAction = async (action: () => Promise<unknown>, successText = '操作成功') => {
    setSaving(true);
    try {
      await action();
      toast({ status: 'success', title: successText });
      await loadData();
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '操作失败'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleModel = (modelId: string) => {
    setAssistantModelIds((current) =>
      current.includes(modelId) ? current.filter((item) => item !== modelId) : [...current, modelId]
    );
  };

  const closeWizard = () => {
    createDisclosure.onClose();
    setWizardStep(0);
    setAssistantName('');
    setAssistantModelIds([]);
  };

  const createAssistant = async () => {
    setSaving(true);
    try {
      await requestAdminApi<CustomerServiceAdminManagedProjectCreateResponse>({
        url: '/api/customer-service/admin/project/createManaged',
        method: 'POST',
        body: {
          name: assistantName,
          modelIds: assistantModelIds,
          defaultAudience: assistantAudience,
          welcomeText: assistantWelcome,
          recommendedQuestions: assistantQuestions
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean),
          humanContact: {
            name: humanName,
            ...(humanPhone && { phone: humanPhone }),
            ...(humanWorkTime && { workTime: humanWorkTime })
          },
          sessionRetentionDays: 180
        }
      });
      toast({ status: 'success', title: '智能客服已创建，可以开始测试' });
      closeWizard();
      await loadData();
      navigateSection('assistants');
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '智能客服创建失败'
      });
    } finally {
      setSaving(false);
    }
  };

  const knowledgeAction = (
    url: 'submit' | 'review' | 'offline',
    knowledgeId: string,
    action?: 'publish' | 'reject'
  ) => {
    const needsReason = action === 'reject' || url === 'offline';
    const reason = needsReason ? (window.prompt('请输入处理原因')?.trim() ?? '') : '';
    if (needsReason && !reason) return;
    void runAction(
      () =>
        requestAdminApi({
          url: `/api/customer-service/admin/knowledge/${url}`,
          method: 'POST',
          body: { knowledgeId, ...(action && { action }), ...(reason && { reason }) }
        }),
      action === 'publish' ? '知识已发布' : url === 'offline' ? '知识已下架' : '操作成功'
    );
  };

  const createKnowledge = async (body: CustomerServiceAdminKnowledgeCreateBody) => {
    await requestAdminApi({
      url: '/api/customer-service/admin/knowledge/create',
      method: 'POST',
      body
    });
    await loadData();
  };

  const createProduct = async (body: CustomerServiceAdminProductCreateBody) => {
    await requestAdminApi({
      url: '/api/customer-service/admin/product/create',
      method: 'POST',
      body
    });
    await loadData();
  };

  const openKnowledgeDraft = (item: KnowledgeDraftSource) => {
    setDraftOperation(item);
    setDraftDataset(undefined);
    setDraftAnswer(item.answer);
    knowledgeDraftDisclosure.onOpen();
  };

  const createKnowledgeFromOperation = async () => {
    if (!draftOperation || !draftDataset || !draftAnswer.trim()) return;
    setSaving(true);
    try {
      await requestAdminApi({
        url: '/api/customer-service/admin/operation/toKnowledge',
        method: 'POST',
        body: {
          requestRecordId: draftOperation.id,
          datasetId: draftDataset.datasetId,
          title: draftOperation.question || '客服未解决问题',
          answer: draftAnswer,
          knowledgeType: CustomerServiceKnowledgeTypeEnum.faq,
          audienceLevel: CustomerServiceAudienceEnum.public,
          modelIds: draftOperation.modelId ? [draftOperation.modelId] : []
        }
      });
      toast({ status: 'success', title: '已生成待审核知识草稿' });
      knowledgeDraftDisclosure.onClose();
      setDraftOperation(undefined);
      await loadData();
      await loadOperations(operationPage);
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '知识草稿创建失败'
      });
    } finally {
      setSaving(false);
    }
  };

  const openRoleManager = async () => {
    try {
      setRoleMembers(
        await requestAdminApi<CustomerServiceAdminRoleMemberListResponse>({
          url: '/api/customer-service/admin/role/members'
        })
      );
      roleDisclosure.onOpen();
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '团队成员加载失败'
      });
    }
  };

  const saveMemberRole = async (status = CustomerServiceResourceStatusEnum.active) => {
    if (!roleTmbId || !roleReason.trim()) return;
    await runAction(
      () =>
        requestAdminApi({
          url: '/api/customer-service/admin/role/set',
          method: 'PUT',
          body: {
            tmbId: roleTmbId,
            role: roleType,
            status,
            reason: roleReason.trim()
          }
        }),
      status === CustomerServiceResourceStatusEnum.active ? '客服岗位已保存' : '客服岗位已停用'
    );
    roleDisclosure.onClose();
    setRoleTmbId('');
  };

  const openDatasetBinding = (modelId: string) => {
    setBindingModelId(modelId);
    setBindingDataset(undefined);
  };

  const bindModelDataset = async () => {
    if (!bindingModelId || !bindingDataset) return;
    const model = modelMap.get(bindingModelId);
    if (!model) return;
    await runAction(
      () =>
        requestAdminApi({
          url: '/api/customer-service/admin/product/bindDatasets',
          method: 'PUT',
          body: {
            modelId: bindingModelId,
            datasetIds: Array.from(new Set([...model.datasetIds, bindingDataset.datasetId]))
          }
        }),
      '产品知识库已绑定'
    );
    setBindingModelId('');
    setBindingDataset(undefined);
  };

  const toggleProductModelStatus = (modelId: string, currentStatus: string) => {
    const nextStatus =
      currentStatus === CustomerServiceProductStatusEnum.active
        ? CustomerServiceProductStatusEnum.inactive
        : CustomerServiceProductStatusEnum.active;
    void runAction(
      () =>
        requestAdminApi({
          url: '/api/customer-service/admin/product/update',
          method: 'PUT',
          body: { resourceType: 'model', id: modelId, status: nextStatus }
        }),
      nextStatus === CustomerServiceProductStatusEnum.active ? '产品已启用' : '产品已停用'
    );
  };

  const renderOverview = () => (
    <Stack spacing={6}>
      <Box
        color="white"
        borderRadius="2xl"
        p={{ base: 6, lg: 8 }}
        bgGradient="linear(to-r, #3155D9, #5678F0)"
      >
        <Flex justify="space-between" align={{ base: 'start', md: 'center' }} gap={5} wrap="wrap">
          <Box>
            <Text fontSize="sm" opacity={0.8}>
              企业产品智能客服
            </Text>
            <Heading mt={2} size="lg">
              今天从这里管理客服、产品和知识
            </Heading>
            <Text mt={3} opacity={0.88} maxW="680px">
              标准工作流、产品知识范围和客服专用接口由系统统一维护，日常运营无需处理内部 ID。
            </Text>
          </Box>
          <Flex gap={3} wrap="wrap">
            {currentMember?.capabilities.manageProjects && (
              <Button bg="white" color="primary.700" onClick={createDisclosure.onOpen}>
                创建智能客服
              </Button>
            )}
            <Button
              variant="outline"
              borderColor="whiteAlpha.700"
              color="white"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => void router.push('/customer-service')}
            >
              测试客服
            </Button>
          </Flex>
        </Flex>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4}>
        <MetricCard label="运行中的客服" value={activeProjects.length} help="可直接对外提供服务" />
        <MetricCard label="产品型号" value={catalog.models.length} help="已纳入客服管理的型号" />
        <MetricCard
          label="已发布知识"
          value={publishedKnowledge.length}
          help="当前可参与正式问答"
          color="green.500"
        />
        <MetricCard
          label="待审核"
          value={pendingKnowledge.length}
          help="需要审核人员处理"
          color={pendingKnowledge.length ? 'orange.500' : 'myGray.500'}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="myGray.200" p={5}>
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="sm">需要处理</Heading>
            {currentMember?.capabilities.reviewKnowledge && (
              <Button size="sm" variant="whiteBase" onClick={() => navigateSection('review')}>
                查看审核中心
              </Button>
            )}
          </Flex>
          <Stack spacing={3}>
            {(todoCounts.unresolved > 0 || todoCounts.noAnswer > 0 || todoCounts.human > 0) && (
              <Flex p={3} borderRadius="lg" bg="blue.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600">客服对话待跟进</Text>
                  <Text fontSize="sm" color="myGray.500">
                    未解决 {todoCounts.unresolved} · 资料不足 {todoCounts.noAnswer} · 转人工{' '}
                    {todoCounts.human}
                  </Text>
                </Box>
                <Button size="sm" onClick={() => navigateSection('operations')}>
                  去处理
                </Button>
              </Flex>
            )}
            {pendingKnowledge.length > 0 ? (
              pendingKnowledge.slice(0, 4).map((item) => (
                <Flex key={item.id} p={3} borderRadius="lg" bg="orange.50" align="center" gap={3}>
                  <Box flex="1" minW={0}>
                    <Text fontWeight="600" noOfLines={1}>
                      {item.title}
                    </Text>
                    <Text fontSize="sm" color="myGray.500">
                      {knowledgeTypeMap[item.knowledgeType]} · {audienceMap[item.audienceLevel]}
                    </Text>
                  </Box>
                  <StatusBadge status={item.status} />
                </Flex>
              ))
            ) : (
              <Text color="myGray.500">当前没有待审核资料。</Text>
            )}
            {catalog.models.some((model) => model.datasetIds.length === 0) && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600">部分产品尚未绑定知识库</Text>
                  <Text fontSize="sm" color="myGray.500">
                    这些产品不能用于创建新的智能客服。
                  </Text>
                </Box>
                <Button size="sm" onClick={() => navigateSection('products')}>
                  去处理
                </Button>
              </Flex>
            )}
            {trainingErrors.length > 0 && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600">{trainingErrors.length} 份资料训练异常</Text>
                  <Text fontSize="sm" color="myGray.500">
                    请到知识中心查看错误并重新处理。
                  </Text>
                </Box>
                <Button size="sm" onClick={() => navigateSection('knowledge')}>
                  去处理
                </Button>
              </Flex>
            )}
            {unsyncedProjects.length > 0 && (
              <Flex p={3} borderRadius="lg" bg="orange.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600">{unsyncedProjects.length} 个客服知识范围待同步</Text>
                  <Text fontSize="sm" color="myGray.500">
                    旧工作流仍可用，可在客服管理中重试同步。
                  </Text>
                </Box>
                {currentMember?.capabilities.manageProjects && (
                  <Button size="sm" onClick={() => navigateSection('assistants')}>
                    去处理
                  </Button>
                )}
              </Flex>
            )}
            {systemHealth?.status === 'degraded' && (
              <Flex p={3} borderRadius="lg" bg="red.50" align="center" gap={3}>
                <Box flex="1">
                  <Text fontWeight="600">系统运行条件异常</Text>
                  <Text fontSize="sm" color="myGray.500">
                    {systemHealth.messages.join('；')}
                  </Text>
                </Box>
              </Flex>
            )}
          </Stack>
        </Box>

        <Box bg="white" borderRadius="xl" borderWidth="1px" borderColor="myGray.200" p={5}>
          <Heading size="sm" mb={4}>
            快捷入口
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {[
              ...(currentMember?.capabilities.manageProjects
                ? ([
                    ['创建客服', '从标准模板创建可直接测试的客服', createDisclosure.onOpen]
                  ] as const)
                : []),
              ...(currentMember?.capabilities.editKnowledge
                ? ([['导入资料', '上传并登记产品资料', knowledgeCreateDisclosure.onOpen]] as const)
                : []),
              ['管理产品', '检查型号及知识覆盖', () => navigateSection('products')],
              ['查看对话', '查看客服回答和用户反馈', () => navigateSection('operations')]
            ].map(([title, description, action]) => (
              <Box
                key={title as string}
                p={4}
                borderWidth="1px"
                borderColor="myGray.200"
                borderRadius="lg"
                cursor="pointer"
                _hover={{ borderColor: 'primary.300', bg: 'primary.50' }}
                onClick={() => void (action as () => void)()}
              >
                <Text fontWeight="600">{title as string}</Text>
                <Text mt={1} color="myGray.500" fontSize="sm">
                  {description as string}
                </Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      </SimpleGrid>
    </Stack>
  );

  const renderAssistants = () => (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">客服管理</Heading>
          <Text mt={1} color="myGray.500">
            创建、启停和测试智能客服；高级工作流只在需要时打开。
          </Text>
        </Box>
        {currentMember?.capabilities.manageProjects && (
          <Button colorScheme="blue" onClick={createDisclosure.onOpen}>
            创建智能客服
          </Button>
        )}
      </Flex>
      {projectData.projects.length === 0 ? (
        <EmptyState
          title="还没有智能客服"
          description="选择产品后，系统会自动创建标准工作流、客服项目和专用接口。"
          action={
            currentMember?.capabilities.manageProjects ? (
              <Button onClick={createDisclosure.onOpen}>立即创建</Button>
            ) : undefined
          }
        />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {projectData.projects.map((project) => {
            const modelNames = project.modelIds
              .map((id) => modelMap.get(id)?.name)
              .filter(Boolean)
              .join('、');
            const keyReady = boundProjectIds.has(project.id);
            const workflowReady = project.workflowReadiness.status === 'ready';
            const workflowSyncFailed =
              project.workflowSync.status === CustomerServiceWorkflowSyncStatusEnum.failed;
            const workflowSyncing =
              project.workflowSync.status === CustomerServiceWorkflowSyncStatusEnum.syncing;
            const deliveryReady = project.deliveryReadiness.ready;
            return (
              <Box
                key={project.id}
                bg="white"
                borderWidth="1px"
                borderColor="myGray.200"
                borderRadius="xl"
                p={5}
              >
                <Flex align="start" justify="space-between" gap={3}>
                  <Box minW={0}>
                    <Flex align="center" gap={2} wrap="wrap">
                      <Heading size="sm">{project.name}</Heading>
                      <StatusBadge status={project.status} />
                      <Badge colorScheme={keyReady ? 'blue' : 'red'}>
                        {keyReady ? '接口已就绪' : '接口未绑定'}
                      </Badge>
                      <Badge
                        colorScheme={
                          workflowSyncFailed ? 'red' : workflowReady ? 'green' : 'orange'
                        }
                      >
                        {workflowSyncFailed
                          ? '知识同步失败'
                          : workflowSyncing
                            ? '知识同步中'
                            : workflowReady
                              ? '知识已同步'
                              : '知识待同步'}
                      </Badge>
                      <Badge colorScheme={deliveryReady ? 'green' : 'red'}>
                        {deliveryReady ? '可正式使用' : '尚未就绪'}
                      </Badge>
                    </Flex>
                    <Text mt={2} color="myGray.500" fontSize="sm" noOfLines={2}>
                      {modelNames || '适用于全部已授权产品'}
                    </Text>
                  </Box>
                </Flex>
                <Divider my={4} />
                <SimpleGrid columns={2} gap={3} fontSize="sm">
                  <Box>
                    <Text color="myGray.500">服务范围</Text>
                    <Text mt={1}>{audienceMap[project.defaultAudience]}</Text>
                  </Box>
                  <Box>
                    <Text color="myGray.500">人工服务</Text>
                    <Text mt={1}>{project.humanContact.name}</Text>
                  </Box>
                </SimpleGrid>
                {(!workflowReady || workflowSyncFailed) &&
                  currentMember?.capabilities.manageProjects && (
                    <Flex
                      mt={4}
                      p={3}
                      bg={workflowSyncFailed ? 'red.50' : 'orange.50'}
                      borderRadius="md"
                      align="center"
                      gap={3}
                    >
                      <Box flex="1">
                        <Text color={workflowSyncFailed ? 'red.800' : 'orange.800'} fontSize="sm">
                          {workflowSyncFailed
                            ? project.workflowSync.failureReason || '工作流知识范围同步失败'
                            : project.workflowReadiness.message}
                        </Text>
                        {project.workflowSync.failureTime && (
                          <Text mt={1} color="myGray.500" fontSize="xs">
                            失败时间：{new Date(project.workflowSync.failureTime).toLocaleString()}
                          </Text>
                        )}
                      </Box>
                      <Button
                        size="xs"
                        colorScheme={workflowSyncFailed ? 'red' : 'orange'}
                        isLoading={saving}
                        isDisabled={workflowSyncing}
                        onClick={() =>
                          void runAction(
                            () =>
                              requestAdminApi({
                                url: '/api/customer-service/admin/project/syncWorkflow',
                                method: 'POST',
                                body: { projectId: project.id }
                              }),
                            '客服知识库已同步并发布'
                          )
                        }
                      >
                        {workflowSyncFailed ? '重新同步' : '立即同步'}
                      </Button>
                    </Flex>
                  )}
                {!deliveryReady && (
                  <Box mt={3} p={3} bg="red.50" borderRadius="md">
                    <Text color="red.700" fontSize="sm">
                      {project.deliveryReadiness.messages.join('；')}
                    </Text>
                  </Box>
                )}
                <Flex mt={5} gap={2} wrap="wrap">
                  <Button
                    size="sm"
                    onClick={() =>
                      window.open(`/customer-service/chat/${project.publicId}`, '_blank')
                    }
                  >
                    客户预览
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          `${window.location.origin}/customer-service/chat/${project.publicId}`
                        )
                        .then(() => toast({ status: 'success', title: '客服地址已复制' }))
                    }
                  >
                    复制客服地址
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() =>
                      void router.push(`/app/detail?appId=${project.appId}&currentTab=logs`)
                    }
                  >
                    对话与效果
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() => void router.push(`/app/detail?appId=${project.appId}`)}
                  >
                    高级工作流
                  </Button>
                  {currentMember?.capabilities.manageProjects && (
                    <Button
                      size="sm"
                      variant="whiteBase"
                      isLoading={saving}
                      onClick={() =>
                        void runAction(() =>
                          requestAdminApi({
                            url: '/api/customer-service/admin/project/update',
                            method: 'PUT',
                            body: {
                              projectId: project.id,
                              status:
                                project.status === CustomerServiceProjectStatusEnum.active
                                  ? CustomerServiceProjectStatusEnum.inactive
                                  : CustomerServiceProjectStatusEnum.active
                            }
                          })
                        )
                      }
                    >
                      {project.status === CustomerServiceProjectStatusEnum.active ? '停用' : '启用'}
                    </Button>
                  )}
                </Flex>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );

  const KnowledgeCard = ({
    item,
    reviewMode = false
  }: {
    item: CustomerServiceAdminKnowledgeListResponse[number];
    reviewMode?: boolean;
  }) => {
    const modelNames = item.modelIds
      .map((id) => modelMap.get(id)?.name)
      .filter(Boolean)
      .join('、');
    return (
      <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
        <Flex align="start" justify="space-between" gap={4}>
          <Box minW={0}>
            <Heading size="sm" noOfLines={2}>
              {item.title}
            </Heading>
            <Flex mt={2} gap={2} wrap="wrap">
              <StatusBadge status={item.status} />
              <Badge variant="subtle">{knowledgeTypeMap[item.knowledgeType]}</Badge>
              <Badge colorScheme="purple">{audienceMap[item.audienceLevel]}</Badge>
            </Flex>
          </Box>
          <Text fontSize="sm" color="myGray.500">
            V{item.version}
          </Text>
        </Flex>
        <Text mt={3} fontSize="sm" color="myGray.600">
          适用产品：{modelNames || '通用资料'}
        </Text>
        <Text mt={1} fontSize="sm" color="myGray.500">
          来源：{item.sourceName || datasetNameMap.get(item.datasetId) || '企业知识库'}
        </Text>
        <Flex mt={2} align="center" gap={2} wrap="wrap">
          <Badge
            colorScheme={
              item.trainingStatus === 'ready'
                ? 'green'
                : item.trainingStatus === 'error'
                  ? 'red'
                  : item.trainingStatus === 'running'
                    ? 'blue'
                    : 'gray'
            }
          >
            {item.trainingStatus === 'ready'
              ? `训练完成 · ${item.dataAmount} 段`
              : item.trainingStatus === 'running'
                ? `训练中 · ${item.trainingAmount} 项`
                : item.trainingStatus === 'error'
                  ? '训练异常'
                  : '等待生成知识'}
          </Badge>
          {item.trainingError && (
            <Text maxW="100%" color="red.600" fontSize="xs" noOfLines={2}>
              {item.trainingError}
            </Text>
          )}
          {item.trainingStatus === 'error' && (
            <Button
              size="xs"
              variant="link"
              onClick={() =>
                void router.push(
                  `/dataset/detail?datasetId=${item.datasetId}&currentTab=dataCard&collectionId=${item.collectionId}`
                )
              }
            >
              查看并重试
            </Button>
          )}
        </Flex>
        <Flex mt={4} gap={2} wrap="wrap">
          {reviewMode ? (
            currentMember?.capabilities.reviewKnowledge ? (
              <>
                <Button
                  size="sm"
                  colorScheme="green"
                  isLoading={saving}
                  onClick={() => knowledgeAction('review', item.id, 'publish')}
                >
                  通过并发布
                </Button>
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  isLoading={saving}
                  onClick={() => knowledgeAction('review', item.id, 'reject')}
                >
                  驳回
                </Button>
              </>
            ) : null
          ) : (
            <>
              {(item.status === CustomerServiceKnowledgeStatusEnum.draft ||
                item.status === CustomerServiceKnowledgeStatusEnum.rejected) &&
                currentMember?.capabilities.editKnowledge && (
                  <Button
                    size="sm"
                    onClick={() => knowledgeAction('submit', item.id)}
                    isLoading={saving}
                  >
                    提交审核
                  </Button>
                )}
              {item.status === CustomerServiceKnowledgeStatusEnum.published &&
                currentMember?.capabilities.reviewKnowledge && (
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() => knowledgeAction('offline', item.id)}
                    isLoading={saving}
                  >
                    下架
                  </Button>
                )}
            </>
          )}
        </Flex>
      </Box>
    );
  };

  const renderKnowledge = () => (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">知识中心</Heading>
          <Text mt={1} color="myGray.500">
            查看资料适用范围和发布状态，只有已发布知识会参与正式客服回答。
          </Text>
        </Box>
        <Flex gap={2}>
          {currentMember?.capabilities.editKnowledge && (
            <Button onClick={knowledgeCreateDisclosure.onOpen}>上传或登记资料</Button>
          )}
        </Flex>
      </Flex>
      {unregisteredKnowledge.length > 0 && (
        <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="xl" p={4}>
          <Heading size="sm">待登记资料（{unregisteredKnowledge.length}）</Heading>
          <Text mt={1} color="myGray.600" fontSize="sm">
            这些资料已经上传到 FastGPT，但还没有登记适用产品和可见范围，可以直接恢复，不用重新上传。
          </Text>
          <Stack mt={3} spacing={2}>
            {unregisteredKnowledge.slice(0, 10).map((item) => (
              <Flex
                key={item.collectionId}
                bg="white"
                borderRadius="lg"
                p={3}
                gap={3}
                align="center"
                wrap="wrap"
              >
                <Box flex="1" minW="220px">
                  <Text fontWeight="600" noOfLines={1}>
                    {item.name}
                  </Text>
                  <Text fontSize="xs" color="myGray.500">
                    {item.datasetName} ·{' '}
                    {item.trainingStatus === 'ready'
                      ? '训练完成'
                      : item.trainingStatus === 'running'
                        ? '训练中'
                        : item.trainingStatus === 'error'
                          ? '训练异常'
                          : '等待生成知识'}
                  </Text>
                </Box>
                <Button
                  size="sm"
                  onClick={() => {
                    setRecoveringKnowledge(item);
                    knowledgeCreateDisclosure.onOpen();
                  }}
                >
                  继续登记
                </Button>
              </Flex>
            ))}
          </Stack>
        </Box>
      )}
      {knowledge.length === 0 ? (
        <EmptyState
          title="还没有登记客服知识"
          description="在这里选择知识库、上传资料并登记适用产品，系统会继续使用 FastGPT 原有训练队列。"
          action={
            currentMember?.capabilities.editKnowledge ? (
              <Button onClick={knowledgeCreateDisclosure.onOpen}>上传第一份资料</Button>
            ) : undefined
          }
        />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {knowledge.map((item) => (
            <KnowledgeCard key={item.id} item={item} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );

  const renderProducts = () => (
    <Stack spacing={5}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">产品管理</Heading>
          <Text mt={1} color="myGray.500">
            按产品型号检查知识覆盖；没有知识库的型号不能创建智能客服。
          </Text>
        </Box>
        {currentMember?.capabilities.manageProjects && (
          <Button onClick={productCreateDisclosure.onOpen}>添加产品或版本</Button>
        )}
      </Flex>
      {catalog.models.length === 0 ? (
        <EmptyState
          title="还没有产品型号"
          description="先建立产品大类、系列和型号，再为型号绑定对应知识库。"
          action={
            currentMember?.capabilities.manageProjects ? (
              <Button onClick={productCreateDisclosure.onOpen}>添加产品</Button>
            ) : undefined
          }
        />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {catalog.models.map((model) => {
            const series = seriesMap.get(model.seriesId);
            const category = series ? categoryMap.get(series.categoryId) : undefined;
            const versionCount = catalog.versions.filter(
              (version) => version.modelId === model.id
            ).length;
            const relatedKnowledge = knowledge.filter(
              (item) => item.modelIds.length === 0 || item.modelIds.includes(model.id)
            );
            return (
              <Box
                key={model.id}
                bg="white"
                borderWidth="1px"
                borderColor="myGray.200"
                borderRadius="xl"
                p={5}
              >
                <Flex justify="space-between" align="start" gap={4}>
                  <Box minW={0}>
                    <Flex gap={2} align="center" wrap="wrap">
                      <Heading size="sm">{model.name}</Heading>
                      <StatusBadge status={model.status} />
                    </Flex>
                    <Text mt={2} fontSize="sm" color="myGray.500">
                      {[category?.name, series?.name, model.modelCode].filter(Boolean).join(' / ')}
                    </Text>
                  </Box>
                  <Badge colorScheme={model.datasetIds.length ? 'blue' : 'red'}>
                    {model.datasetIds.length
                      ? `${model.datasetIds.length} 个知识库`
                      : '未绑定知识库'}
                  </Badge>
                </Flex>
                <SimpleGrid mt={4} columns={3} gap={3}>
                  <Box bg="myGray.50" p={3} borderRadius="lg">
                    <Text fontWeight="700">{versionCount}</Text>
                    <Text fontSize="xs" color="myGray.500">
                      软硬件版本
                    </Text>
                  </Box>
                  <Box bg="myGray.50" p={3} borderRadius="lg">
                    <Text fontWeight="700">{relatedKnowledge.length}</Text>
                    <Text fontSize="xs" color="myGray.500">
                      关联知识
                    </Text>
                  </Box>
                  <Box bg="myGray.50" p={3} borderRadius="lg">
                    <Text fontWeight="700">
                      {
                        relatedKnowledge.filter(
                          (item) => item.status === CustomerServiceKnowledgeStatusEnum.published
                        ).length
                      }
                    </Text>
                    <Text fontSize="xs" color="myGray.500">
                      已发布
                    </Text>
                  </Box>
                </SimpleGrid>
                <Flex mt={4} gap={2} wrap="wrap">
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() => void router.push('/dataset/list')}
                  >
                    查看知识库
                  </Button>
                  {currentMember?.capabilities.manageProjects && (
                    <Button
                      size="sm"
                      variant="whiteBase"
                      onClick={() => openDatasetBinding(model.id)}
                    >
                      绑定知识库
                    </Button>
                  )}
                  {model.status !== CustomerServiceProductStatusEnum.discontinued &&
                    currentMember?.capabilities.manageProjects && (
                      <Button
                        size="sm"
                        variant="whiteBase"
                        isLoading={saving}
                        onClick={() => toggleProductModelStatus(model.id, model.status)}
                      >
                        {model.status === CustomerServiceProductStatusEnum.active
                          ? '停用产品'
                          : '启用产品'}
                      </Button>
                    )}
                </Flex>
              </Box>
            );
          })}
        </SimpleGrid>
      )}
    </Stack>
  );

  const renderReview = () => (
    <Stack spacing={5}>
      <Box>
        <Heading size="md">审核中心</Heading>
        <Text mt={1} color="myGray.500">
          审核资料的适用产品、可见范围和有效期；通过后才会进入正式客服检索。
        </Text>
      </Box>
      {pendingKnowledge.length === 0 ? (
        <EmptyState title="没有待审核资料" description="当前提交的知识都已处理完毕。" />
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
          {pendingKnowledge.map((item) => (
            <KnowledgeCard key={item.id} item={item} reviewMode />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );

  const renderOperations = () => (
    <Stack spacing={5}>
      <Box>
        <Heading size="md">对话运营</Heading>
        <Text mt={1} color="myGray.500">
          集中查看客服回答、客户反馈、知识引用和未解决问题，不再需要进入底层日志逐条查找。
        </Text>
      </Box>
      <Flex bg="white" p={4} borderWidth="1px" borderRadius="xl" gap={3} wrap="wrap">
        <Input
          maxW={{ base: '100%', md: '360px' }}
          value={operationKeyword}
          onChange={(event) => setOperationKeyword(event.target.value)}
          placeholder="搜索问题或回答"
          onKeyDown={(event) => event.key === 'Enter' && void loadOperations(1)}
        />
        <Select
          maxW={{ base: '100%', md: '220px' }}
          value={operationProjectId}
          onChange={(event) => setOperationProjectId(event.target.value)}
        >
          <option value="">全部客服项目</option>
          {projectData.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Select
          maxW={{ base: '100%', md: '220px' }}
          value={operationSeriesId}
          onChange={(event) => {
            setOperationSeriesId(event.target.value);
            setOperationModelId('');
          }}
        >
          <option value="">全部产品系列</option>
          {catalog.series.map((series) => (
            <option key={series.id} value={series.id}>
              {series.name}
            </option>
          ))}
        </Select>
        <Select
          maxW={{ base: '100%', md: '220px' }}
          value={operationModelId}
          onChange={(event) => setOperationModelId(event.target.value)}
        >
          <option value="">全部产品型号</option>
          {catalog.models
            .filter((model) => !operationSeriesId || model.seriesId === operationSeriesId)
            .map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}（{model.modelCode}）
              </option>
            ))}
        </Select>
        <Select
          maxW={{ base: '100%', md: '220px' }}
          value={operationFeedback}
          onChange={(event) => setOperationFeedback(event.target.value)}
        >
          <option value="">全部反馈</option>
          <option value="unresolved">未解决</option>
          <option value="bad">不满意</option>
          <option value="good">满意</option>
          <option value="none">未反馈</option>
        </Select>
        <Select
          maxW={{ base: '100%', md: '220px' }}
          value={operationResultStatus}
          onChange={(event) => setOperationResultStatus(event.target.value)}
        >
          <option value="">全部回答状态</option>
          <option value={CustomerServiceChatStatusEnum.answered}>已回答</option>
          <option value={CustomerServiceChatStatusEnum.clarificationRequired}>无答案/需补充</option>
          <option value={CustomerServiceChatStatusEnum.humanRequired}>已转人工</option>
        </Select>
        <Input
          type="date"
          maxW={{ base: '100%', md: '180px' }}
          value={operationStartTime}
          aria-label="开始日期"
          onChange={(event) => setOperationStartTime(event.target.value)}
        />
        <Input
          type="date"
          maxW={{ base: '100%', md: '180px' }}
          value={operationEndTime}
          aria-label="结束日期"
          onChange={(event) => setOperationEndTime(event.target.value)}
        />
        <Button isLoading={operationLoading} onClick={() => void loadOperations(1)}>
          查询
        </Button>
        <Badge alignSelf="center" colorScheme="blue" px={3} py={1} borderRadius="full">
          共 {operations.total} 条
        </Badge>
      </Flex>
      <Box bg="white" p={4} borderWidth="1px" borderRadius="xl">
        <Flex justify="space-between" align="center" gap={3} wrap="wrap">
          <Box>
            <Heading size="sm">高频问题</Heading>
            <Text mt={1} color="myGray.500" fontSize="sm">
              按最近 30 天重复提问次数排序；转为知识前请先人工确认答案。
            </Text>
          </Box>
          <Badge colorScheme="purple">前 {frequentQuestions.list.length} 条</Badge>
        </Flex>
        {frequentQuestions.list.length === 0 ? (
          <Text mt={4} color="myGray.500" fontSize="sm">
            暂无达到最少出现 2 次的问题。
          </Text>
        ) : (
          <Stack mt={4} spacing={3}>
            {frequentQuestions.list.map((item) => (
              <Box
                key={`${item.projectId}-${item.modelId ?? 'all'}-${item.question}`}
                p={3}
                bg="myGray.50"
                borderRadius="lg"
              >
                <Flex justify="space-between" align="start" gap={3} wrap="wrap">
                  <Box minW={0} flex="1">
                    <Text fontWeight="600" whiteSpace="pre-wrap">
                      {item.question}
                    </Text>
                    <Flex mt={2} gap={2} wrap="wrap">
                      <Badge colorScheme="purple">提问 {item.count} 次</Badge>
                      {item.modelName && <Badge variant="subtle">{item.modelName}</Badge>}
                      {item.unresolvedCount > 0 && (
                        <Badge colorScheme="orange">未解决 {item.unresolvedCount}</Badge>
                      )}
                      {item.clarificationRequiredCount > 0 && (
                        <Badge colorScheme="yellow">
                          资料不足 {item.clarificationRequiredCount}
                        </Badge>
                      )}
                      {item.humanRequiredCount > 0 && (
                        <Badge colorScheme="red">转人工 {item.humanRequiredCount}</Badge>
                      )}
                    </Flex>
                  </Box>
                  <Text flexShrink={0} fontSize="xs" color="myGray.500">
                    最近 {new Date(item.latestTime).toLocaleString()}
                  </Text>
                </Flex>
                <Flex mt={3} gap={2} wrap="wrap">
                  {currentMember?.capabilities.editKnowledge && (
                    <Button
                      size="xs"
                      variant="whiteBase"
                      onClick={() =>
                        openKnowledgeDraft({
                          id: item.requestRecordId,
                          question: item.question,
                          answer: item.answer,
                          modelId: item.modelId
                        })
                      }
                    >
                      转为知识草稿
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="link"
                    onClick={() => {
                      setOperationKeyword(item.question);
                      void loadOperations(1);
                    }}
                  >
                    查看相关对话
                  </Button>
                </Flex>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
      {operationLoading && operations.list.length === 0 ? (
        <Flex minH="220px" justify="center" align="center">
          <Spinner />
        </Flex>
      ) : operations.list.length === 0 ? (
        <EmptyState title="暂无符合条件的对话" description="客服产生正式问答后会显示在这里。" />
      ) : (
        <Stack spacing={4}>
          {operations.list.map((item) => (
            <Box
              key={item.id}
              bg="white"
              borderWidth="1px"
              borderColor="myGray.200"
              borderRadius="xl"
              p={5}
            >
              <Flex justify="space-between" gap={3} wrap="wrap">
                <Flex gap={2} wrap="wrap" align="center">
                  <Badge colorScheme="blue">{item.projectName}</Badge>
                  {item.modelName && <Badge variant="subtle">{item.modelName}</Badge>}
                  <Badge
                    colorScheme={
                      item.feedback === 'good'
                        ? 'green'
                        : item.feedback === 'none'
                          ? 'gray'
                          : 'orange'
                    }
                  >
                    {item.feedback === 'unresolved'
                      ? '未解决'
                      : item.feedback === 'bad'
                        ? '不满意'
                        : item.feedback === 'good'
                          ? '满意'
                          : '未反馈'}
                  </Badge>
                  {item.lowConfidence && <Badge colorScheme="red">低置信度</Badge>}
                  <Badge variant="outline">
                    {item.resultStatus === CustomerServiceChatStatusEnum.answered
                      ? '已回答'
                      : item.resultStatus === CustomerServiceChatStatusEnum.humanRequired
                        ? '已转人工'
                        : item.resultStatus === CustomerServiceChatStatusEnum.clarificationRequired
                          ? '需补充资料'
                          : '处理状态未知'}
                  </Badge>
                </Flex>
                <Text fontSize="xs" color="myGray.500">
                  {new Date(item.createTime).toLocaleString()}
                </Text>
              </Flex>
              <Box mt={4}>
                <Text fontSize="xs" color="myGray.500">
                  客户问题
                </Text>
                <Text mt={1} fontWeight="600" whiteSpace="pre-wrap">
                  {item.question || '未记录问题正文'}
                </Text>
              </Box>
              <Box mt={3} p={4} bg="myGray.50" borderRadius="lg">
                <Text fontSize="xs" color="myGray.500">
                  客服回答
                </Text>
                <Text mt={1} fontSize="sm" whiteSpace="pre-wrap" noOfLines={6}>
                  {item.answer || '未生成回答'}
                </Text>
              </Box>
              <Flex mt={3} gap={4} wrap="wrap" color="myGray.500" fontSize="xs">
                <Text>引用 {item.citationCount} 条</Text>
                <Text>耗时 {item.durationSeconds?.toFixed(1) ?? '-'} 秒</Text>
                <Text>Token {item.tokens}</Text>
                <Text>积分 {item.points.toFixed(2)}</Text>
              </Flex>
              {item.humanReason && (
                <Text mt={2} color="orange.700" fontSize="xs">
                  转人工原因：{item.humanReason}
                </Text>
              )}
              {item.citations.length > 0 && (
                <Text mt={2} color="myGray.500" fontSize="xs" noOfLines={2}>
                  来源：{item.citations.map((citation) => citation.sourceName).join('、')}
                </Text>
              )}
              <Flex mt={4} gap={2}>
                {currentMember?.capabilities.editKnowledge && (
                  <Button size="sm" variant="whiteBase" onClick={() => openKnowledgeDraft(item)}>
                    转为知识草稿
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="whiteBase"
                  onClick={() =>
                    void router.push(
                      `/app/detail?appId=${projectData.projects.find((project) => project.id === item.projectId)?.appId}&currentTab=logs`
                    )
                  }
                >
                  查看原始日志
                </Button>
              </Flex>
            </Box>
          ))}
        </Stack>
      )}
      {operations.total > 20 && (
        <Flex justify="center" align="center" gap={3}>
          <Button
            size="sm"
            variant="whiteBase"
            isDisabled={operationPage <= 1}
            onClick={() => void loadOperations(operationPage - 1)}
          >
            上一页
          </Button>
          <Text fontSize="sm" color="myGray.500">
            第 {operationPage} / {Math.ceil(operations.total / 20)} 页
          </Text>
          <Button
            size="sm"
            variant="whiteBase"
            isDisabled={operationPage * 20 >= operations.total}
            onClick={() => void loadOperations(operationPage + 1)}
          >
            下一页
          </Button>
        </Flex>
      )}
    </Stack>
  );

  const renderSettings = () => (
    <Stack spacing={5}>
      <Box>
        <Heading size="md">系统设置</Heading>
        <Text mt={1} color="myGray.500">
          日常运营使用上方业务模块；底层资源和复杂规则集中在高级设置。
        </Text>
      </Box>
      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={5}>
        <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
          <Flex justify="space-between" align="center" gap={3}>
            <Heading size="sm">成员与职责</Heading>
            <Button size="sm" variant="whiteBase" onClick={() => void openRoleManager()}>
              配置岗位
            </Button>
          </Flex>
          <Text mt={2} color="myGray.500" fontSize="sm">
            当前已配置 {roles.filter((item) => item.status === 'active').length} 个有效客服岗位。
          </Text>
          <Stack mt={4} spacing={2}>
            {roles.slice(0, 5).map((item) => (
              <Flex key={item.id} justify="space-between" p={3} bg="myGray.50" borderRadius="lg">
                <Box>
                  <Text fontSize="sm" fontWeight="600">
                    {item.memberName}
                  </Text>
                  <Text fontSize="xs" color="myGray.500">
                    {memberRoleMap[item.role]}
                  </Text>
                </Box>
                <StatusBadge status={item.status} />
              </Flex>
            ))}
            {roles.length === 0 && <Text color="myGray.500">由团队管理员承担客服管理职责。</Text>}
          </Stack>
        </Box>
        <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={5}>
          <Heading size="sm">高级工作台</Heading>
          <Text mt={2} color="myGray.500" fontSize="sm">
            仅在需要修改复杂规则、底层工作流、API Key 或资源权限时使用。
          </Text>
          <Stack mt={4} spacing={3}>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/customer-service/admin')}
            >
              客服高级设置（兼容页面）
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/dashboard/agent')}
            >
              FastGPT 工作流工作台
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/dataset/list')}
            >
              FastGPT 知识库工作台
            </Button>
            <Button
              justifyContent="start"
              variant="whiteBase"
              onClick={() => router.push('/account/apikey')}
            >
              API Key 管理
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>
    </Stack>
  );

  const currentContent = (() => {
    if (section === 'assistants') return renderAssistants();
    if (section === 'knowledge') return renderKnowledge();
    if (section === 'products') return renderProducts();
    if (section === 'operations') return renderOperations();
    if (section === 'review') return renderReview();
    if (section === 'settings') return renderSettings();
    return renderOverview();
  })();

  return (
    <Flex h="100%" minH={0} bg="myGray.50">
      <Head>
        <title>智能客服控制台</title>
      </Head>
      <Box
        display={{ base: 'none', lg: 'block' }}
        w="238px"
        flexShrink={0}
        bg="white"
        borderRightWidth="1px"
        borderColor="myGray.200"
        px={4}
        py={6}
      >
        <Heading size="md" px={3}>
          智能客服
        </Heading>
        <Text px={3} mt={1} color="myGray.500" fontSize="sm">
          运营控制台
        </Text>
        <Stack mt={7} spacing={1}>
          {visibleSectionConfig.map((item) => {
            const active = section === item.key;
            return (
              <Flex
                key={item.key}
                p={3}
                borderRadius="lg"
                align="center"
                gap={3}
                cursor="pointer"
                bg={active ? 'primary.50' : 'transparent'}
                color={active ? 'primary.700' : 'myGray.700'}
                _hover={{ bg: active ? 'primary.50' : 'myGray.50' }}
                onClick={() => navigateSection(item.key)}
              >
                <MyIcon name={item.icon} w={5} />
                <Box>
                  <Text fontWeight={active ? '600' : '500'}>{item.label}</Text>
                  <Text fontSize="xs" color="myGray.500">
                    {item.description}
                  </Text>
                </Box>
                {item.key === 'review' && pendingKnowledge.length > 0 && (
                  <Badge ml="auto" colorScheme="orange" borderRadius="full">
                    {pendingKnowledge.length}
                  </Badge>
                )}
              </Flex>
            );
          })}
        </Stack>
      </Box>

      <Flex flex="1" minW={0} minH={0} direction="column">
        <Flex
          bg="white"
          px={{ base: 4, lg: 7 }}
          py={3}
          borderBottomWidth="1px"
          borderColor="myGray.200"
          align="center"
          justify="space-between"
          gap={3}
        >
          <Select
            display={{ base: 'block', lg: 'none' }}
            maxW="180px"
            value={section}
            onChange={(event) => navigateSection(event.target.value as ConsoleSection)}
          >
            {visibleSectionConfig.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </Select>
          <Box display={{ base: 'none', lg: 'block' }}>
            <Text fontWeight="600">
              {visibleSectionConfig.find((item) => item.key === section)?.label}
            </Text>
          </Box>
          <Flex gap={2}>
            <Button
              size="sm"
              variant="whiteBase"
              onClick={() => {
                void (async () => {
                  await loadData();
                  if (section === 'operations') {
                    await loadOperations(operationPage);
                  }
                })();
              }}
            >
              刷新
            </Button>
            <Button
              size="sm"
              variant="whiteBase"
              onClick={() => void router.push('/customer-service')}
            >
              打开客服
            </Button>
          </Flex>
        </Flex>
        <Box flex="1" minH={0} overflowY="auto" p={{ base: 4, md: 6, xl: 8 }}>
          {loading ? (
            <Flex minH="420px" align="center" justify="center">
              <Spinner />
            </Flex>
          ) : (
            currentContent
          )}
        </Box>
      </Flex>

      <Modal isOpen={createDisclosure.isOpen} onClose={closeWizard} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            创建智能客服
            <Text mt={1} fontSize="sm" fontWeight="400" color="myGray.500">
              第 {wizardStep + 1} 步，共 3 步
            </Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Flex mb={6} gap={2}>
              {[0, 1, 2].map((step) => (
                <Box
                  key={step}
                  h="4px"
                  flex="1"
                  borderRadius="full"
                  bg={step <= wizardStep ? 'primary.500' : 'myGray.200'}
                />
              ))}
            </Flex>
            {wizardStep === 0 && (
              <Stack spacing={5}>
                <Box>
                  <Heading size="sm">基本信息</Heading>
                  <Text mt={1} color="myGray.500" fontSize="sm">
                    系统会使用企业产品智能客服标准工作流创建服务。
                  </Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel>客服名称</FormLabel>
                  <Input
                    value={assistantName}
                    onChange={(event) => setAssistantName(event.target.value)}
                    placeholder="例如：拍照设备智能客服"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>服务对象</FormLabel>
                  <Select
                    value={assistantAudience}
                    onChange={(event) =>
                      setAssistantAudience(event.target.value as CustomerServiceAudienceEnum)
                    }
                  >
                    {Object.values(CustomerServiceAudienceEnum).map((item) => (
                      <option key={item} value={item}>
                        {audienceMap[item]}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>欢迎语</FormLabel>
                  <Textarea
                    value={assistantWelcome}
                    onChange={(event) => setAssistantWelcome(event.target.value)}
                  />
                </FormControl>
              </Stack>
            )}
            {wizardStep === 1 && (
              <Stack spacing={4}>
                <Box>
                  <Heading size="sm">选择服务产品</Heading>
                  <Text mt={1} color="myGray.500" fontSize="sm">
                    系统会自动使用这些型号绑定的知识库，并隔离其他产品资料。
                  </Text>
                </Box>
                {catalog.models.length === 0 ? (
                  <EmptyState
                    title="还没有产品型号"
                    description="请先建立产品目录并绑定知识库。"
                    action={
                      <Button
                        onClick={() => void router.push('/customer-service/admin?tab=products')}
                      >
                        去添加产品
                      </Button>
                    }
                  />
                ) : (
                  <Stack maxH="360px" overflowY="auto" spacing={2} pr={1}>
                    {catalog.models.map((model) => {
                      const disabled =
                        model.status !== CustomerServiceProductStatusEnum.active ||
                        model.datasetIds.length === 0;
                      const series = seriesMap.get(model.seriesId);
                      return (
                        <Flex
                          key={model.id}
                          p={4}
                          borderWidth="1px"
                          borderColor={
                            assistantModelIds.includes(model.id) ? 'primary.400' : 'myGray.200'
                          }
                          borderRadius="lg"
                          align="center"
                          gap={3}
                          opacity={disabled ? 0.55 : 1}
                          cursor={disabled ? 'not-allowed' : 'pointer'}
                          onClick={() => !disabled && toggleModel(model.id)}
                        >
                          <Checkbox
                            isChecked={assistantModelIds.includes(model.id)}
                            isDisabled={disabled}
                            pointerEvents="none"
                          />
                          <Box flex="1">
                            <Text fontWeight="600">{model.name}</Text>
                            <Text fontSize="sm" color="myGray.500">
                              {series?.name} · {model.modelCode}
                            </Text>
                          </Box>
                          <Badge colorScheme={model.datasetIds.length ? 'blue' : 'red'}>
                            {model.datasetIds.length
                              ? `${model.datasetIds.length} 个知识库`
                              : '缺少知识库'}
                          </Badge>
                        </Flex>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            )}
            {wizardStep === 2 && (
              <Stack spacing={5}>
                <Box>
                  <Heading size="sm">服务设置</Heading>
                  <Text mt={1} color="myGray.500" fontSize="sm">
                    完成后会自动创建工作流、客服项目和专用接口，可直接进入测试。
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel>推荐问题（每行一个）</FormLabel>
                  <Textarea
                    minH="110px"
                    value={assistantQuestions}
                    onChange={(event) => setAssistantQuestions(event.target.value)}
                  />
                </FormControl>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  <FormControl isRequired>
                    <FormLabel>人工客服名称</FormLabel>
                    <Input
                      value={humanName}
                      onChange={(event) => setHumanName(event.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>联系电话</FormLabel>
                    <Input
                      value={humanPhone}
                      onChange={(event) => setHumanPhone(event.target.value)}
                    />
                  </FormControl>
                  <FormControl gridColumn={{ md: 'span 2' }}>
                    <FormLabel>人工服务时间</FormLabel>
                    <Input
                      value={humanWorkTime}
                      onChange={(event) => setHumanWorkTime(event.target.value)}
                      placeholder="例如：工作日 09:00-18:00"
                    />
                  </FormControl>
                </SimpleGrid>
                <Box p={4} bg="blue.50" borderRadius="lg">
                  <Text fontWeight="600">创建内容</Text>
                  <Text mt={1} fontSize="sm" color="myGray.600">
                    {assistantName} · {assistantModelIds.length} 个产品型号 ·{' '}
                    {audienceMap[assistantAudience]}
                  </Text>
                </Box>
              </Stack>
            )}
          </ModalBody>
          <ModalFooter gap={2}>
            {wizardStep > 0 && (
              <Button variant="whiteBase" onClick={() => setWizardStep((step) => step - 1)}>
                上一步
              </Button>
            )}
            {wizardStep < 2 ? (
              <Button
                colorScheme="blue"
                isDisabled={
                  (wizardStep === 0 && !assistantName.trim()) ||
                  (wizardStep === 1 && assistantModelIds.length === 0)
                }
                onClick={() => setWizardStep((step) => step + 1)}
              >
                下一步
              </Button>
            ) : (
              <Button
                colorScheme="blue"
                isLoading={saving}
                isDisabled={!humanName.trim()}
                onClick={() => void createAssistant()}
              >
                完成创建
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
      <KnowledgeCreateModal
        key={recoveringKnowledge?.collectionId ?? 'new-knowledge'}
        isOpen={knowledgeCreateDisclosure.isOpen}
        catalog={catalog}
        initialSource={
          recoveringKnowledge
            ? {
                dataset: {
                  datasetId: recoveringKnowledge.datasetId,
                  name: recoveringKnowledge.datasetName,
                  avatar: recoveringKnowledge.datasetAvatar,
                  vectorModel: { model: recoveringKnowledge.vectorModel }
                },
                collection: {
                  id: recoveringKnowledge.collectionId,
                  name: recoveringKnowledge.name,
                  avatar: '/imgs/workflow/db.png'
                }
              }
            : undefined
        }
        onClose={() => {
          setRecoveringKnowledge(undefined);
          knowledgeCreateDisclosure.onClose();
        }}
        onCreate={createKnowledge}
      />
      <ProductCreateModal
        isOpen={productCreateDisclosure.isOpen}
        catalog={catalog}
        onClose={productCreateDisclosure.onClose}
        onCreate={createProduct}
      />
      <Modal
        isOpen={knowledgeDraftDisclosure.isOpen}
        onClose={() => {
          knowledgeDraftDisclosure.onClose();
          setDraftOperation(undefined);
          setDraftDataset(undefined);
        }}
        size="xl"
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>转为知识草稿</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="myGray.500" fontSize="sm">
              系统会把问题和修订后的参考答案写入 FastGPT 知识库，并进入正常审核流程。
            </Text>
            <Stack mt={5} spacing={4}>
              <FormControl>
                <FormLabel>问题</FormLabel>
                <Box p={3} bg="myGray.50" borderRadius="md">
                  {draftOperation?.question || '客服未解决问题'}
                </Box>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>保存到知识库</FormLabel>
                <DatasetResourceSelect
                  value={draftDataset}
                  onChange={setDraftDataset}
                  title="选择目标知识库"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>参考答案</FormLabel>
                <Textarea
                  minH="180px"
                  value={draftAnswer}
                  onChange={(event) => setDraftAnswer(event.target.value)}
                  placeholder="请确认或修订正确答案，避免把错误回答直接沉淀为知识。"
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="whiteBase" onClick={knowledgeDraftDisclosure.onClose}>
              取消
            </Button>
            <Button
              isLoading={saving}
              isDisabled={!draftDataset || !draftAnswer.trim()}
              onClick={() => void createKnowledgeFromOperation()}
            >
              创建草稿
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal isOpen={roleDisclosure.isOpen} onClose={roleDisclosure.onClose} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>配置客服岗位</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text color="myGray.500" fontSize="sm">
              一个成员只保留一个有效客服岗位，避免知识编辑人员同时审核自己的资料。
            </Text>
            <Stack mt={5} spacing={4}>
              <FormControl isRequired>
                <FormLabel>团队成员</FormLabel>
                <Select value={roleTmbId} onChange={(event) => setRoleTmbId(event.target.value)}>
                  <option value="">请选择成员</option>
                  {roleMembers.map((member) => (
                    <option key={member.tmbId} value={member.tmbId}>
                      {member.name}
                      {member.customerServiceRole
                        ? `（当前：${memberRoleMap[member.customerServiceRole]}）`
                        : ''}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>客服岗位</FormLabel>
                <Select
                  value={roleType}
                  onChange={(event) =>
                    setRoleType(event.target.value as CustomerServiceMemberRoleEnum)
                  }
                >
                  {Object.values(CustomerServiceMemberRoleEnum).map((role) => (
                    <option key={role} value={role}>
                      {memberRoleMap[role]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>调整原因</FormLabel>
                <Textarea
                  value={roleReason}
                  onChange={(event) => setRoleReason(event.target.value)}
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="whiteBase" onClick={roleDisclosure.onClose}>
              取消
            </Button>
            <Button
              colorScheme="red"
              variant="outline"
              isLoading={saving}
              isDisabled={!roleTmbId || !roleReason.trim()}
              onClick={() => void saveMemberRole(CustomerServiceResourceStatusEnum.inactive)}
            >
              停用岗位
            </Button>
            <Button
              isLoading={saving}
              isDisabled={!roleTmbId || !roleReason.trim()}
              onClick={() => void saveMemberRole()}
            >
              保存岗位
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <Modal
        isOpen={!!bindingModelId}
        onClose={() => {
          setBindingModelId('');
          setBindingDataset(undefined);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>绑定产品知识库</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} color="myGray.500" fontSize="sm">
              为 {modelMap.get(bindingModelId)?.name || '当前产品'} 选择需要参与客服问答的知识库。
            </Text>
            <DatasetResourceSelect
              value={bindingDataset}
              onChange={setBindingDataset}
              title="选择产品知识库"
            />
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="whiteBase" onClick={() => setBindingModelId('')}>
              取消
            </Button>
            <Button
              colorScheme="blue"
              isLoading={saving}
              isDisabled={!bindingDataset}
              onClick={() => void bindModelDataset()}
            >
              确认绑定
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Flex>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}

export default CustomerServiceConsolePage;
