import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useDisclosure, useToast } from '@chakra-ui/react';
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
  CustomerServiceAdminMeResponse,
  CustomerServiceAdminOperationListResponse,
  CustomerServiceAdminProductCreateBody,
  CustomerServiceAdminProductListResponse,
  CustomerServiceAdminProjectListResponse,
  CustomerServiceAdminRoleMemberListResponse,
  CustomerServiceAdminRoleListResponse,
  CustomerServiceAdminUnregisteredKnowledgeListResponse
} from '@fastgpt/global/openapi/customerService/api';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import type {
  AdminApiResponse,
  ConsoleSection,
  KnowledgeDraftSource,
  KnowledgeItem,
  OperationItem,
  UnregisteredKnowledge
} from './types';

export const emptyCatalog: CustomerServiceAdminProductListResponse = {
  categories: [],
  series: [],
  models: [],
  versions: []
};

export const emptyProjects: CustomerServiceAdminProjectListResponse = {
  projects: [],
  keyBindings: []
};

export const statusMap: Record<string, { label: string; color: string }> = {
  active: { label: '运行中', color: 'green' },
  inactive: { label: '已停用', color: 'gray' },
  discontinued: { label: '已停产', color: 'orange' },
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待审核', color: 'orange' },
  rejected: { label: '已驳回', color: 'red' },
  published: { label: '已发布', color: 'green' },
  offline: { label: '已下架', color: 'gray' }
};

