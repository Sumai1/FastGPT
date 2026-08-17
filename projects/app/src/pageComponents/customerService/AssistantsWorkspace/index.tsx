import React, { useState } from 'react';
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
  HStack,
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
  Text,
  Textarea,
  useToast
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceProjectStatusEnum,
  CustomerServiceWorkflowSyncStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import type { CustomerServiceAdminManagedProjectCreateResponse } from '@fastgpt/global/openapi/customerService/api';
import { useCustomerServiceContext, audienceMap, statusMap, requestAdminApi } from '../context';

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusMap[status] ?? { label: status, color: 'gray' };
  return <Badge colorScheme={config.color}>{config.label}</Badge>;
};

export const AssistantsWorkspace: React.FC = () => {
  const router = useRouter();
  const toast = useToast();
  const {
    projectData,
    catalog,
    modelMap,
    seriesMap,
    boundProjectIds,
    currentMember,
    createDisclosure,
    loadData,
    runAction,
    saving
  } = useCustomerServiceContext();

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0);
  const [assistantName, setAssistantName] = useState('');
  const [assistantModelIds, setAssistantModelIds] = useState<string[]>([]);
  const [assistantAudience, setAssistantAudience] = useState(CustomerServiceAudienceEnum.public);
  const [assistantWelcome, setAssistantWelcome] = useState(
    '您好，我是企业无人设备智能客服助手。请告诉我您遇到的设备现象或问题代码。'
  );
  const [assistantQuestions, setAssistantQuestions] = useState(
    '设备出货卡货了怎么退款？\n拍照机报错 ERR-102 怎么排查？\n如何联系人工售后客服？'
  );
  const [humanName, setHumanName] = useState('售后技术支持中心');
  const [humanPhone, setHumanPhone] = useState('400-800-6688');
  const [humanWorkTime, setHumanWorkTime] = useState('7×24小时全天候响应');

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

  const handleCreateAssistant = async () => {
    await runAction(async () => {
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
      closeWizard();
    }, '智能客服已成功创建并绑定标准工作流');
  };

  return (
    <Stack spacing={5}>
      {/* Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <Box>
          <Heading size="md">智能客服管理 (Assistants Studio)</Heading>
          <Text mt={1} color="myGray.500" fontSize="sm">
            创建、测试与发布面向不同设备型号与受众层级的智能客服，高级 Flow 流自动同步生效。
          </Text>
        </Box>
        {currentMember?.capabilities.manageProjects && (
          <Button colorScheme="blue" onClick={createDisclosure.onOpen}>
            + 创建智能客服
          </Button>
        )}
      </Flex>

      {/* Projects List */}
      {projectData.projects.length === 0 ? (
        <Flex
          minH="300px"
          bg="white"
          borderWidth="1px"
          borderColor="myGray.200"
          borderRadius="xl"
          align="center"
          justify="center"
          direction="column"
          p={8}
          textAlign="center"
        >
          <Heading size="sm">尚未创建任何智能客服</Heading>
          <Text mt={2} color="myGray.500" fontSize="sm">
            选择适用的产品型号后，系统会自动创建标准 Flow 工作流、客服项目与专用接口。
          </Text>
          {currentMember?.capabilities.manageProjects && (
            <Button mt={4} colorScheme="blue" onClick={createDisclosure.onOpen}>
              立即创建第一款客服
            </Button>
          )}
        </Flex>
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
                  <Box minW={0} flex="1">
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
                        {deliveryReady ? '可对外使用' : '未就绪'}
                      </Badge>
                    </Flex>
                    <Text mt={2} color="myGray.500" fontSize="xs" noOfLines={2}>
                      适用产品范围：{modelNames || '全部已授权产品型号'}
                    </Text>
                  </Box>
                </Flex>

                <Divider my={3.5} />

                <SimpleGrid columns={2} gap={3} fontSize="xs">
                  <Box>
                    <Text color="myGray.500">默认服务受众</Text>
                    <Text mt={0.5} fontWeight="600">
                      {audienceMap[project.defaultAudience]}
                    </Text>
                  </Box>
                  <Box>
                    <Text color="myGray.500">人工服务联系人</Text>
                    <Text mt={0.5} fontWeight="600">
                      {project.humanContact.name} ({project.humanContact.phone || '未设置电话'})
                    </Text>
                  </Box>
                </SimpleGrid>

                {(!workflowReady || workflowSyncFailed) &&
                  currentMember?.capabilities.manageProjects && (
                    <Flex
                      mt={3.5}
                      p={3}
                      bg={workflowSyncFailed ? 'red.50' : 'orange.50'}
                      borderRadius="md"
                      align="center"
                      gap={3}
                    >
                      <Box flex="1">
                        <Text color={workflowSyncFailed ? 'red.800' : 'orange.800'} fontSize="xs">
                          {workflowSyncFailed
                            ? project.workflowSync.failureReason || '知识范围同步失败'
                            : project.workflowReadiness.message}
                        </Text>
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
                            '工作流知识库范围已同步并发布'
                          )
                        }
                      >
                        {workflowSyncFailed ? '重新同步' : '立即同步'}
                      </Button>
                    </Flex>
                  )}

                <Flex mt={4} gap={2} wrap="wrap">
                  <Button
                    size="sm"
                    colorScheme="blue"
                    onClick={() =>
                      window.open(`/customer-service/chat/${project.publicId}`, '_blank')
                    }
                  >
                    在线试用
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          `${window.location.origin}/customer-service/chat/${project.publicId}`
                        )
                        .then(() => toast({ status: 'success', title: '客服对话链接已复制' }))
                    }
                  >
                    复制链接
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() =>
                      void router.push(`/app/detail?appId=${project.appId}&currentTab=logs`)
                    }
                  >
                    对话明细
                  </Button>
                  <Button
                    size="sm"
                    variant="whiteBase"
                    onClick={() => void router.push(`/app/detail?appId=${project.appId}`)}
                  >
                    工作流 Flow
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

      {/* Assistant Creation Wizard Modal */}
      <Modal isOpen={createDisclosure.isOpen} onClose={closeWizard} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <Flex justify="space-between" align="center">
              <Text>创建智能客服向导</Text>
              <Badge colorScheme="blue">第 {wizardStep + 1} / 3 步</Badge>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody pb={6}>
            <Flex mb={5} gap={2}>
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
              <Stack spacing={4}>
                <Box>
                  <Heading size="xs" color="myGray.700">
                    1. 基础信息与欢迎语
                  </Heading>
                  <Text mt={0.5} color="myGray.500" fontSize="xs">
                    系统将自动基于企业标准 Flow 工作流模板生成服务实例。
                  </Text>
                </Box>
                <FormControl isRequired>
                  <FormLabel fontSize="xs">智能客服名称</FormLabel>
                  <Input
                    size="sm"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    placeholder="例如：自动售货机 24h 智能客服"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs">默认服务受众级别</FormLabel>
                  <Select
                    size="sm"
                    value={assistantAudience}
                    onChange={(e) =>
                      setAssistantAudience(e.target.value as CustomerServiceAudienceEnum)
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
                  <FormLabel fontSize="xs">开屏欢迎语</FormLabel>
                  <Textarea
                    size="sm"
                    rows={3}
                    value={assistantWelcome}
                    onChange={(e) => setAssistantWelcome(e.target.value)}
                  />
                </FormControl>
              </Stack>
            )}

            {wizardStep === 1 && (
              <Stack spacing={4}>
                <Box>
                  <Heading size="xs" color="myGray.700">
                    2. 选择服务的设备产品范围
                  </Heading>
                  <Text mt={0.5} color="myGray.500" fontSize="xs">
                    客服将仅检索已选产品所绑定的知识库，实现跨产品数据安全隔离。
                  </Text>
                </Box>
                {catalog.models.length === 0 ? (
                  <Text color="myGray.400" fontSize="xs" py={4}>
                    尚未建立产品目录，请先在产品中心录入产品型号。
                  </Text>
                ) : (
                  <Stack maxH="320px" overflowY="auto" spacing={2} pr={1}>
                    {catalog.models.map((model) => {
                      const disabled =
                        model.status !== CustomerServiceProductStatusEnum.active ||
                        model.datasetIds.length === 0;
                      const series = seriesMap.get(model.seriesId);
                      return (
                        <Flex
                          key={model.id}
                          p={3}
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
                            <Text fontWeight="600" fontSize="xs">
                              {model.name}
                            </Text>
                            <Text fontSize="10px" color="myGray.500">
                              {series?.name} · {model.modelCode}
                            </Text>
                          </Box>
                          <Badge colorScheme={model.datasetIds.length > 0 ? 'blue' : 'red'}>
                            {model.datasetIds.length > 0
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
              <Stack spacing={4}>
                <Box>
                  <Heading size="xs" color="myGray.700">
                    3. 推荐问题与人工客服配置
                  </Heading>
                  <Text mt={0.5} color="myGray.500" fontSize="xs">
                    配置开屏快捷提问气泡与转人工联系信息。
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel fontSize="xs">推荐引导问题（每行一个）</FormLabel>
                  <Textarea
                    size="sm"
                    rows={3}
                    value={assistantQuestions}
                    onChange={(e) => setAssistantQuestions(e.target.value)}
                  />
                </FormControl>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                  <FormControl isRequired>
                    <FormLabel fontSize="xs">人工服务名称</FormLabel>
                    <Input
                      size="sm"
                      value={humanName}
                      onChange={(e) => setHumanName(e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs">服务电话</FormLabel>
                    <Input
                      size="sm"
                      value={humanPhone}
                      onChange={(e) => setHumanPhone(e.target.value)}
                    />
                  </FormControl>
                  <FormControl gridColumn={{ md: 'span 2' }}>
                    <FormLabel fontSize="xs">人工服务响应时间</FormLabel>
                    <Input
                      size="sm"
                      value={humanWorkTime}
                      onChange={(e) => setHumanWorkTime(e.target.value)}
                    />
                  </FormControl>
                </SimpleGrid>
              </Stack>
            )}
          </ModalBody>

          <ModalFooter gap={2} bg="myGray.50">
            {wizardStep > 0 && (
              <Button size="sm" variant="whiteBase" onClick={() => setWizardStep((s) => s - 1)}>
                上一步
              </Button>
            )}
            {wizardStep < 2 ? (
              <Button
                size="sm"
                colorScheme="blue"
                isDisabled={
                  (wizardStep === 0 && !assistantName.trim()) ||
                  (wizardStep === 1 && assistantModelIds.length === 0)
                }
                onClick={() => setWizardStep((s) => s + 1)}
              >
                下一步
              </Button>
            ) : (
              <Button
                size="sm"
                colorScheme="blue"
                isLoading={saving}
                isDisabled={!humanName.trim()}
                onClick={() => void handleCreateAssistant()}
              >
                完成创建并生成客服
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
};

export default AssistantsWorkspace;
