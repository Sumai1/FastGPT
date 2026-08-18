import React, { useState, useEffect } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  ModalBody,
  ModalFooter,
  Select,
  Stack,
  useToast,
  Checkbox,
  CheckboxGroup,
  Wrap,
  WrapItem,
  Spinner,
  Input
} from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import {
  CustomerServiceMemberRoleEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';
import { GET, POST } from '@/web/common/api/request';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import type { CustomerServiceAdminProductListResponse } from '@fastgpt/global/openapi/customerService/api';

export interface EditMemberRoleModalProps {
  tmbId: string;
  defaultRole: string;
  defaultAllowedCategoryIds?: string[];
  defaultAllowedModelIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditMemberRoleModal: React.FC<EditMemberRoleModalProps> = ({
  tmbId,
  defaultRole,
  defaultAllowedCategoryIds,
  defaultAllowedModelIds,
  onClose,
  onSuccess
}) => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string>(
    defaultRole || CustomerServiceMemberRoleEnum.knowledgeEditor
  );
  const [allowedCategoryIds, setAllowedCategoryIds] = useState<string[]>(
    defaultAllowedCategoryIds || []
  );
  const [allowedModelIds, setAllowedModelIds] = useState<string[]>(defaultAllowedModelIds || []);

  const { data: catalog, loading: catalogLoading } = useRequest<
    CustomerServiceAdminProductListResponse,
    any[]
  >(() => GET('/customer-service/admin/product/list'), { manual: false });

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await POST('/customer-service/admin/role/set', {
        tmbId,
        role,
        status: CustomerServiceResourceStatusEnum.active,
        allowedCategoryIds,
        allowedModelIds,
        reason: '管理员更新团队成员权限'
      });
      toast({ status: 'success', title: '权限更新成功' });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: '更新失败',
        description: error instanceof Error ? error.message : '请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyModal
      isOpen
      onClose={onClose}
      iconSrc="support/user/usersLight"
      iconColor="primary.600"
      title="设置客服与品类权限"
      w="100%"
      maxW={['90vw', '480px']}
    >
      <ModalBody py={4}>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              系统角色与权限
            </FormLabel>
            <Select value={role} onChange={(e) => setRole(e.target.value)} bg="myGray.50">
              <option value="owner">🛡️ 团队所有者</option>
              <option value={CustomerServiceMemberRoleEnum.customerServiceAdmin}>
                🛡️ 管理员（团队管理、全量知识权限）
              </option>
              <option value={CustomerServiceMemberRoleEnum.knowledgeReviewer}>
                🔍 知识审核员（负责知识审核台）
              </option>
              <option value={CustomerServiceMemberRoleEnum.knowledgeEditor}>
                📝 知识采编员（负责知识采编台）
              </option>
              <option value="member">👤 普通成员</option>
            </Select>
          </FormControl>

          {(role === CustomerServiceMemberRoleEnum.knowledgeEditor ||
            role === CustomerServiceMemberRoleEnum.knowledgeReviewer) && (
            <>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  管理品类权限 (可选)
                </FormLabel>
                {catalogLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <CheckboxGroup
                    value={allowedCategoryIds}
                    onChange={(val) => setAllowedCategoryIds(val as string[])}
                  >
                    <Wrap spacing={4}>
                      {catalog?.categories?.map((cat) => (
                        <WrapItem key={cat.id}>
                          <Checkbox value={cat.id}>{cat.name}</Checkbox>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </CheckboxGroup>
                )}
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm" fontWeight="600">
                  管理型号权限 (可选)
                </FormLabel>
                {catalogLoading ? (
                  <Spinner size="sm" />
                ) : (
                  <CheckboxGroup
                    value={allowedModelIds}
                    onChange={(val) => setAllowedModelIds(val as string[])}
                  >
                    <Wrap spacing={4}>
                      {catalog?.models?.map((model) => (
                        <WrapItem key={model.id}>
                          <Checkbox value={model.id}>{model.name}</Checkbox>
                        </WrapItem>
                      ))}
                    </Wrap>
                  </CheckboxGroup>
                )}
              </FormControl>
            </>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="whiteBase" mr={3} onClick={onClose}>
          取消
        </Button>
        <Button variant="primary" isLoading={loading} onClick={handleSubmit}>
          确认保存
        </Button>
      </ModalFooter>
    </MyModal>
  );
};
export default EditMemberRoleModal;
