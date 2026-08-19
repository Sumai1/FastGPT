import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  useToast
} from '@chakra-ui/react';
import { useCustomerServiceContext } from '../context';
import ProductCatalogTree from './ProductCatalogTree';
import ProductDetailCard from './ProductDetailCard';
import ProductCreateModal from '../ProductCreateModal';
import { DatasetResourceSelect } from '../ResourceSelectors';

export const ProductStudio: React.FC = () => {
  const {
    catalog,
    currentMember,
    productCreateDisclosure,
    createProduct,
    bindingModelId,
    setBindingModelId,
    bindingDataset,
    setBindingDataset,
    bindModelDataset,
    saving,
    modelMap
  } = useCustomerServiceContext();

  const [selectedModelId, setSelectedModelId] = useState<string>(catalog.models[0]?.id || '');

  return (
    <Stack spacing={5}>
      {/* Studio Header */}
      <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
        <Box>
          <Heading size="md">产品层级与档案中心 (Product Studio)</Heading>
          <Text mt={1} color="myGray.500" fontSize="sm">
            按产品大类 ➔ 系列 ➔ 型号 ➔ 版本四级拓扑树钻取看板，统一管理设备档案与关联知识库覆盖。
          </Text>
        </Box>
        {currentMember?.capabilities.manageProjects && (
          <Button colorScheme="blue" onClick={productCreateDisclosure.onOpen}>
            添加大类/系列/型号/版本
          </Button>
        )}
      </Flex>

      {/* Main Split Layout: Left Catalog Tree + Right Model Details */}
      {catalog.models.length === 0 ? (
        <Flex
          minH="320px"
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
          <Heading size="sm">尚未建立产品档案目录</Heading>
          <Text mt={2} color="myGray.500" fontSize="sm">
            先建立产品大类、系列与型号，再为型号绑定对应知识库。
          </Text>
          {currentMember?.capabilities.manageProjects && (
            <Button mt={4} colorScheme="blue" onClick={productCreateDisclosure.onOpen}>
              立即添加第一款产品
            </Button>
          )}
        </Flex>
      ) : (
        <Flex gap={5} direction={{ base: 'column', lg: 'row' }} align="start">
          {/* Left Column: 4-Level Topology Tree */}
          <Box w={{ base: '100%', lg: '380px' }} flexShrink={0}>
            <ProductCatalogTree
              selectedModelId={selectedModelId || catalog.models[0]?.id}
              onSelectModel={(id) => setSelectedModelId(id)}
            />
          </Box>

          {/* Right Column: Model Detail & Knowledge Bindings */}
          <Box flex="1" minW={0} w="100%">
            <ProductDetailCard modelId={selectedModelId || catalog.models[0]?.id || ''} />
          </Box>
        </Flex>
      )}

      {/* Product Create Modal */}
      <ProductCreateModal
        isOpen={productCreateDisclosure.isOpen}
        catalog={catalog}
        onClose={productCreateDisclosure.onClose}
        onCreate={createProduct}
      />

      {/* Dataset Binding Modal */}
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
    </Stack>
  );
};

export default ProductStudio;
