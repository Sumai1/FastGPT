import React, { useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  ModalBody,
  ModalFooter,
  Select,
  SimpleGrid,
  Stack,
  Text,
  useToast
} from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { POST } from '@/web/common/api/request';

export interface DirectAddMemberModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const DirectAddMemberModal: React.FC<DirectAddMemberModalProps> = ({ onClose, onSuccess }) => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('1234');
  const [role, setRole] = useState<CustomerServiceMemberRoleEnum>(
    CustomerServiceMemberRoleEnum.knowledgeEditor
  );

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({ status: 'warning', title: '请输入登录用户名' });
      return;
    }
    if (!name.trim()) {
      toast({ status: 'warning', title: '请输入成员姓名' });
      return;
    }
    if (!password.trim()) {
      toast({ status: 'warning', title: '请输入登录密码' });
      return;
    }

    try {
      setLoading(true);
      await POST('/customer-service/admin/role/create-member', {
        username: username.trim(),
        name: name.trim(),
        password: password.trim(),
        role,
        reason: '管理员在原生团队管理中心直接开通账号'
      });

      toast({
        status: 'success',
        title: '成员账号创建成功',
        description: `账号【${username.trim()}】已就绪，初始密码【${password.trim()}】，可直接使用 FastGPT 登录页登录！`
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: '创建失败',
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
      title="直接添加成员账号"
      w="100%"
      maxW={['90vw', '560px']}
    >
      <ModalBody py={4}>
        <Stack spacing={4}>
          <Text fontSize="xs" color="myGray.500">
            管理员可直接创建独立系统账号并加入当前团队，成员可使用设定的账号密码直接登录 FastGPT。
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">
                登录用户名
              </FormLabel>
              <Input
                placeholder="例如: editor_01 / kf_zhang"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                bg="myGray.50"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel fontSize="sm" fontWeight="600">
                成员真实姓名
              </FormLabel>
              <Input
                placeholder="例如: 张三 (知识采编)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                bg="myGray.50"
              />
            </FormControl>
          </SimpleGrid>

          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              初始登录密码
            </FormLabel>
            <Input
              type="text"
              placeholder="请输入密码（默认: 1234）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              bg="myGray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              团队角色与岗位
            </FormLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as CustomerServiceMemberRoleEnum)}
              bg="myGray.50"
            >
              <option value={CustomerServiceMemberRoleEnum.knowledgeEditor}>
                📝 知识采编员 (负责知识编写、结构化录入与提审)
              </option>
              <option value={CustomerServiceMemberRoleEnum.knowledgeReviewer}>
                🔍 知识审核员 (负责知识 Diff 复核、在线试问与发布)
              </option>
              <option value={CustomerServiceMemberRoleEnum.customerServiceAdmin}>
                🛡️ 客服与团队管理员 (拥有全权限、品类分配与工作流治理)
              </option>
            </Select>
          </FormControl>
        </Stack>
      </ModalBody>

      <ModalFooter>
        <Button variant="whiteBase" mr={3} onClick={onClose}>
          取消
        </Button>
        <Button variant="primary" isLoading={loading} onClick={handleSubmit}>
          一键创建并生效
        </Button>
      </ModalFooter>
    </MyModal>
  );
};

export default DirectAddMemberModal;
