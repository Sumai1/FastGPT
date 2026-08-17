import React, { useState } from 'react';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  FormControl,
  FormLabel,
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
  Progress,
  useToast
} from '@chakra-ui/react';
import {
  CustomerServiceAudienceEnum,
  CustomerServiceKnowledgeTypeEnum
} from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceAdminKnowledgeCreateBody,
  CustomerServiceAdminProductListResponse
} from '@fastgpt/global/openapi/customerService/api';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import {
  CollectionResourceSelect,
  DatasetResourceSelect,
  type NamedResource
} from './ResourceSelectors';
import { useSelectFile } from '@/web/common/file/hooks/useSelectFile';
import { documentFileType } from '@fastgpt/global/common/file/constants';
import { getUploadDatasetFilePresignedUrl } from '@/web/core/dataset/api/file';
import { postCreateDatasetFileCollection } from '@/web/core/dataset/api/collection';
import { S3FileUploader } from '@fastgpt/web/common/file/uploader';
import { useTranslation } from 'next-i18next';

const knowledgeTypeMap: Record<CustomerServiceKnowledgeTypeEnum, string> = {
  productMaster: '产品主档',
  productParameter: '产品参数',
  manual: '操作说明',
  faq: '常见问题',
  fault: '故障处理',
  errorCode: '错误码',
  consumable: '耗材说明',
  safety: '安全说明',
  policy: '服务政策',
  serviceScript: '服务话术',
  internalRepair: '内部维修',
  other: '其他资料'
};
const audienceMap: Record<CustomerServiceAudienceEnum, string> = {
  public: '普通客户',
  dealer: '经销商',
  internal: '内部售后'
};

