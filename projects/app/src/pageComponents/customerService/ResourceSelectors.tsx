import React, { useCallback, useState } from 'react';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import Avatar from '@fastgpt/web/components/common/Avatar';
import MyModal from '@fastgpt/web/components/common/MyModal';
import SelectOneResource from '@/components/common/folder/SelectOneResource';
import { getDatasetById, getDatasets } from '@/web/core/dataset/api';
import { getDatasetCollections } from '@/web/core/dataset/api/collection';
import { DatasetCollectionTypeEnum, DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
import type {
  GetResourceFolderListProps,
  GetResourceListItemResponse
} from '@fastgpt/global/common/parentFolder/type';
import type { SelectedDatasetType } from '@fastgpt/global/core/workflow/type/io';
import CreateDatasetModal from '@/pageComponents/dataset/list/CreateModal';
import { useTranslation } from 'next-i18next';

export type NamedResource = {
  id: string;
  name: string;
  avatar: string;
};

/** 按名称和目录选择一个 FastGPT 知识库，ID 仅通过回调供业务接口使用。 */
export const DatasetResourceSelect = ({
  value,
  onChange,
  title
}: {
  value?: SelectedDatasetType;
  onChange: (dataset?: SelectedDatasetType) => void;
  title?: string;
}) => {
  const { t } = useTranslation('customer_service');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const resolvedTitle = title ?? t('select_dataset');
  const getDatasetList = useCallback(async ({ parentId }: GetResourceFolderListProps) => {
    const list = await getDatasets({ parentId });
    return list.map<GetResourceListItemResponse>((item) => ({
      id: item._id,
      name: item.name,
      avatar: item.avatar,
      isFolder: item.type === DatasetTypeEnum.folder
    }));
  }, []);

  return (
    <>
      <Button w="100%" variant="whiteBase" justifyContent="start" onClick={() => setOpen(true)}>
        {value ? (
          <Flex align="center" minW={0} gap={2}>
            <Avatar src={value.avatar} w={5} borderRadius="sm" />
            <Text noOfLines={1}>{value.name}</Text>
          </Flex>
        ) : (
          resolvedTitle
        )}
      </Button>
      {open && (
        <MyModal isOpen title={resolvedTitle} onClose={() => setOpen(false)} w="520px" isCentered>
          <Flex px={4} pt={4} justify="flex-end">
            <Button size="sm" variant="whiteBase" onClick={() => setCreating(true)}>
              {t('create_dataset')}
            </Button>
          </Flex>
          <Box px={4} pb={4} pt={2} minH="260px">
            <SelectOneResource
              value={value?.datasetId}
              server={getDatasetList}
              onSelect={async (item) => {
                if (!item) {
                  onChange(undefined);
                  return;
                }
                const dataset = await getDatasetById(item.id);
                onChange({
                  datasetId: dataset._id,
                  name: dataset.name,
                  avatar: dataset.avatar,
                  vectorModel: dataset.vectorModel
                });
                setOpen(false);
              }}
            />
          </Box>
        </MyModal>
      )}
      {creating && (
        <CreateDatasetModal
          type={DatasetTypeEnum.dataset}
          onClose={() => setCreating(false)}
          onSuccess={async (datasetId) => {
            const dataset = await getDatasetById(datasetId);
            onChange({
              datasetId: dataset._id,
              name: dataset.name,
              avatar: dataset.avatar,
              vectorModel: dataset.vectorModel
            });
            setCreating(false);
            setOpen(false);
          }}
        />
      )}
    </>
  );
};

/** 读取知识库目录并按资料名称选择 collection，文件夹只用于导航。 */
export const CollectionResourceSelect = ({
  datasetId,
  value,
  onChange
}: {
  datasetId?: string;
  value?: NamedResource;
  onChange: (collection?: NamedResource) => void;
}) => {
  const { t } = useTranslation('customer_service');
  const [open, setOpen] = useState(false);
  const getCollectionList = useCallback(
    async ({ parentId }: GetResourceFolderListProps) => {
      if (!datasetId) return [];
      const response = await getDatasetCollections({
        datasetId,
        parentId,
        pageNum: 1,
        pageSize: 100,
        simple: true
      });
      return response.list.map<GetResourceListItemResponse>((item) => ({
        id: item._id,
        name: item.name,
        avatar: '/imgs/workflow/db.png',
        isFolder: item.type === DatasetCollectionTypeEnum.folder
      }));
    },
    [datasetId]
  );

  return (
    <>
      <Button
        w="100%"
        variant="whiteBase"
        justifyContent="start"
        isDisabled={!datasetId}
        onClick={() => setOpen(true)}
      >
        {value?.name || (datasetId ? t('select_imported_content') : t('select_dataset_first'))}
      </Button>
      {open && datasetId && (
        <MyModal
          isOpen
          title={t('select_imported_content')}
          onClose={() => setOpen(false)}
          w="520px"
          isCentered
        >
          <Box p={4} minH="260px">
            <SelectOneResource
              value={value?.id}
              server={getCollectionList}
              onSelect={(item) => {
                onChange(item ? { id: item.id, name: item.name, avatar: item.avatar } : undefined);
                if (item) setOpen(false);
              }}
            />
          </Box>
        </MyModal>
      )}
    </>
  );
};
