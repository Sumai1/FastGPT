import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Link,
  Select,
  SimpleGrid,
  Spinner,
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
import { useTranslation } from 'next-i18next';
import { serviceSideProps } from '@/web/common/i18n/utils';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceMemberRoleEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceResourceStatusEnum,
  CustomerServiceVersionTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceAdminKnowledgeListResponse,
  CustomerServiceAdminProductListResponse,
  CustomerServiceAdminProjectListResponse,
  CustomerServiceAdminRoleListResponse
} from '@fastgpt/global/openapi/customerService/api';

type ProductResourceType = 'category' | 'series' | 'model' | 'version';
type AdminResponse<T> = { code: number; message?: string; data: T };
type AdminProductItem =
  | CustomerServiceAdminProductListResponse['categories'][number]
  | CustomerServiceAdminProductListResponse['series'][number]
  | CustomerServiceAdminProductListResponse['models'][number]
  | CustomerServiceAdminProductListResponse['versions'][number];

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
const splitIds = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[\s,，]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
const formatDateInput = (value?: Date | string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : '';

/** 调用同源客服管理接口，并统一处理 FastGPT JSON 响应和权限错误。 */
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

const ResourceCard = ({
  title,
  subtitle,
  status,
  children
}: {
  title: string;
  subtitle?: string;
  status?: string;
  children?: React.ReactNode;
}) => (
  <Box borderWidth="1px" borderColor="myGray.200" borderRadius="md" bg="white" p={4}>
    <Flex gap={2} align="center" wrap="wrap">
      <Text fontWeight="600">{title}</Text>
      {status && (
        <Badge colorScheme={status === 'active' || status === 'published' ? 'green' : 'gray'}>
          {status}
        </Badge>
      )}
    </Flex>
    {subtitle && (
      <Text mt={1} color="myGray.500" fontSize="sm" wordBreak="break-all">
        {subtitle}
      </Text>
    )}
    {children && (
      <Flex mt={3} gap={2} wrap="wrap">
        {children}
      </Flex>
    )}
  </Box>
);

/**
 * 客服管理台只维护客服新增的引用和规则；App、dataset、collection、Key 的创建继续进入 FastGPT
 * 原管理页面完成，避免复制已有能力。
 */
const CustomerServiceAdminPage = () => {
  const { t } = useTranslation('customer_service');
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState(emptyCatalog);
  const [knowledge, setKnowledge] = useState<CustomerServiceAdminKnowledgeListResponse>([]);
  const [projectData, setProjectData] = useState(emptyProjects);
  const [roles, setRoles] = useState<CustomerServiceAdminRoleListResponse>([]);

  const [productType, setProductType] = useState<ProductResourceType>('category');
  const [productEditId, setProductEditId] = useState('');
  const [productParentId, setProductParentId] = useState('');
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [productAliases, setProductAliases] = useState('');
  const [productDatasetIds, setProductDatasetIds] = useState('');
  const [productEffectiveFrom, setProductEffectiveFrom] = useState('');
  const [productEffectiveTo, setProductEffectiveTo] = useState('');
  const [versionType, setVersionType] = useState(CustomerServiceVersionTypeEnum.hardware);

  const [knowledgeDatasetId, setKnowledgeDatasetId] = useState('');
  const [knowledgeEditId, setKnowledgeEditId] = useState('');
  const [knowledgeCollectionId, setKnowledgeCollectionId] = useState('');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeType, setKnowledgeType] = useState(CustomerServiceKnowledgeTypeEnum.faq);
  const [knowledgeAudience, setKnowledgeAudience] = useState(CustomerServiceAudienceEnum.public);
  const [knowledgeModelIds, setKnowledgeModelIds] = useState('');
  const [knowledgeHardwareVersionIds, setKnowledgeHardwareVersionIds] = useState('');
  const [knowledgeSoftwareVersionIds, setKnowledgeSoftwareVersionIds] = useState('');
  const [knowledgeEffectiveFrom, setKnowledgeEffectiveFrom] = useState('');
  const [knowledgeEffectiveTo, setKnowledgeEffectiveTo] = useState('');
  const [knowledgePreviousId, setKnowledgePreviousId] = useState('');

  const [projectAppId, setProjectAppId] = useState('');
  const [projectEditId, setProjectEditId] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectModelIds, setProjectModelIds] = useState('');
  const [projectAudience, setProjectAudience] = useState(CustomerServiceAudienceEnum.public);
  const [projectWelcome, setProjectWelcome] = useState('');
  const [projectQuestions, setProjectQuestions] = useState('');
  const [projectHumanName, setProjectHumanName] = useState('人工客服');
  const [projectPhone, setProjectPhone] = useState('');
  const [projectHumanUrl, setProjectHumanUrl] = useState('');
  const [projectWorkTime, setProjectWorkTime] = useState('');
  const [projectRetentionDays, setProjectRetentionDays] = useState('180');
  const [projectLowThreshold, setProjectLowThreshold] = useState('0.45');
  const [projectLowMaxCount, setProjectLowMaxCount] = useState('2');
  const [projectMaxAnswerTokens, setProjectMaxAnswerTokens] = useState('600');
  const [projectDangerousKeywords, setProjectDangerousKeywords] = useState('');
  const [projectDisputeKeywords, setProjectDisputeKeywords] = useState('');
  const [projectComplaintKeywords, setProjectComplaintKeywords] = useState('');
  const [projectHumanKeywords, setProjectHumanKeywords] = useState('');

  const [bindingProjectId, setBindingProjectId] = useState('');
  const [bindingKeyId, setBindingKeyId] = useState('');
  const [bindingAudience, setBindingAudience] = useState(CustomerServiceAudienceEnum.public);
  const [bindingOrigins, setBindingOrigins] = useState('');
  const [bindingRateSeconds, setBindingRateSeconds] = useState('60');
  const [bindingRateLimit, setBindingRateLimit] = useState('60');

  const [roleTmbId, setRoleTmbId] = useState('');
  const [role, setRole] = useState(CustomerServiceMemberRoleEnum.knowledgeEditor);
  const [roleStatus, setRoleStatus] = useState(CustomerServiceResourceStatusEnum.active);
  const [roleReason, setRoleReason] = useState('');
  const defaultTabIndex = (() => {
    if (router.query.tab === 'knowledge') return 1;
    if (router.query.tab === 'projects') return 2;
    if (router.query.tab === 'roles') return 3;
    return 0;
  })();

  const fetchData = useCallback(
    () =>
      Promise.all([
        requestAdminApi<CustomerServiceAdminProductListResponse>({
          url: '/api/customer-service/admin/product/list'
        }),
        requestAdminApi<CustomerServiceAdminKnowledgeListResponse>({
          url: '/api/customer-service/admin/knowledge/list',
          method: 'POST',
          body: {}
        }),
        requestAdminApi<CustomerServiceAdminProjectListResponse>({
          url: '/api/customer-service/admin/project/list'
        }),
        requestAdminApi<CustomerServiceAdminRoleListResponse>({
          url: '/api/customer-service/admin/role/list'
        })
      ]),
    []
  );

  const applyData = useCallback(
    ([nextCatalog, nextKnowledge, nextProjects, nextRoles]: Awaited<
      ReturnType<typeof fetchData>
    >) => {
      setCatalog(nextCatalog);
      setKnowledge(nextKnowledge);
      setProjectData(nextProjects);
      setRoles(nextRoles);
      setBindingProjectId((current) => current || nextProjects.projects[0]?.id || '');
    },
    []
  );

  const showLoadError = useCallback(
    (error: unknown) => {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : t('admin_load_failed')
      });
    },
    [t, toast]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      applyData(await fetchData());
    } catch (error) {
      showLoadError(error);
    } finally {
      setLoading(false);
    }
  }, [applyData, fetchData, showLoadError]);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then((data) => {
        if (active) applyData(data);
      })
      .catch((error) => {
        if (active) showLoadError(error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyData, fetchData, showLoadError]);

  const runAction = async (action: () => Promise<unknown>) => {
    setSaving(true);
    try {
      await action();
      toast({ status: 'success', title: t('admin_saved') });
      await loadData();
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : t('admin_save_failed')
      });
    } finally {
      setSaving(false);
    }
  };

  const resetProductForm = () => {
    setProductEditId('');
    setProductParentId('');
    setProductCode('');
    setProductName('');
    setProductAliases('');
    setProductDatasetIds('');
    setProductEffectiveFrom('');
    setProductEffectiveTo('');
  };

  const saveProduct = () =>
    runAction(async () => {
      const common = {
        resourceType: productType,
        name: productName,
        aliases: splitIds(productAliases),
        description: ''
      };
      const body = (() => {
        if (productType === 'category') return { ...common, code: productCode, sortOrder: 0 };
        if (productType === 'series') {
          return { ...common, categoryId: productParentId, code: productCode, sortOrder: 0 };
        }
        if (productType === 'model') {
          return {
            ...common,
            seriesId: productParentId,
            modelCode: productCode,
            datasetIds: splitIds(productDatasetIds),
            sortOrder: 0
          };
        }
        return {
          ...common,
          modelId: productParentId,
          type: versionType,
          versionCode: productCode,
          ...(productEffectiveFrom && { effectiveFrom: productEffectiveFrom }),
          ...(productEffectiveTo && { effectiveTo: productEffectiveTo })
        };
      })();
      await requestAdminApi({
        url: productEditId
          ? '/api/customer-service/admin/product/update'
          : '/api/customer-service/admin/product/create',
        method: productEditId ? 'PUT' : 'POST',
        body: productEditId
          ? {
              resourceType: productType,
              id: productEditId,
              code: productCode,
              name: productName,
              aliases: splitIds(productAliases),
              ...(productType === 'version' && {
                effectiveFrom: productEffectiveFrom || null,
                effectiveTo: productEffectiveTo || null
              })
            }
          : body
      });
      if (productEditId && productType === 'model') {
        await requestAdminApi({
          url: '/api/customer-service/admin/product/bindDatasets',
          method: 'PUT',
          body: { modelId: productEditId, datasetIds: splitIds(productDatasetIds) }
        });
      }
      resetProductForm();
    });

  /** 回填产品公共字段；父级和版本类型是稳定标识，编辑时不允许直接迁移。 */
  const editProduct = ({
    resourceType,
    item,
    code
  }: {
    resourceType: ProductResourceType;
    item: AdminProductItem;
    code: string;
  }) => {
    setProductType(resourceType);
    setProductEditId(item.id);
    setProductCode(code);
    setProductName(item.name);
    setProductAliases(item.aliases.join(','));
    setProductParentId(
      'categoryId' in item
        ? item.categoryId
        : 'seriesId' in item
          ? item.seriesId
          : 'modelId' in item
            ? item.modelId
            : ''
    );
    setProductDatasetIds('datasetIds' in item ? item.datasetIds.join(',') : '');
    if ('type' in item) setVersionType(item.type);
    setProductEffectiveFrom('effectiveFrom' in item ? formatDateInput(item.effectiveFrom) : '');
    setProductEffectiveTo('effectiveTo' in item ? formatDateInput(item.effectiveTo) : '');
  };

  const updateProductStatus = (resourceType: ProductResourceType, id: string, status: string) =>
    runAction(() =>
      requestAdminApi({
        url: '/api/customer-service/admin/product/update',
        method: 'PUT',
        body: { resourceType, id, status }
      })
    );

  const bindModelDatasets = (modelId: string, current: string[]) => {
    const value = window.prompt(t('admin_dataset_ids_prompt'), current.join(','));
    if (value === null) return;
    void runAction(() =>
      requestAdminApi({
        url: '/api/customer-service/admin/product/bindDatasets',
        method: 'PUT',
        body: { modelId, datasetIds: splitIds(value) }
      })
    );
  };

  const resetKnowledgeForm = () => {
    setKnowledgeEditId('');
    setKnowledgeDatasetId('');
    setKnowledgeCollectionId('');
    setKnowledgeTitle('');
    setKnowledgeType(CustomerServiceKnowledgeTypeEnum.faq);
    setKnowledgeAudience(CustomerServiceAudienceEnum.public);
    setKnowledgeModelIds('');
    setKnowledgeHardwareVersionIds('');
    setKnowledgeSoftwareVersionIds('');
    setKnowledgeEffectiveFrom('');
    setKnowledgeEffectiveTo('');
    setKnowledgePreviousId('');
  };

  const saveKnowledge = () =>
    runAction(async () => {
      const governanceFields = {
        title: knowledgeTitle,
        sourceName: '',
        knowledgeType,
        audienceLevel: knowledgeAudience,
        modelIds: splitIds(knowledgeModelIds),
        hardwareVersionIds: splitIds(knowledgeHardwareVersionIds),
        softwareVersionIds: splitIds(knowledgeSoftwareVersionIds),
        effectiveFrom: knowledgeEffectiveFrom || null,
        effectiveTo: knowledgeEffectiveTo || null
      };
      await requestAdminApi({
        url: knowledgeEditId
          ? '/api/customer-service/admin/knowledge/update'
          : '/api/customer-service/admin/knowledge/create',
        method: knowledgeEditId ? 'PUT' : 'POST',
        body: knowledgeEditId
          ? { knowledgeId: knowledgeEditId, ...governanceFields }
          : {
              datasetId: knowledgeDatasetId,
              collectionId: knowledgeCollectionId,
              ...governanceFields,
              ...(knowledgePreviousId && { previousKnowledgeId: knowledgePreviousId })
            }
      });
      resetKnowledgeForm();
    });

  const editKnowledge = (item: CustomerServiceAdminKnowledgeListResponse[number]) => {
    setKnowledgeEditId(item.id);
    setKnowledgeDatasetId(item.datasetId);
    setKnowledgeCollectionId(item.collectionId);
    setKnowledgeTitle(item.title);
    setKnowledgeType(item.knowledgeType);
    setKnowledgeAudience(item.audienceLevel);
    setKnowledgeModelIds(item.modelIds.join(','));
    setKnowledgeHardwareVersionIds(item.hardwareVersionIds.join(','));
    setKnowledgeSoftwareVersionIds(item.softwareVersionIds.join(','));
    setKnowledgeEffectiveFrom(formatDateInput(item.effectiveFrom));
    setKnowledgeEffectiveTo(formatDateInput(item.effectiveTo));
    setKnowledgePreviousId(item.previousKnowledgeId || '');
  };

  const knowledgeAction = (
    url: 'submit' | 'review' | 'offline',
    knowledgeId: string,
    action?: 'publish' | 'reject'
  ) => {
    let reason = '';
    if (action === 'reject' || url === 'offline') {
      reason = window.prompt(t('admin_reason_prompt'))?.trim() || '';
      if (!reason) return;
    }
    void runAction(() =>
      requestAdminApi({
        url: `/api/customer-service/admin/knowledge/${url}`,
        method: 'POST',
        body: { knowledgeId, ...(action && { action }), ...(reason && { reason }) }
      })
    );
  };

  const resetProjectForm = () => {
    setProjectEditId('');
    setProjectAppId('');
    setProjectCode('');
    setProjectName('');
    setProjectModelIds('');
    setProjectAudience(CustomerServiceAudienceEnum.public);
    setProjectWelcome('');
    setProjectQuestions('');
    setProjectHumanName('人工客服');
    setProjectPhone('');
    setProjectHumanUrl('');
    setProjectWorkTime('');
    setProjectRetentionDays('180');
    setProjectLowThreshold('0.45');
    setProjectLowMaxCount('2');
    setProjectMaxAnswerTokens('600');
    setProjectDangerousKeywords('');
    setProjectDisputeKeywords('');
    setProjectComplaintKeywords('');
    setProjectHumanKeywords('');
  };

  const saveProject = () =>
    runAction(async () => {
      const commonBody = {
        name: projectName,
        modelIds: splitIds(projectModelIds),
        defaultAudience: projectAudience,
        welcomeText: projectWelcome,
        recommendedQuestions: projectQuestions
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        humanContact: {
          name: projectHumanName,
          ...(projectPhone && { phone: projectPhone }),
          ...(projectHumanUrl && { url: projectHumanUrl }),
          ...(projectWorkTime && { workTime: projectWorkTime })
        },
        ruleConfig: {
          lowConfidenceThreshold: Number(projectLowThreshold),
          lowConfidenceMaxCount: Number(projectLowMaxCount),
          maxAnswerTokens: Number(projectMaxAnswerTokens),
          dangerousKeywords: splitIds(projectDangerousKeywords),
          disputeKeywords: splitIds(projectDisputeKeywords),
          complaintKeywords: splitIds(projectComplaintKeywords),
          humanRequestKeywords: splitIds(projectHumanKeywords)
        },
        sessionRetentionDays: Number(projectRetentionDays)
      };
      await requestAdminApi({
        url: projectEditId
          ? '/api/customer-service/admin/project/update'
          : '/api/customer-service/admin/project/create',
        method: projectEditId ? 'PUT' : 'POST',
        body: projectEditId
          ? { projectId: projectEditId, ...commonBody }
          : { appId: projectAppId, projectCode, ...commonBody }
      });
      resetProjectForm();
    });

  /** 将已有项目完整回填到表单，避免局部编辑意外覆盖其他规则。 */
  const editProject = (item: CustomerServiceAdminProjectListResponse['projects'][number]) => {
    setProjectEditId(item.id);
    setProjectAppId(item.appId);
    setProjectCode(item.projectCode);
    setProjectName(item.name);
    setProjectModelIds(item.modelIds.join(','));
    setProjectAudience(item.defaultAudience);
    setProjectWelcome(item.welcomeText);
    setProjectQuestions(item.recommendedQuestions.join('\n'));
    setProjectHumanName(item.humanContact.name);
    setProjectPhone(item.humanContact.phone || '');
    setProjectHumanUrl(item.humanContact.url || '');
    setProjectWorkTime(item.humanContact.workTime || '');
    setProjectRetentionDays(String(item.sessionRetentionDays ?? 180));
    setProjectLowThreshold(String(item.ruleConfig.lowConfidenceThreshold));
    setProjectLowMaxCount(String(item.ruleConfig.lowConfidenceMaxCount));
    setProjectMaxAnswerTokens(String(item.ruleConfig.maxAnswerTokens));
    setProjectDangerousKeywords(item.ruleConfig.dangerousKeywords.join(','));
    setProjectDisputeKeywords(item.ruleConfig.disputeKeywords.join(','));
    setProjectComplaintKeywords(item.ruleConfig.complaintKeywords.join(','));
    setProjectHumanKeywords(item.ruleConfig.humanRequestKeywords.join(','));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const bindKey = () =>
    runAction(() =>
      requestAdminApi({
        url: '/api/customer-service/admin/project/bindKey',
        method: 'POST',
        body: {
          projectId: bindingProjectId,
          openApiKeyId: bindingKeyId,
          maxAudience: bindingAudience,
          allowedOrigins: splitIds(bindingOrigins),
          rateLimit: {
            seconds: Number(bindingRateSeconds),
            limit: Number(bindingRateLimit)
          }
        }
      })
    );

  const updateKeyStatus = (bindingId: string, status: CustomerServiceResourceStatusEnum) => {
    const nextStatus =
      status === CustomerServiceResourceStatusEnum.active
        ? CustomerServiceResourceStatusEnum.inactive
        : CustomerServiceResourceStatusEnum.active;
    const reason =
      nextStatus === CustomerServiceResourceStatusEnum.inactive
        ? window.prompt(t('admin_reason_prompt'))?.trim() || ''
        : '';
    if (nextStatus === CustomerServiceResourceStatusEnum.inactive && !reason) return;
    void runAction(() =>
      requestAdminApi({
        url: '/api/customer-service/admin/project/updateKey',
        method: 'PUT',
        body: { bindingId, status: nextStatus, reason }
      })
    );
  };

  const setMemberRole = () =>
    runAction(async () => {
      await requestAdminApi({
        url: '/api/customer-service/admin/role/set',
        method: 'PUT',
        body: {
          tmbId: roleTmbId,
          role,
          status: roleStatus,
          reason: roleReason
        }
      });
      setRoleTmbId('');
      setRoleReason('');
    });

  const statusButton = (resourceType: ProductResourceType, id: string, status: string) => (
    <Button
      size="xs"
      isDisabled={saving}
      onClick={() =>
        void updateProductStatus(
          resourceType,
          id,
          status === CustomerServiceResourceStatusEnum.active
            ? CustomerServiceResourceStatusEnum.inactive
            : CustomerServiceResourceStatusEnum.active
        )
      }
    >
      {status === CustomerServiceResourceStatusEnum.active ? t('admin_disable') : t('admin_enable')}
    </Button>
  );

  return (
    <Box minH="100%" bg="myGray.50" p={{ base: 4, md: 8 }}>
      <Head>
        <title>{t('admin_title')}</title>
      </Head>
      <Flex mb={6} justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Heading size="md">{t('admin_title')}</Heading>
          <Text mt={2} color="myGray.500">
            {t('admin_description')}
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap">
          <Button variant="whitePrimary" onClick={() => void router.push('/customer-service')}>
            {t('admin_open_chat')}
          </Button>
          <Button onClick={() => void loadData()}>{t('admin_refresh')}</Button>
        </Flex>
      </Flex>

      {loading ? (
        <Flex h="300px" justify="center" align="center">
          <Spinner />
        </Flex>
      ) : (
        <Tabs
          key={defaultTabIndex}
          defaultIndex={defaultTabIndex}
          colorScheme="blue"
          variant="enclosed"
        >
          <TabList overflowX="auto">
            <Tab>{t('admin_products')}</Tab>
            <Tab>{t('admin_knowledge')}</Tab>
            <Tab>{t('admin_projects')}</Tab>
            <Tab>{t('admin_roles')}</Tab>
          </TabList>
          <TabPanels bg="white" borderRadius="0 0 8px 8px">
            <TabPanel>
              <Stack spacing={6}>
                <Box>
                  <Heading size="sm" mb={3}>
                    {productEditId ? t('admin_edit_product') : t('admin_create_product')}
                  </Heading>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                    <FormControl>
                      <FormLabel>{t('admin_resource_type')}</FormLabel>
                      <Select
                        value={productType}
                        isDisabled={!!productEditId}
                        onChange={(event) => {
                          setProductType(event.target.value as ProductResourceType);
                          setProductParentId('');
                        }}
                      >
                        {(['category', 'series', 'model', 'version'] as const).map((item) => (
                          <option key={item} value={item}>
                            {t(`admin_${item}`)}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    {productType !== 'category' && (
                      <FormControl>
                        <FormLabel>{t('admin_parent')}</FormLabel>
                        <Select
                          value={productParentId}
                          isDisabled={!!productEditId}
                          onChange={(event) => setProductParentId(event.target.value)}
                        >
                          <option value="">{t('admin_select')}</option>
                          {(productType === 'series'
                            ? catalog.categories
                            : productType === 'model'
                              ? catalog.series
                              : catalog.models
                          ).map((item) => (
                            <option key={item.id} value={item.id}>
                              {'modelCode' in item ? item.modelCode : item.code} - {item.name}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {productType === 'version' && (
                      <FormControl>
                        <FormLabel>{t('admin_version_type')}</FormLabel>
                        <Select
                          value={versionType}
                          isDisabled={!!productEditId}
                          onChange={(event) =>
                            setVersionType(event.target.value as CustomerServiceVersionTypeEnum)
                          }
                        >
                          {Object.values(CustomerServiceVersionTypeEnum).map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    <FormControl>
                      <FormLabel>{t('admin_code')}</FormLabel>
                      <Input
                        value={productCode}
                        onChange={(event) => setProductCode(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_name')}</FormLabel>
                      <Input
                        value={productName}
                        onChange={(event) => setProductName(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_aliases')}</FormLabel>
                      <Input
                        value={productAliases}
                        onChange={(event) => setProductAliases(event.target.value)}
                      />
                    </FormControl>
                    {productType === 'model' && (
                      <FormControl>
                        <FormLabel>{t('admin_dataset_ids')}</FormLabel>
                        <Input
                          value={productDatasetIds}
                          onChange={(event) => setProductDatasetIds(event.target.value)}
                        />
                      </FormControl>
                    )}
                    {productType === 'version' && (
                      <>
                        <FormControl>
                          <FormLabel>{t('admin_effective_from')}</FormLabel>
                          <Input
                            type="date"
                            value={productEffectiveFrom}
                            onChange={(event) => setProductEffectiveFrom(event.target.value)}
                          />
                        </FormControl>
                        <FormControl>
                          <FormLabel>{t('admin_effective_to')}</FormLabel>
                          <Input
                            type="date"
                            value={productEffectiveTo}
                            onChange={(event) => setProductEffectiveTo(event.target.value)}
                          />
                        </FormControl>
                      </>
                    )}
                  </SimpleGrid>
                  <Flex mt={4} gap={2}>
                    <Button
                      colorScheme="blue"
                      isLoading={saving}
                      isDisabled={
                        !productCode ||
                        !productName ||
                        (productType !== 'category' && !productParentId)
                      }
                      onClick={() => void saveProduct()}
                    >
                      {productEditId ? t('admin_save') : t('admin_create')}
                    </Button>
                    {productEditId && (
                      <Button onClick={resetProductForm}>{t('admin_cancel_edit')}</Button>
                    )}
                  </Flex>
                </Box>
                {[
                  {
                    type: 'category' as const,
                    title: t('admin_categories'),
                    items: catalog.categories
                  },
                  { type: 'series' as const, title: t('admin_series_list'), items: catalog.series },
                  { type: 'model' as const, title: t('admin_models'), items: catalog.models },
                  { type: 'version' as const, title: t('admin_versions'), items: catalog.versions }
                ].map((group) => (
                  <Box key={group.type}>
                    <Heading size="sm" mb={3}>
                      {group.title}
                    </Heading>
                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                      {group.items.map((item) => {
                        const code =
                          'modelCode' in item
                            ? item.modelCode
                            : 'versionCode' in item
                              ? item.versionCode
                              : item.code;
                        return (
                          <ResourceCard
                            key={item.id}
                            title={`${code} · ${item.name}`}
                            subtitle={item.id}
                            status={item.status}
                          >
                            {statusButton(group.type, item.id, item.status)}
                            <Button
                              size="xs"
                              onClick={() =>
                                editProduct({
                                  resourceType: group.type,
                                  item,
                                  code
                                })
                              }
                            >
                              {t('admin_edit')}
                            </Button>
                            {group.type === 'model' &&
                              item.status !== CustomerServiceProductStatusEnum.discontinued && (
                                <Button
                                  size="xs"
                                  onClick={() =>
                                    void runAction(() =>
                                      requestAdminApi({
                                        url: '/api/customer-service/admin/product/update',
                                        method: 'PUT',
                                        body: {
                                          resourceType: 'model',
                                          id: item.id,
                                          status: CustomerServiceProductStatusEnum.discontinued,
                                          discontinuedAt: new Date()
                                        }
                                      })
                                    )
                                  }
                                >
                                  {t('admin_discontinue')}
                                </Button>
                              )}
                            {group.type === 'model' && 'datasetIds' in item && (
                              <Button
                                size="xs"
                                onClick={() => bindModelDatasets(item.id, item.datasetIds)}
                              >
                                {t('admin_bind_datasets')}
                              </Button>
                            )}
                          </ResourceCard>
                        );
                      })}
                    </SimpleGrid>
                  </Box>
                ))}
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Box>
                  <Heading size="sm" mb={2}>
                    {knowledgeEditId ? t('admin_edit_knowledge') : t('admin_create_knowledge')}
                  </Heading>
                  <Text color="myGray.500" mb={3}>
                    {t('admin_knowledge_reuse_tip')}{' '}
                    <Link color="primary.600" href="/dataset/list">
                      {t('admin_open_datasets')}
                    </Link>
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                    <FormControl>
                      <FormLabel>Dataset ID</FormLabel>
                      <Input
                        value={knowledgeDatasetId}
                        isDisabled={!!knowledgeEditId}
                        onChange={(event) => setKnowledgeDatasetId(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Collection ID</FormLabel>
                      <Input
                        value={knowledgeCollectionId}
                        isDisabled={!!knowledgeEditId}
                        onChange={(event) => setKnowledgeCollectionId(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_title_field')}</FormLabel>
                      <Input
                        value={knowledgeTitle}
                        onChange={(event) => setKnowledgeTitle(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_knowledge_type')}</FormLabel>
                      <Select
                        value={knowledgeType}
                        onChange={(event) =>
                          setKnowledgeType(event.target.value as CustomerServiceKnowledgeTypeEnum)
                        }
                      >
                        {Object.values(CustomerServiceKnowledgeTypeEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_audience')}</FormLabel>
                      <Select
                        value={knowledgeAudience}
                        onChange={(event) =>
                          setKnowledgeAudience(event.target.value as CustomerServiceAudienceEnum)
                        }
                      >
                        {Object.values(CustomerServiceAudienceEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_model_ids')}</FormLabel>
                      <Input
                        value={knowledgeModelIds}
                        onChange={(event) => setKnowledgeModelIds(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_hardware_version_ids')}</FormLabel>
                      <Input
                        value={knowledgeHardwareVersionIds}
                        onChange={(event) => setKnowledgeHardwareVersionIds(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_software_version_ids')}</FormLabel>
                      <Input
                        value={knowledgeSoftwareVersionIds}
                        onChange={(event) => setKnowledgeSoftwareVersionIds(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_effective_from')}</FormLabel>
                      <Input
                        type="date"
                        value={knowledgeEffectiveFrom}
                        onChange={(event) => setKnowledgeEffectiveFrom(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_effective_to')}</FormLabel>
                      <Input
                        type="date"
                        value={knowledgeEffectiveTo}
                        onChange={(event) => setKnowledgeEffectiveTo(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_previous_knowledge_id')}</FormLabel>
                      <Input
                        value={knowledgePreviousId}
                        onChange={(event) => setKnowledgePreviousId(event.target.value)}
                      />
                    </FormControl>
                  </SimpleGrid>
                  <Flex mt={4} gap={2}>
                    <Button
                      colorScheme="blue"
                      isLoading={saving}
                      isDisabled={!knowledgeDatasetId || !knowledgeCollectionId || !knowledgeTitle}
                      onClick={() => void saveKnowledge()}
                    >
                      {knowledgeEditId ? t('admin_save') : t('admin_create')}
                    </Button>
                    {knowledgeEditId && (
                      <Button onClick={resetKnowledgeForm}>{t('admin_cancel_edit')}</Button>
                    )}
                  </Flex>
                </Box>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                  {knowledge.map((item) => (
                    <ResourceCard
                      key={item.id}
                      title={`${item.title} · v${item.version}`}
                      subtitle={`${item.datasetId} / ${item.collectionId}`}
                      status={item.status}
                    >
                      <Text w="100%" fontSize="xs" color="myGray.500">
                        {`${t('admin_audience')}: ${item.audienceLevel} · ${t('admin_model_ids')}: ${item.modelIds.join(',') || '-'} · ID: ${item.id}`}
                      </Text>
                      {item.reviewReason && (
                        <Text w="100%" fontSize="xs" color="red.600">
                          {item.reviewReason}
                        </Text>
                      )}
                      {(item.status === CustomerServiceKnowledgeStatusEnum.draft ||
                        item.status === CustomerServiceKnowledgeStatusEnum.rejected) && (
                        <>
                          <Button size="xs" onClick={() => editKnowledge(item)}>
                            {t('admin_edit')}
                          </Button>
                          <Button size="xs" onClick={() => knowledgeAction('submit', item.id)}>
                            {t('admin_submit')}
                          </Button>
                        </>
                      )}
                      {item.status === CustomerServiceKnowledgeStatusEnum.pending && (
                        <>
                          <Button
                            size="xs"
                            colorScheme="green"
                            onClick={() => knowledgeAction('review', item.id, 'publish')}
                          >
                            {t('admin_publish')}
                          </Button>
                          <Button
                            size="xs"
                            onClick={() => knowledgeAction('review', item.id, 'reject')}
                          >
                            {t('admin_reject')}
                          </Button>
                        </>
                      )}
                      {item.status === CustomerServiceKnowledgeStatusEnum.published && (
                        <Button size="xs" onClick={() => knowledgeAction('offline', item.id)}>
                          {t('admin_offline')}
                        </Button>
                      )}
                    </ResourceCard>
                  ))}
                </SimpleGrid>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Box>
                  <Heading size="sm" mb={2}>
                    {projectEditId ? t('admin_edit_project') : t('admin_create_project')}
                  </Heading>
                  <Text color="myGray.500" mb={3}>
                    {t('admin_project_reuse_tip')}{' '}
                    <Link color="primary.600" href="/dashboard/agent">
                      {t('admin_open_apps')}
                    </Link>
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                    <FormControl>
                      <FormLabel>App ID</FormLabel>
                      <Input
                        value={projectAppId}
                        isDisabled={!!projectEditId}
                        onChange={(event) => setProjectAppId(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_code')}</FormLabel>
                      <Input
                        value={projectCode}
                        isDisabled={!!projectEditId}
                        onChange={(event) => setProjectCode(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_name')}</FormLabel>
                      <Input
                        value={projectName}
                        onChange={(event) => setProjectName(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_model_ids')}</FormLabel>
                      <Input
                        value={projectModelIds}
                        onChange={(event) => setProjectModelIds(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_audience')}</FormLabel>
                      <Select
                        value={projectAudience}
                        onChange={(event) =>
                          setProjectAudience(event.target.value as CustomerServiceAudienceEnum)
                        }
                      >
                        {Object.values(CustomerServiceAudienceEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('welcome')}</FormLabel>
                      <Input
                        value={projectWelcome}
                        onChange={(event) => setProjectWelcome(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_human_name')}</FormLabel>
                      <Input
                        value={projectHumanName}
                        onChange={(event) => setProjectHumanName(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_phone')}</FormLabel>
                      <Input
                        value={projectPhone}
                        onChange={(event) => setProjectPhone(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_human_url')}</FormLabel>
                      <Input
                        value={projectHumanUrl}
                        onChange={(event) => setProjectHumanUrl(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_work_time')}</FormLabel>
                      <Input
                        value={projectWorkTime}
                        onChange={(event) => setProjectWorkTime(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_retention_days')}</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        value={projectRetentionDays}
                        onChange={(event) => setProjectRetentionDays(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_low_threshold')}</FormLabel>
                      <Input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={projectLowThreshold}
                        onChange={(event) => setProjectLowThreshold(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_low_max_count')}</FormLabel>
                      <Input
                        type="number"
                        min={1}
                        value={projectLowMaxCount}
                        onChange={(event) => setProjectLowMaxCount(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_max_answer_tokens')}</FormLabel>
                      <Input
                        type="number"
                        min={1}
                        value={projectMaxAnswerTokens}
                        onChange={(event) => setProjectMaxAnswerTokens(event.target.value)}
                      />
                    </FormControl>
                    {[
                      {
                        label: t('admin_dangerous_keywords'),
                        value: projectDangerousKeywords,
                        setter: setProjectDangerousKeywords
                      },
                      {
                        label: t('admin_dispute_keywords'),
                        value: projectDisputeKeywords,
                        setter: setProjectDisputeKeywords
                      },
                      {
                        label: t('admin_complaint_keywords'),
                        value: projectComplaintKeywords,
                        setter: setProjectComplaintKeywords
                      },
                      {
                        label: t('admin_human_keywords'),
                        value: projectHumanKeywords,
                        setter: setProjectHumanKeywords
                      }
                    ].map((item) => (
                      <FormControl key={item.label}>
                        <FormLabel>{item.label}</FormLabel>
                        <Input
                          value={item.value}
                          onChange={(event) => item.setter(event.target.value)}
                        />
                      </FormControl>
                    ))}
                    <FormControl gridColumn={{ md: 'span 3' }}>
                      <FormLabel>{t('admin_recommended_questions')}</FormLabel>
                      <Textarea
                        value={projectQuestions}
                        onChange={(event) => setProjectQuestions(event.target.value)}
                      />
                    </FormControl>
                  </SimpleGrid>
                  <Flex mt={4} gap={2}>
                    <Button
                      colorScheme="blue"
                      isLoading={saving}
                      isDisabled={
                        !projectAppId ||
                        !projectCode ||
                        !projectName ||
                        !projectHumanName ||
                        !projectRetentionDays
                      }
                      onClick={() => void saveProject()}
                    >
                      {projectEditId ? t('admin_save') : t('admin_create')}
                    </Button>
                    {projectEditId && (
                      <Button onClick={resetProjectForm}>{t('admin_cancel_edit')}</Button>
                    )}
                  </Flex>
                </Box>
                <Box>
                  <Heading size="sm" mb={2}>
                    {t('admin_bind_key')}
                  </Heading>
                  <Text color="myGray.500" mb={3}>
                    {t('admin_key_reuse_tip')}{' '}
                    <Link color="primary.600" href="/account/apikey">
                      {t('admin_open_keys')}
                    </Link>
                  </Text>
                  <SimpleGrid columns={{ base: 1, md: 3 }} gap={3}>
                    <FormControl>
                      <FormLabel>{t('project')}</FormLabel>
                      <Select
                        value={bindingProjectId}
                        onChange={(event) => setBindingProjectId(event.target.value)}
                      >
                        <option value="">{t('admin_select')}</option>
                        {projectData.projects.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>OpenAPI Key ID</FormLabel>
                      <Input
                        value={bindingKeyId}
                        onChange={(event) => setBindingKeyId(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_max_audience')}</FormLabel>
                      <Select
                        value={bindingAudience}
                        onChange={(event) =>
                          setBindingAudience(event.target.value as CustomerServiceAudienceEnum)
                        }
                      >
                        {Object.values(CustomerServiceAudienceEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_origins')}</FormLabel>
                      <Input
                        value={bindingOrigins}
                        onChange={(event) => setBindingOrigins(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_rate_seconds')}</FormLabel>
                      <Input
                        type="number"
                        min={1}
                        value={bindingRateSeconds}
                        onChange={(event) => setBindingRateSeconds(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_rate_limit')}</FormLabel>
                      <Input
                        type="number"
                        min={1}
                        value={bindingRateLimit}
                        onChange={(event) => setBindingRateLimit(event.target.value)}
                      />
                    </FormControl>
                  </SimpleGrid>
                  <Button
                    mt={4}
                    colorScheme="blue"
                    isLoading={saving}
                    isDisabled={!bindingProjectId || !bindingKeyId}
                    onClick={() => void bindKey()}
                  >
                    {t('admin_bind')}
                  </Button>
                </Box>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                  {projectData.projects.map((item) => (
                    <ResourceCard
                      key={item.id}
                      title={`${item.projectCode} · ${item.name}`}
                      subtitle={`App: ${item.appId}`}
                      status={item.status}
                    >
                      <Button
                        size="xs"
                        onClick={() =>
                          void router.push(`/app/detail?appId=${item.appId}&currentTab=logs`)
                        }
                      >
                        {t('admin_open_logs')}
                      </Button>
                      <Button size="xs" onClick={() => editProject(item)}>
                        {t('admin_edit')}
                      </Button>
                      <Button
                        size="xs"
                        onClick={() =>
                          void runAction(() =>
                            requestAdminApi({
                              url: '/api/customer-service/admin/project/update',
                              method: 'PUT',
                              body: {
                                projectId: item.id,
                                status:
                                  item.status === CustomerServiceProjectStatusEnum.active
                                    ? CustomerServiceProjectStatusEnum.inactive
                                    : CustomerServiceProjectStatusEnum.active
                              }
                            })
                          )
                        }
                      >
                        {item.status === CustomerServiceProjectStatusEnum.active
                          ? t('admin_disable')
                          : t('admin_enable')}
                      </Button>
                    </ResourceCard>
                  ))}
                  {projectData.keyBindings.map((item) => (
                    <ResourceCard
                      key={item.id}
                      title={`Key · ${item.openApiKeyId}`}
                      subtitle={`${t('project')}: ${item.projectId} · ${t('admin_max_audience')}: ${item.maxAudience}`}
                      status={item.status}
                    >
                      <Button size="xs" onClick={() => updateKeyStatus(item.id, item.status)}>
                        {item.status === CustomerServiceResourceStatusEnum.active
                          ? t('admin_disable')
                          : t('admin_enable')}
                      </Button>
                    </ResourceCard>
                  ))}
                </SimpleGrid>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={6}>
                <Box>
                  <Heading size="sm" mb={3}>
                    {t('admin_set_role')}
                  </Heading>
                  <SimpleGrid columns={{ base: 1, md: 4 }} gap={3}>
                    <FormControl>
                      <FormLabel>Team Member ID</FormLabel>
                      <Input
                        value={roleTmbId}
                        onChange={(event) => setRoleTmbId(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_role')}</FormLabel>
                      <Select
                        value={role}
                        onChange={(event) =>
                          setRole(event.target.value as CustomerServiceMemberRoleEnum)
                        }
                      >
                        {Object.values(CustomerServiceMemberRoleEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_reason')}</FormLabel>
                      <Input
                        value={roleReason}
                        onChange={(event) => setRoleReason(event.target.value)}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>{t('admin_status')}</FormLabel>
                      <Select
                        value={roleStatus}
                        onChange={(event) =>
                          setRoleStatus(event.target.value as CustomerServiceResourceStatusEnum)
                        }
                      >
                        {Object.values(CustomerServiceResourceStatusEnum).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </SimpleGrid>
                  <Button
                    mt={4}
                    colorScheme="blue"
                    isLoading={saving}
                    isDisabled={!roleTmbId || !roleReason}
                    onClick={() => void setMemberRole()}
                  >
                    {t('admin_save')}
                  </Button>
                </Box>
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={3}>
                  {roles.map((item) => (
                    <ResourceCard
                      key={item.id}
                      title={item.role}
                      subtitle={`${item.tmbId} · ${item.reason}`}
                      status={item.status}
                    />
                  ))}
                </SimpleGrid>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      )}
    </Box>
  );
};

export async function getServerSideProps(context: unknown) {
  return {
    props: {
      ...(await serviceSideProps(context, ['common', 'customer_service']))
    }
  };
}

export default CustomerServiceAdminPage;
