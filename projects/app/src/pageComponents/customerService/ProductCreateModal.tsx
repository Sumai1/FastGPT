import React, { useMemo, useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
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
  useToast
} from '@chakra-ui/react';
import { CustomerServiceVersionTypeEnum } from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceAdminProductCreateBody,
  CustomerServiceAdminProductListResponse
} from '@fastgpt/global/openapi/customerService/api';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import { DatasetResourceSelect } from './ResourceSelectors';

type ProductResourceType = 'category' | 'series' | 'model' | 'version';

const resourceTypeMap: Record<ProductResourceType, string> = {
  category: '产品大类',
  series: '产品系列',
  model: '产品型号',
  version: '软硬件版本'
};

/** 创建产品树资源，父级和知识库均使用业务名称选择。 */
const ProductCreateModal = ({
  isOpen,
  catalog,
  onClose,
  onCreate
}: {
  isOpen: boolean;
  catalog: CustomerServiceAdminProductListResponse;
  onClose: () => void;
  onCreate: (body: CustomerServiceAdminProductCreateBody) => Promise<void>;
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [resourceType, setResourceType] = useState<ProductResourceType>('model');
  const [parentId, setParentId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [aliases, setAliases] = useState('');
  const [dataset, setDataset] = useState<SelectedDatasetType>();
  const [versionType, setVersionType] = useState(CustomerServiceVersionTypeEnum.hardware);

  const parents = useMemo(() => {
    if (resourceType === 'series') return catalog.categories;
    if (resourceType === 'model') return catalog.series;
    if (resourceType === 'version') return catalog.models;
    return [];
  }, [catalog.categories, catalog.models, catalog.series, resourceType]);

  const close = () => {
    setParentId('');
    setCode('');
    setName('');
    setAliases('');
    setDataset(undefined);
    onClose();
  };

  const submit = async () => {
    const common = {
      name,
      aliases: aliases
        .split(/[,，]/)
        .map((item) => item.trim())
        .filter(Boolean),
      description: ''
    };
    const body: CustomerServiceAdminProductCreateBody = (() => {
      if (resourceType === 'category') {
        return { resourceType, ...common, code, sortOrder: 0 };
      }
      if (resourceType === 'series') {
        return { resourceType, ...common, categoryId: parentId, code, sortOrder: 0 };
      }
      if (resourceType === 'model') {
        return {
          resourceType,
          ...common,
          seriesId: parentId,
          modelCode: code,
          datasetIds: dataset ? [dataset.datasetId] : [],
          sortOrder: 0
        };
      }
      return {
        resourceType,
        ...common,
        modelId: parentId,
        type: versionType,
        versionCode: code,
        effectiveFrom: new Date(),
        effectiveTo: null
      };
    })();

    setSaving(true);
    try {
      await onCreate(body);
      toast({ status: 'success', title: `${resourceTypeMap[resourceType]}已创建` });
      close();
    } catch (error) {
      toast({
        status: 'error',
        title: error instanceof Error ? error.message : '产品资源创建失败'
      });
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = !!code.trim() && !!name.trim() && (resourceType === 'category' || !!parentId);

  return (
    <Modal isOpen={isOpen} onClose={close} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>添加产品或版本</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text mb={5} color="myGray.500" fontSize="sm">
            按产品大类、系列、型号和版本逐级建立目录。型号创建时可以直接选择对应知识库。
          </Text>
          <Stack spacing={5}>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <FormControl>
                <FormLabel>要添加的内容</FormLabel>
                <Select
                  value={resourceType}
                  onChange={(event) => {
                    setResourceType(event.target.value as ProductResourceType);
                    setParentId('');
                  }}
                >
                  {Object.entries(resourceTypeMap).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              {resourceType !== 'category' && (
                <FormControl isRequired>
                  <FormLabel>所属上级</FormLabel>
                  <Select value={parentId} onChange={(event) => setParentId(event.target.value)}>
                    <option value="">请选择</option>
                    {parents.map((item) => (
                      <option key={item.id} value={item.id}>
                        {'modelCode' in item ? item.modelCode : item.code} · {item.name}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              )}
              {resourceType === 'version' && (
                <FormControl>
                  <FormLabel>版本类型</FormLabel>
                  <Select
                    value={versionType}
                    onChange={(event) =>
                      setVersionType(event.target.value as CustomerServiceVersionTypeEnum)
                    }
                  >
                    <option value={CustomerServiceVersionTypeEnum.hardware}>硬件版本</option>
                    <option value={CustomerServiceVersionTypeEnum.software}>软件/固件版本</option>
                  </Select>
                </FormControl>
              )}
              <FormControl isRequired>
                <FormLabel>编码</FormLabel>
                <Input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder={resourceType === 'model' ? '例如：PHOTO-X1' : '请输入唯一编码'}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>名称</FormLabel>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </FormControl>
              <FormControl>
                <FormLabel>常用别名</FormLabel>
                <Input
                  value={aliases}
                  onChange={(event) => setAliases(event.target.value)}
                  placeholder="多个别名用逗号分隔"
                />
              </FormControl>
              {resourceType === 'model' && (
                <FormControl>
                  <FormLabel>产品知识库</FormLabel>
                  <DatasetResourceSelect
                    value={dataset}
                    onChange={setDataset}
                    title="选择该型号的知识库"
                  />
                </FormControl>
              )}
            </SimpleGrid>
          </Stack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="whiteBase" onClick={close}>
            取消
          </Button>
          <Button
            colorScheme="blue"
            isLoading={saving}
            isDisabled={!canSubmit}
            onClick={() => void submit()}
          >
            创建
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ProductCreateModal;
