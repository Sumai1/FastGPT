import { getNanoid } from '@fastgpt/global/common/string/tools';

/** 生成不可由团队或业务编码推导的客服公开标识，由 MongoDB 唯一索引兜底极低概率冲突。 */
export const generateCustomerServiceProjectPublicId = () => `cs_${getNanoid(24)}`;
