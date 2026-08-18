import React, { useState } from 'react';
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  ModalBody,
  ModalFooter,
  Select,
  Stack,
  useToast
} from '@chakra-ui/react';
import MyModal from '@fastgpt/web/components/common/MyModal';
import { CustomerServiceMemberRoleEnum } from '@fastgpt/global/core/customerService/constants';
import { POST } from '@/web/common/api/request';

export interface DirectAddMemberModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * 极简添加账户弹窗：输入用户名、姓名、初始密码和角色直接创建
 */
const DirectAddMemberModal: React.FC<DirectAddMemberModalProps> = ({ onClose, onSuccess }) => {
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('123456');
  const [role, setRole] = useState<'member' | 'admin'>('member');

  const handleSubmit = async () => {
    if (!username.trim()) {
      toast({ status: 'warning', title: '请输入登录用户名' });
      return;
    }
    if (!name.trim()) {
      toast({ status: 'warning', title: '请输入姓名' });
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
        role:
          role === 'admin'
            ? CustomerServiceMemberRoleEnum.customerServiceAdmin
            : CustomerServiceMemberRoleEnum.knowledgeEditor,
        reason: '管理员添加账户'
      });

      toast({
        status: 'success',
        title: '账户添加成功',
        description: `账号【${username.trim()}】已创建就绪，初始密码【${password.trim()}】，可直接使用此密码登录！`
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        status: 'error',
        title: '添加失败',
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
      title="添加账户"
      w="100%"
      maxW={['90vw', '460px']}
    >
      <ModalBody py={4}>
        <Stack spacing={4}>
          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              用户名
            </FormLabel>
            <Input
              placeholder="请输入登录用户名 (例如: zhangsan)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              bg="myGray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              姓名 / 昵称
            </FormLabel>
            <Input
              placeholder="请输入真实姓名或显示昵称"
              value={name}
              onChange={(e) => setName(e.target.value)}
              bg="myGray.50"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontSize="sm" fontWeight="600">
              初始密码
            </FormLabel>
            <Input
              type="text"
              placeholder="默认: 123456"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              bg="myGray.50"
            />
          </FormControl>

          <FormControl>
            <FormLabel fontSize="sm" fontWeight="600">
              身份角色
            </FormLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              bg="myGray.50"
            >
              <option value="member">普通用户</option>
              <option value="admin">管理员</option>
            </Select>
          </FormControl>
        </Stack>
      </ModalBody>

      <ModalFooter>
        <Button variant="whiteBase" mr={3} onClick={onClose}>
          取消
        </Button>
        <Button variant="primary" isLoading={loading} onClick={handleSubmit}>
          确认添加
        </Button>
      </ModalFooter>
    </MyModal>
  );
};

export default DirectAddMemberModal;