/** 用业务名称登记知识治理草稿，不向用户暴露 dataset/collection ID。 */
const KnowledgeCreateModal = ({
  isOpen,
  catalog,
  initialSource,
  onClose,
  onCreate
}: {
  isOpen: boolean;
  catalog: CustomerServiceAdminProductListResponse;
  initialSource?: {
    dataset: SelectedDatasetType;
    collection: NamedResource;
  };
  onClose: () => void;
  onCreate: (body: CustomerServiceAdminKnowledgeCreateBody) => Promise<void>;
}) => {
  const toast = useToast();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [sourceMode, setSourceMode] = useState<'upload' | 'existing'>(
    initialSource ? 'existing' : 'upload'
  );
  const [dataset, setDataset] = useState<SelectedDatasetType | undefined>(initialSource?.dataset);
  const [collection, setCollection] = useState<NamedResource | undefined>(
    initialSource?.collection
  );
  const [file, setFile] = useState<File>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [knowledgeType, setKnowledgeType] = useState(CustomerServiceKnowledgeTypeEnum.faq);
  const [audience, setAudience] = useState(CustomerServiceAudienceEnum.public);
  const [modelIds, setModelIds] = useState<string[]>([]);
  const { File: FileInput, onOpen: openFileSelector } = useSelectFile({
    fileType: documentFileType,
    multiple: false,
    maxCount: 1
  });

  const close = () => {
    setDataset(undefined);
    setCollection(undefined);
    setFile(undefined);
    setUploadProgress(0);
    setModelIds([]);
    setSourceMode('upload');
    onClose();
  };

  const submit = async () => {
    if (!dataset || (sourceMode === 'upload' ? !file : !collection)) return;
    setSaving(true);
    try {
      let targetCollection = collection;
      if (sourceMode === 'upload' && file) {
        const uploadResult = await getUploadDatasetFilePresignedUrl({
          filename: file.name,
          datasetId: dataset.datasetId,
          size: file.size
        });
        const uploader = new S3FileUploader({
          ...uploadResult,
          file,
          t,
          onProgress: (loaded, total) =>
            setUploadProgress(total ? Math.round((loaded / total) * 100) : 0)
        });
        try {
          await uploader.upload();
        } catch (error) {
          await uploader.abort();
          throw error;
        }

        const created = await postCreateDatasetFileCollection({
          datasetId: dataset.datasetId,
          fileId: uploadResult.key,
          metadata: { customerServicePendingRegistration: true },
          forbid: true
        });
        targetCollection = {
          id: created.collectionId,
          name: file.name,
          avatar: '/imgs/workflow/db.png'
        };
        // 治理登记失败时保留刚创建的 collection，用户可原地重试而不重复上传。
        setCollection(targetCollection);
        setFile(undefined);
        setSourceMode('existing');
      }
      if (!targetCollection) return;

      await onCreate({
        datasetId: dataset.datasetId,
        collectionId: targetCollection.id,
        title: targetCollection.name,
        sourceName: targetCollection.name,
        knowledgeType,
        audienceLevel: audience,
        modelIds,
        hardwareVersionIds: [],
        softwareVersionIds: [],
        effectiveFrom: new Date(),
        effectiveTo: null
      });
      toast({ status: 'success', title: '资料已登记为草稿' });
      close();
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '知识登记失败'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>登记客服知识</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={5} color="myGray.500" fontSize="sm">
            上传后沿用 FastGPT
            原有解析和训练队列，并自动登记为客服知识草稿；审核发布前不会参与正式回答。
          </Text>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
              <Button
                variant={sourceMode === 'upload' ? 'primary' : 'whiteBase'}
                onClick={() => setSourceMode('upload')}
              >
                上传新资料
              </Button>
              <Button
                variant={sourceMode === 'existing' ? 'primary' : 'whiteBase'}
                onClick={() => setSourceMode('existing')}
              >
                登记已有资料
              </Button>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <FormControl isRequired>
                <FormLabel>知识库</FormLabel>
                <DatasetResourceSelect
                  value={dataset}
                  onChange={(value) => {
                    setDataset(value);
                    setCollection(undefined);
                    setFile(undefined);
                    setUploadProgress(0);
                  }}
                />
              </FormControl>
              {sourceMode === 'existing' ? (
                <FormControl isRequired>
                  <FormLabel>资料</FormLabel>
                  <CollectionResourceSelect
                    datasetId={dataset?.datasetId}
                    value={collection}
                    onChange={setCollection}
                  />
                </FormControl>
              ) : (
                <FormControl isRequired>
                  <FormLabel>资料文件</FormLabel>
                  <Button
                    w="100%"
                    variant="whiteBase"
                    justifyContent="start"
                    isDisabled={!dataset}
                    onClick={() => openFileSelector()}
                  >
                    {file?.name || '选择 PDF、Word、Excel、Markdown 等文件'}
                  </Button>
                  <FileInput
                    onSelect={(files) => {
                      setFile(files[0]);
                      setCollection(undefined);
                      setUploadProgress(0);
                    }}
                  />
                  {uploadProgress > 0 && (
                    <Progress mt={2} size="sm" value={uploadProgress} borderRadius="full" />
                  )}
                </FormControl>
              )}
              <FormControl>
                <FormLabel>资料类型</FormLabel>
                <Select
                  value={knowledgeType}
                  onChange={(event) =>
                    setKnowledgeType(event.target.value as CustomerServiceKnowledgeTypeEnum)
                  }
                >
                  {Object.values(CustomerServiceKnowledgeTypeEnum).map((item) => (
                    <option key={item} value={item}>
                      {knowledgeTypeMap[item]}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>可见范围</FormLabel>
                <Select
                  value={audience}
                  onChange={(event) =>
                    setAudience(event.target.value as CustomerServiceAudienceEnum)
                  }
                >
                  {Object.values(CustomerServiceAudienceEnum).map((item) => (
                    <option key={item} value={item}>
                      {audienceMap[item]}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
            <FormControl>
              <FormLabel>适用产品型号</FormLabel>
              <Text mb={3} color="myGray.500" fontSize="sm">
                不选择表示这是所有产品都可以使用的通用资料。
              </Text>
              <CheckboxGroup value={modelIds} onChange={(value) => setModelIds(value as string[])}>
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={2}>
                  {catalog.models.map((model) => (
                    <Checkbox
                      key={model.id}
                      value={model.id}
                      p={3}
                      bg="myGray.50"
                      borderRadius="md"
                    >
                      {model.name}（{model.modelCode}）
                    </Checkbox>
                  ))}
                </SimpleGrid>
              </CheckboxGroup>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="whiteBase" onClick={close}>
            取消
          </Button>
          <Button
            colorScheme="blue"
            isLoading={saving}
            isDisabled={!dataset || (sourceMode === 'upload' ? !file : !collection)}
            onClick={() => void submit()}
          >
            {sourceMode === 'upload' ? '上传并保存草稿' : '保存草稿'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default KnowledgeCreateModal;