export const knowledgeTypeMap: Record<CustomerServiceKnowledgeTypeEnum, string> = {
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

export const audienceMap: Record<CustomerServiceAudienceEnum, string> = {
  [CustomerServiceAudienceEnum.public]: '普通客户',
  [CustomerServiceAudienceEnum.dealer]: '经销商',
  [CustomerServiceAudienceEnum.internal]: '内部售后'
};

export const memberRoleMap: Record<CustomerServiceMemberRoleEnum, string> = {
  [CustomerServiceMemberRoleEnum.customerServiceAdmin]: '客服管理员',
  [CustomerServiceMemberRoleEnum.knowledgeEditor]: '知识编辑',
  [CustomerServiceMemberRoleEnum.knowledgeReviewer]: '知识审核'
};

export const sectionConfig: Array<{
  key: ConsoleSection;
  label: string;
  description: string;
  icon: any;
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

/** 调用客服管理接口，并统一解析 FastGPT 响应。 */
export const requestAdminApi = async <T,>({
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
  const payload = (await response.json()) as AdminApiResponse<T>;
  if (!response.ok || payload.code !== 200) {
    throw new Error(payload.message || `HTTP ${response.status}`);
  }
  return payload.data;
};

interface CustomerServiceContextType {
  loading: boolean;
  saving: boolean;
  catalog: CustomerServiceAdminProductListResponse;
  currentMember?: CustomerServiceAdminMeResponse;
  systemHealth?: CustomerServiceAdminHealthResponse;
  knowledge: CustomerServiceAdminKnowledgeListResponse;
  unregisteredKnowledge: CustomerServiceAdminUnregisteredKnowledgeListResponse;
  recoveringKnowledge?: UnregisteredKnowledge;
  setRecoveringKnowledge: (item?: UnregisteredKnowledge) => void;
  projectData: CustomerServiceAdminProjectListResponse;
  roles: CustomerServiceAdminRoleListResponse;
  roleMembers: CustomerServiceAdminRoleMemberListResponse;
  roleTmbId: string;
  setRoleTmbId: (id: string) => void;
  roleType: CustomerServiceMemberRoleEnum;
  setRoleType: (role: CustomerServiceMemberRoleEnum) => void;
  roleReason: string;
  setRoleReason: (reason: string) => void;
  todoCounts: { unresolved: number; noAnswer: number; human: number };
  operations: CustomerServiceAdminOperationListResponse;
  frequentQuestions: CustomerServiceAdminFrequentQuestionListResponse;
  operationLoading: boolean;
  operationPage: number;
  setOperationPage: (page: number) => void;
  operationFeedback: string;
  setOperationFeedback: (val: string) => void;
  operationProjectId: string;
  setOperationProjectId: (val: string) => void;
  operationSeriesId: string;
  setOperationSeriesId: (val: string) => void;
  operationModelId: string;
  setOperationModelId: (val: string) => void;
  operationResultStatus: string;
  setOperationResultStatus: (val: string) => void;
  operationStartTime: string;
  setOperationStartTime: (val: string) => void;
  operationEndTime: string;
  setOperationEndTime: (val: string) => void;
  operationKeyword: string;
  setOperationKeyword: (val: string) => void;
  draftOperation?: KnowledgeDraftSource;
  setDraftOperation: (item?: KnowledgeDraftSource) => void;
  draftDataset?: SelectedDatasetType;
  setDraftDataset: (dataset?: SelectedDatasetType) => void;
  draftAnswer: string;
  setDraftAnswer: (val: string) => void;
  bindingModelId: string;
  setBindingModelId: (id: string) => void;
  bindingDataset?: SelectedDatasetType;
  setBindingDataset: (dataset?: SelectedDatasetType) => void;

  // Modals / Disclosures
  createDisclosure: ReturnType<typeof useDisclosure>;
  knowledgeCreateDisclosure: ReturnType<typeof useDisclosure>;
  productCreateDisclosure: ReturnType<typeof useDisclosure>;
  knowledgeDraftDisclosure: ReturnType<typeof useDisclosure>;
  roleDisclosure: ReturnType<typeof useDisclosure>;

  // Derived Maps
  modelMap: Map<string, CustomerServiceAdminProductListResponse['models'][number]>;
  seriesMap: Map<string, CustomerServiceAdminProductListResponse['series'][number]>;
  categoryMap: Map<string, CustomerServiceAdminProductListResponse['categories'][number]>;
  datasetNameMap: Map<string, string>;
  pendingKnowledge: KnowledgeItem[];
  publishedKnowledge: KnowledgeItem[];
  trainingErrors: KnowledgeItem[];
  unsyncedProjects: CustomerServiceAdminProjectListResponse['projects'];
  activeProjects: CustomerServiceAdminProjectListResponse['projects'];
  boundProjectIds: Set<string>;
  visibleSectionConfig: typeof sectionConfig;
  section: ConsoleSection;

  // Actions
  fetchData: () => Promise<
    readonly [
      CustomerServiceAdminMeResponse,
      CustomerServiceAdminProductListResponse,
      CustomerServiceAdminHealthResponse,
      CustomerServiceAdminKnowledgeListResponse,
      CustomerServiceAdminProjectListResponse,
      CustomerServiceAdminRoleListResponse,
      CustomerServiceAdminUnregisteredKnowledgeListResponse,
      CustomerServiceAdminOperationListResponse,
      CustomerServiceAdminFrequentQuestionListResponse,
      [
        CustomerServiceAdminOperationListResponse,
        CustomerServiceAdminOperationListResponse,
        CustomerServiceAdminOperationListResponse
      ]
    ]
  >;
  loadData: () => Promise<void>;
  loadOperations: (pageNum?: number) => Promise<void>;
  navigateSection: (nextSection: ConsoleSection) => void;
  runAction: (action: () => Promise<unknown>, successText?: string) => Promise<void>;
  knowledgeAction: (
    url: 'submit' | 'review' | 'offline',
    knowledgeId: string,
    action?: 'publish' | 'reject',
    customReason?: string
  ) => Promise<void>;
  createKnowledge: (body: CustomerServiceAdminKnowledgeCreateBody) => Promise<void>;
  createProduct: (body: CustomerServiceAdminProductCreateBody) => Promise<void>;
  openKnowledgeDraft: (item: KnowledgeDraftSource) => void;
  createKnowledgeFromOperation: () => Promise<void>;
  openRoleManager: () => Promise<void>;
  saveMemberRole: (status?: CustomerServiceResourceStatusEnum) => Promise<void>;
  openDatasetBinding: (modelId: string) => void;
  bindModelDataset: () => Promise<void>;
  toggleProductModelStatus: (
    modelId: string,
    status: CustomerServiceProductStatusEnum
  ) => Promise<void>;
}

const CustomerServiceContext = createContext<CustomerServiceContextType | null>(null);

export const CustomerServiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
        setOperationPage(pageNum);
        setOperations(nextOperations);
        setFrequentQuestions(nextFrequentQuestions);
      } catch (error) {
        toast({
          status: 'error',
          title: error instanceof Error ? error.message : '运营数据加载失败'
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
    fetchData()
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

  const pendingKnowledge = useMemo(
    () => knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.pending),
    [knowledge]
  );
  const publishedKnowledge = useMemo(
    () => knowledge.filter((item) => item.status === CustomerServiceKnowledgeStatusEnum.published),
    [knowledge]
  );
  const trainingErrors = useMemo(
    () => knowledge.filter((item) => item.trainingStatus === 'error'),
    [knowledge]
  );
  const unsyncedProjects = useMemo(
    () => projectData.projects.filter((item) => item.workflowReadiness.status !== 'ready'),
    [projectData.projects]
  );
  const activeProjects = useMemo(
    () => projectData.projects.filter((item) => item.deliveryReadiness.ready),
    [projectData.projects]
  );
  const boundProjectIds = useMemo(
    () =>
      new Set(
        projectData.keyBindings
          .filter((item) => item.status === CustomerServiceResourceStatusEnum.active)
          .map((item) => item.projectId)
      ),
    [projectData.keyBindings]
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

  const knowledgeAction = async (
    url: 'submit' | 'review' | 'offline',
    knowledgeId: string,
    action?: 'publish' | 'reject',
    customReason?: string
  ) => {
    const needsReason = action === 'reject' || url === 'offline';
    let reason = customReason ?? '';
    if (needsReason && !reason) {
      reason = window.prompt('请输入处理原因')?.trim() ?? '';
      if (!reason) return;
    }
    await runAction(
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
    setDraftAnswer(item.answer || '');
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
          method: 'POST',
          body: { tmbId: roleTmbId, role: roleType, reason: roleReason, status }
        }),
      status === CustomerServiceResourceStatusEnum.active ? '客服岗位已保存' : '客服岗位已停用'
    );
    roleDisclosure.onClose();
  };

  const openDatasetBinding = (modelId: string) => {
    setBindingModelId(modelId);
    setBindingDataset(undefined);
  };

  const bindModelDataset = async () => {
    if (!bindingModelId || !bindingDataset) return;
    const currentModel = modelMap.get(bindingModelId);
    if (!currentModel) return;
    const nextDatasetIds = Array.from(
      new Set([...currentModel.datasetIds, bindingDataset.datasetId])
    );
    await runAction(
      () =>
        requestAdminApi({
          url: '/api/customer-service/admin/product/update',
          method: 'PUT',
          body: {
            resourceType: 'model',
            id: bindingModelId,
            datasetIds: nextDatasetIds
          }
        }),
      '知识库已绑定到产品型号'
    );
    setBindingModelId('');
    setBindingDataset(undefined);
  };

  const toggleProductModelStatus = async (
    modelId: string,
    currentStatus: CustomerServiceProductStatusEnum
  ) => {
    const nextStatus =
      currentStatus === CustomerServiceProductStatusEnum.active
        ? CustomerServiceProductStatusEnum.inactive
        : CustomerServiceProductStatusEnum.active;
    await runAction(
      () =>
        requestAdminApi({
          url: '/api/customer-service/admin/product/update',
          method: 'PUT',
          body: { resourceType: 'model', id: modelId, status: nextStatus }
        }),
      nextStatus === CustomerServiceProductStatusEnum.active ? '产品已启用' : '产品已停用'
    );
  };

  const value = {
    loading,
    saving,
    catalog,
    currentMember,
    systemHealth,
    knowledge,
    unregisteredKnowledge,
    recoveringKnowledge,
    setRecoveringKnowledge,
    projectData,
    roles,
    roleMembers,
    roleTmbId,
    setRoleTmbId,
    roleType,
    setRoleType,
    roleReason,
    setRoleReason,
    todoCounts,
    operations,
    frequentQuestions,
    operationLoading,
    operationPage,
    setOperationPage,
    operationFeedback,
    setOperationFeedback,
    operationProjectId,
    setOperationProjectId,
    operationSeriesId,
    setOperationSeriesId,
    operationModelId,
    setOperationModelId,
    operationResultStatus,
    setOperationResultStatus,
    operationStartTime,
    setOperationStartTime,
    operationEndTime,
    setOperationEndTime,
    operationKeyword,
    setOperationKeyword,
    draftOperation,
    setDraftOperation,
    draftDataset,
    setDraftDataset,
    draftAnswer,
    setDraftAnswer,
    bindingModelId,
    setBindingModelId,
    bindingDataset,
    setBindingDataset,

    createDisclosure,
    knowledgeCreateDisclosure,
    productCreateDisclosure,
    knowledgeDraftDisclosure,
    roleDisclosure,

    modelMap,
    seriesMap,
    categoryMap,
    datasetNameMap,
    pendingKnowledge,
    publishedKnowledge,
    trainingErrors,
    unsyncedProjects,
    activeProjects,
    boundProjectIds,
    visibleSectionConfig,
    section,

    fetchData,
    loadData,
    loadOperations,
    navigateSection,
    runAction,
    knowledgeAction,
    createKnowledge,
    createProduct,
    openKnowledgeDraft,
    createKnowledgeFromOperation,
    openRoleManager,
    saveMemberRole,
    openDatasetBinding,
    bindModelDataset,
    toggleProductModelStatus
  };

  return (
    <CustomerServiceContext.Provider value={value}>{children}</CustomerServiceContext.Provider>
  );
};

export const useCustomerServiceContext = () => {
  const context = useContext(CustomerServiceContext);
  if (!context) {
    throw new Error('useCustomerServiceContext must be used within a CustomerServiceProvider');
  }
  return context;
};
