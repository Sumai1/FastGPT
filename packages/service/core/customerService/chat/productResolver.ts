import { CustomerServiceVersionTypeEnum } from '@fastgpt/global/core/customerService/constants';
import type {
  CustomerServiceProductModelType,
  CustomerServiceProductVersionType
} from '@fastgpt/global/core/customerService/type';
import { listActiveProductCatalog } from '../product/entity';
import { isCustomerServiceVersionSensitiveQuestion } from './rule';

const normalizeProductText = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleUpperCase()
    .replace(/[\s_-]+/g, '');

const getLookupValues = ({
  code,
  name,
  aliases
}: {
  code: string;
  name: string;
  aliases: string[];
}) => [code, name, ...aliases].map(normalizeProductText).filter(Boolean);

const matchExplicitValue = <T>({
  items,
  value,
  getValues
}: {
  items: T[];
  value?: string;
  getValues: (item: T) => string[];
}) => {
  if (!value) return [];
  const normalizedValue = normalizeProductText(value);
  return items.filter((item) => getValues(item).includes(normalizedValue));
};

const matchMessageValues = <T>({
  items,
  message,
  getValues
}: {
  items: T[];
  message: string;
  getValues: (item: T) => string[];
}) => {
  const normalizedMessage = normalizeProductText(message);
  return items.filter((item) =>
    getValues(item).some((value) => value.length >= 3 && normalizedMessage.includes(value))
  );
};

const resolveVersion = ({
  versions,
  type,
  explicitValue,
  previousVersionId,
  message
}: {
  versions: CustomerServiceProductVersionType[];
  type: CustomerServiceVersionTypeEnum;
  explicitValue?: string;
  previousVersionId?: string;
  message: string;
}) => {
  const candidates = versions.filter((item) => item.type === type);
  const getValues = (item: CustomerServiceProductVersionType) =>
    getLookupValues({ code: item.versionCode, name: item.name, aliases: item.aliases });
  const matches = explicitValue
    ? matchExplicitValue({ items: candidates, value: explicitValue, getValues })
    : matchMessageValues({ items: candidates, message, getValues });

  const previousVersion = previousVersionId
    ? candidates.find((item) => String(item._id) === previousVersionId)
    : undefined;
  const resolved =
    matches.length === 1
      ? matches[0]
      : !explicitValue && matches.length === 0
        ? previousVersion
        : undefined;

  return {
    candidates,
    matches,
    resolved,
    explicitNotFound: !!explicitValue && matches.length === 0,
    ambiguous: matches.length > 1
  };
};

export type CustomerServiceProductResolution = {
  catalog: Awaited<ReturnType<typeof listActiveProductCatalog>>;
  model?: CustomerServiceProductModelType;
  modelCandidates: CustomerServiceProductModelType[];
  hardwareVersion?: CustomerServiceProductVersionType;
  softwareVersion?: CustomerServiceProductVersionType;
  clarification?: 'model_required' | 'model_not_found' | 'model_ambiguous' | 'version_required';
};

/**
 * 从显式参数、消息文本及单型号项目默认值解析产品上下文。显式参数优先，歧义或必要版本
 * 缺失时只返回追问结果，调用方不得进入检索。
 */
export const resolveCustomerServiceProduct = async ({
  teamId,
  projectModelIds,
  message,
  productModel,
  hardwareVersion,
  softwareVersion,
  previousModelId,
  previousHardwareVersionId,
  previousSoftwareVersionId
}: {
  teamId: string;
  projectModelIds: string[];
  message: string;
  productModel?: string;
  hardwareVersion?: string;
  softwareVersion?: string;
  previousModelId?: string;
  previousHardwareVersionId?: string;
  previousSoftwareVersionId?: string;
}): Promise<CustomerServiceProductResolution> => {
  const catalog = await listActiveProductCatalog({
    teamId,
    modelIds: projectModelIds
  });
  const [, , models, versions] = catalog;
  const getModelValues = (item: CustomerServiceProductModelType) =>
    getLookupValues({ code: item.modelCode, name: item.name, aliases: item.aliases });
  const modelMatches = productModel
    ? matchExplicitValue({ items: models, value: productModel, getValues: getModelValues })
    : matchMessageValues({ items: models, message, getValues: getModelValues });
  const previousModel = previousModelId
    ? models.find((item) => String(item._id) === previousModelId)
    : undefined;
  const model =
    modelMatches.length === 1
      ? modelMatches[0]
      : modelMatches.length === 0
        ? previousModel || (models.length === 1 ? models[0] : undefined)
        : undefined;

  if (!model) {
    return {
      catalog,
      modelCandidates: modelMatches.length > 1 ? modelMatches : models,
      clarification: productModel
        ? modelMatches.length > 1
          ? 'model_ambiguous'
          : 'model_not_found'
        : modelMatches.length > 1
          ? 'model_ambiguous'
          : 'model_required'
    };
  }

  const modelVersions = versions.filter((item) => String(item.modelId) === String(model._id));
  const hardware = resolveVersion({
    versions: modelVersions,
    type: CustomerServiceVersionTypeEnum.hardware,
    explicitValue: hardwareVersion,
    previousVersionId:
      previousModel && String(previousModel._id) === String(model._id)
        ? previousHardwareVersionId
        : undefined,
    message
  });
  const software = resolveVersion({
    versions: modelVersions,
    type: CustomerServiceVersionTypeEnum.software,
    explicitValue: softwareVersion,
    previousVersionId:
      previousModel && String(previousModel._id) === String(model._id)
        ? previousSoftwareVersionId
        : undefined,
    message
  });
  const needsVersion = isCustomerServiceVersionSensitiveQuestion(message);
  const mustClarifyVersion =
    hardware.explicitNotFound ||
    software.explicitNotFound ||
    hardware.ambiguous ||
    software.ambiguous ||
    (needsVersion && hardware.candidates.length > 1 && !hardware.resolved) ||
    (needsVersion && software.candidates.length > 1 && !software.resolved);

  return {
    catalog,
    model,
    modelCandidates: [model],
    hardwareVersion: hardware.resolved,
    softwareVersion: software.resolved,
    ...(mustClarifyVersion && { clarification: 'version_required' })
  };
};

/** 生成不会泄露其他型号信息的结构化追问文本。 */
export const getCustomerServiceProductClarification = ({
  resolution
}: {
  resolution: CustomerServiceProductResolution;
}) => {
  if (resolution.clarification === 'model_not_found') {
    return '没有找到您提供的产品型号，请从可选型号中确认后再提问。';
  }
  if (resolution.clarification === 'model_ambiguous') {
    return '当前信息匹配到多个产品型号，请先确认具体型号。';
  }
  if (resolution.clarification === 'version_required') {
    return '该问题可能因软硬件版本而不同，请补充设备的硬件版本和软件/固件版本。';
  }
  return '请先选择或提供设备的具体产品型号，以免不同型号的资料混用。';
};
