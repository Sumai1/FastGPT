/** 客服知识可见范围由低到高排列，请求只能向下收窄。 */
export enum CustomerServiceAudienceEnum {
  public = 'public',
  dealer = 'dealer',
  internal = 'internal'
}

export const CustomerServiceAudienceRank: Record<CustomerServiceAudienceEnum, number> = {
  [CustomerServiceAudienceEnum.public]: 0,
  [CustomerServiceAudienceEnum.dealer]: 1,
  [CustomerServiceAudienceEnum.internal]: 2
};

export enum CustomerServiceResourceStatusEnum {
  active = 'active',
  inactive = 'inactive'
}

export enum CustomerServiceProductStatusEnum {
  active = 'active',
  inactive = 'inactive',
  discontinued = 'discontinued'
}

export enum CustomerServiceVersionTypeEnum {
  hardware = 'hardware',
  software = 'software'
}

export enum CustomerServiceMemberRoleEnum {
  customerServiceAdmin = 'customerServiceAdmin',
  knowledgeEditor = 'knowledgeEditor',
  knowledgeReviewer = 'knowledgeReviewer'
}

export enum CustomerServiceKnowledgeTypeEnum {
  productMaster = 'productMaster',
  productParameter = 'productParameter',
  manual = 'manual',
  faq = 'faq',
  fault = 'fault',
  errorCode = 'errorCode',
  consumable = 'consumable',
  safety = 'safety',
  policy = 'policy',
  serviceScript = 'serviceScript',
  internalRepair = 'internalRepair',
  other = 'other'
}

export enum CustomerServiceKnowledgeStatusEnum {
  draft = 'draft',
  pending = 'pending',
  rejected = 'rejected',
  published = 'published',
  offline = 'offline'
}

export enum CustomerServiceKnowledgeAuditActionEnum {
  create = 'create',
  update = 'update',
  submit = 'submit',
  reject = 'reject',
  publish = 'publish',
  offline = 'offline'
}

export enum CustomerServiceMemberRoleAuditActionEnum {
  set = 'set',
  disable = 'disable'
}

export enum CustomerServiceProjectStatusEnum {
  active = 'active',
  inactive = 'inactive'
}

/** 托管客服工作流知识范围同步状态。状态仅描述最近一次同步，不影响旧发布版本运行。 */
export enum CustomerServiceWorkflowSyncStatusEnum {
  idle = 'idle',
  syncing = 'syncing',
  succeeded = 'succeeded',
  failed = 'failed'
}

export enum CustomerServiceHumanHandoffReasonEnum {
  requested = 'requested',
  dangerous = 'dangerous',
  dispute = 'dispute',
  complaint = 'complaint',
  lowConfidence = 'lowConfidence'
}

export enum CustomerServiceRequestStatusEnum {
  processing = 'processing',
  completed = 'completed',
  failed = 'failed'
}

export enum CustomerServiceChatStatusEnum {
  answered = 'answered',
  clarificationRequired = 'clarification_required',
  humanRequired = 'human_required'
}

/** 返回调用方真正可以使用的受众等级，任何请求都不能超过 Key 的最高受众。 */
export const resolveCustomerServiceAudience = ({
  maxAudience,
  requestedAudience
}: {
  maxAudience: CustomerServiceAudienceEnum;
  requestedAudience?: CustomerServiceAudienceEnum;
}) => {
  if (!requestedAudience) return maxAudience;

  return CustomerServiceAudienceRank[requestedAudience] <= CustomerServiceAudienceRank[maxAudience]
    ? requestedAudience
    : maxAudience;
};
