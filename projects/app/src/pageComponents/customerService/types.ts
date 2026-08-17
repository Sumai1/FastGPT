import type {
  CustomerServiceAdminFrequentQuestionListResponse,
  CustomerServiceAdminHealthResponse,
  CustomerServiceAdminKnowledgeListResponse,
  CustomerServiceAdminMeResponse,
  CustomerServiceAdminOperationItemSchema,
  CustomerServiceAdminOperationListResponse,
  CustomerServiceAdminProductListResponse,
  CustomerServiceAdminProjectListResponse,
  CustomerServiceAdminRoleMemberListResponse,
  CustomerServiceAdminRoleListResponse,
  CustomerServiceAdminUnregisteredKnowledgeListResponse
} from '@fastgpt/global/openapi/customerService/api';
import type { z } from 'zod';
import type {
  CustomerServiceAudienceEnum,
  CustomerServiceChatStatusEnum,
  CustomerServiceKnowledgeTypeEnum,
  CustomerServiceMemberRoleEnum,
  CustomerServiceProductStatusEnum,
  CustomerServiceResourceStatusEnum
} from '@fastgpt/global/core/customerService/constants';

export type ConsoleSection =
  | 'overview'
  | 'assistants'
  | 'knowledge'
  | 'products'
  | 'operations'
  | 'review'
  | 'settings';

export type OperationItem = z.infer<typeof CustomerServiceAdminOperationItemSchema>;
export type KnowledgeItem = CustomerServiceAdminKnowledgeListResponse[number];
export type KnowledgeDraftSource = {
  id: string;
  question?: string;
  answer?: string;
  modelId?: string | null;
};
export type UnregisteredKnowledge = CustomerServiceAdminUnregisteredKnowledgeListResponse[number];

export interface AdminApiResponse<T> {
  code: number;
  message?: string;
  data: T;
}

export interface StructuredMasterFormData {
  title: string;
  productModelId: string;
  category: string;
  dimensions: {
    lengthMm: number;
    widthMm: number;
    heightMm: number;
    weightKg: number;
    housingMaterial: string;
  };
  power: {
    ratedPowerW: number;
    voltageRange: string;
    standbyPowerW: number;
    powerPlugType: string;
  };
  network: {
    wifiSupported: boolean;
    cellularType: string;
    rj45Ethernet: boolean;
    bluetooth: boolean;
  };
  consumables: {
    paperSpec: string;
    inkOrRibbon: string;
    capacityNotes: string;
  };
  warranty: {
    warrantyMonths: number;
    freeMaintenanceConditions: string;
    supportHotline: string;
  };
  audience: CustomerServiceAudienceEnum;
}

export interface StructuredManualStep {
  stepNumber: number;
  title: string;
  action: string;
  expectedResult: string;
  precautions?: string;
}

export interface StructuredManualFormData {
  title: string;
  modelIds: string[];
  audience: CustomerServiceAudienceEnum;
  prerequisites: string;
  steps: StructuredManualStep[];
  completionCriteria: string;
  failureTroubleshooting: string;
  escalationConditions: string;
}

export interface StructuredFaqItem {
  id: string;
  standardQuestion: string;
  similarQuestions: string[];
  conciseAnswer: string;
  detailedAnswer: string;
  categoryTag?: string;
}

export interface StructuredFaultStep {
  stepNumber: number;
  checkPoint: string;
  action: string;
  normalResult: string;
  abnormalFix: string;
  isDangerous?: boolean;
}

export interface StructuredFaultFormData {
  title: string;
  errorCode: string;
  symptom: string;
  modelIds: string[];
  riskLevel: 'normal' | 'warning' | 'hazard';
  applicableVersions: string;
  troubleshootingSteps: StructuredFaultStep[];
  escalationRules: string;
  audience: CustomerServiceAudienceEnum;
}

export interface BadcaseClusterItem {
  id: string;
  clusterTitle: string;
  clusterCount: number;
  sampleQuestions: string[];
  latestTime: string;
  affectedModelIds: string[];
  feedbackType: 'unresolved' | 'bad' | 'lowConfidence';
  representativeItem: OperationItem;
}

export interface HandoffAttributionItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  colorScheme: string;
  description: string;
}
