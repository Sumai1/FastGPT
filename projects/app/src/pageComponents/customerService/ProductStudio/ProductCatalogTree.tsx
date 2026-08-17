import React, { useMemo, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  Input,
  Stack,
  Tag,
  Text
} from '@chakra-ui/react';
import { useCustomerServiceContext, statusMap } from '../context';
import type { CustomerServiceAdminProductListResponse } from '@fastgpt/global/openapi/customerService/api';
import MyIcon from '@fastgpt/web/components/common/Icon';

interface ProductCatalogTreeProps {
  selectedModelId?: string;
  onSelectModel: (modelId: string) => void;
}

export const ProductCatalogTree: React.FC<ProductCatalogTreeProps> = ({
  selectedModelId,
  onSelectModel
}) => {
  const { catalog } = useCustomerServiceContext();
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedSeries, setExpandedSeries] = useState<Record<string, boolean>>({});

  // Initialize all open
  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: prev[catId] === undefined ? false : !prev[catId]
    }));
  };

  const toggleSeries = (seriesId: string) => {
    setExpandedSeries((prev) => ({
      ...prev,
      [seriesId]: prev[seriesId] === undefined ? false : !prev[seriesId]
    }));
  };

  // Grouping
  const hierarchy = useMemo(() => {
    const term = search.trim().toLowerCase();

    return catalog.categories
      .filter((cat) => {
        if (!term) return true;
        return (
          cat.name.toLowerCase().includes(term) ||
          cat.code.toLowerCase().includes(term) ||
          catalog.series.some(
            (s) =>
              s.categoryId === cat.id &&
              (s.name.toLowerCase().includes(term) ||
                catalog.models.some(
                  (m) =>
                    m.seriesId === s.id &&
                    (m.name.toLowerCase().includes(term) ||
                      m.modelCode.toLowerCase().includes(term))
                ))
          )
        );
      })
      .map((category) => {
        const seriesList = catalog.series
          .filter((s) => s.categoryId === category.id)
          .map((series) => {
            const models = catalog.models
              .filter((m) => m.seriesId === series.id)
              .map((model) => {
                const versions = catalog.versions.filter((v) => v.modelId === model.id);
                return {
                  ...model,
                  versions
                };
              });
            return {
              ...series,
              models
            };
          });
        return {
          ...category,
          seriesList
        };
      });
  }, [catalog, search]);

  return (
    <Box bg="white" borderWidth="1px" borderColor="myGray.200" borderRadius="xl" p={4}>
      {/* Header & Search */}
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="xs" color="myGray.700">
          四级产品拓扑树 (大类 ➔ 系列 ➔ 型号 ➔ 版本)
        </Heading>
        <Badge colorScheme="blue" size="xs">
          {catalog.models.length} 款型号
        </Badge>
      </Flex>

      <Input
        size="sm"
        placeholder="搜索产品大类、系列、型号名称或编码..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        mb={3}
      />

      {hierarchy.length === 0 ? (
        <Text color="myGray.400" fontSize="xs" py={4} textAlign="center">
          未检索到匹配的产品节点
        </Text>
      ) : (
        <Stack spacing={2} maxH="620px" overflowY="auto" pr={1}>
          {hierarchy.map((cat) => {
            const isCatExpanded = expandedCategories[cat.id] !== false;
            return (
              <Box key={cat.id} borderWidth="1px" borderColor="myGray.100" borderRadius="lg" p={2}>
                {/* Level 1: Category */}
                <Flex
                  align="center"
                  justify="space-between"
                  p={1.5}
                  bg="myGray.50"
                  borderRadius="md"
                  cursor="pointer"
                  onClick={() => toggleCategory(cat.id)}
                  _hover={{ bg: 'blue.50' }}
                >
                  <HStack spacing={2}>
                    <Text fontSize="xs" fontWeight="700" color="myGray.800">
                      📂 {cat.name} ({cat.code})
                    </Text>
                    <Badge colorScheme="blue" size="xs">
                      {cat.seriesList.length} 个系列
                    </Badge>
                  </HStack>
                  <Text fontSize="10px" color="myGray.500">
                    {isCatExpanded ? '▼' : '▶'}
                  </Text>
                </Flex>

                {/* Level 2: Series list */}
                <Collapse in={isCatExpanded}>
                  <Stack mt={2} pl={3} spacing={2} borderLeftWidth="2px" borderColor="blue.100">
                    {cat.seriesList.map((series) => {
                      const isSeriesExpanded = expandedSeries[series.id] !== false;
                      return (
                        <Box key={series.id}>
                          <Flex
                            align="center"
                            justify="space-between"
                            p={1}
                            borderRadius="md"
                            cursor="pointer"
                            onClick={() => toggleSeries(series.id)}
                            _hover={{ bg: 'myGray.50' }}
                          >
                            <HStack spacing={2}>
                              <Text fontSize="xs" fontWeight="600" color="myGray.700">
                                📑 {series.name} ({series.code})
                              </Text>
                              <Badge size="xs" variant="outline">
                                {series.models.length} 个型号
                              </Badge>
                            </HStack>
                            <Text fontSize="10px" color="myGray.400">
                              {isSeriesExpanded ? '▼' : '▶'}
                            </Text>
                          </Flex>

                          {/* Level 3: Models list */}
                          <Collapse in={isSeriesExpanded}>
                            <Stack
                              mt={1}
                              pl={3}
                              spacing={1.5}
                              borderLeftWidth="2px"
                              borderColor="gray.100"
                            >
                              {series.models.map((model) => {
                                const isSelected = selectedModelId === model.id;
                                const statusConfig = statusMap[model.status] || {
                                  label: model.status,
                                  color: 'gray'
                                };
                                return (
                                  <Box
                                    key={model.id}
                                    p={2}
                                    borderRadius="md"
                                    bg={isSelected ? 'primary.50' : 'white'}
                                    borderWidth="1px"
                                    borderColor={isSelected ? 'primary.400' : 'myGray.200'}
                                    cursor="pointer"
                                    onClick={() => onSelectModel(model.id)}
                                    _hover={{ borderColor: 'primary.300', bg: 'primary.50' }}
                                  >
                                    <Flex justify="space-between" align="center">
                                      <HStack spacing={1.5} minW={0} flex="1">
                                        <Text
                                          fontSize="xs"
                                          fontWeight={isSelected ? '700' : '600'}
                                          noOfLines={1}
                                          color={isSelected ? 'primary.700' : 'myGray.800'}
                                        >
                                          📦 {model.name}
                                        </Text>
                                        <Badge size="xs" colorScheme={statusConfig.color}>
                                          {statusConfig.label}
                                        </Badge>
                                      </HStack>
                                      <Badge
                                        size="xs"
                                        colorScheme={model.datasetIds.length > 0 ? 'green' : 'red'}
                                      >
                                        {model.datasetIds.length > 0
                                          ? `${model.datasetIds.length} 库`
                                          : '无知识库'}
                                      </Badge>
                                    </Flex>

                                    {/* Level 4: Versions Preview Tags */}
                                    <Flex mt={1.5} wrap="wrap" gap={1}>
                                      {model.versions.map((ver) => (
                                        <Tag
                                          key={ver.id}
                                          size="sm"
                                          fontSize="10px"
                                          colorScheme={ver.type === 'software' ? 'cyan' : 'orange'}
                                        >
                                          {ver.type === 'software' ? '软' : '硬'} {ver.versionCode}
                                        </Tag>
                                      ))}
                                      {model.versions.length === 0 && (
                                        <Text fontSize="10px" color="myGray.400">
                                          暂未登记版本
                                        </Text>
                                      )}
                                    </Flex>
                                  </Box>
                                );
                              })}
                            </Stack>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Stack>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default ProductCatalogTree;
