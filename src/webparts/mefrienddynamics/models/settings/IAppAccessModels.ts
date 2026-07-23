import type {
  MefriendApprovalEntityType,
  MefriendApprovalMode,
  MefriendModuleKey,
  MefriendWorkflowFinalAction
} from '../../config/sharePointConfig';

export type AppPermissionFlag = 'canView' | 'canCreate' | 'canApprove' | 'canPostToBC' | 'canManage';

export interface IAppUser {
  id: number;
  title: string;
  email: string;
  role: string;
  canAccessApp: boolean;
  isActive: boolean;
  userId?: number;
  userTitle?: string;
  userEmail?: string;
}

export interface IAppUserInput {
  id?: number;
  title: string;
  email: string;
  role: string;
  canAccessApp: boolean;
  isActive: boolean;
}

export interface IAppUserPermission {
  id?: number;
  title: string;
  appUserId: number;
  moduleKey: MefriendModuleKey;
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canPostToBC: boolean;
  canManage: boolean;
  isActive: boolean;
}

export interface IModuleAccess {
  moduleKey: MefriendModuleKey;
  canView: boolean;
  canCreate: boolean;
  canApprove: boolean;
  canPostToBC: boolean;
  canManage: boolean;
  isActive: boolean;
}

export interface ICurrentAppAccess {
  currentAppUser?: IAppUser;
  signedInEmail: string;
  permissions: Readonly<Record<string, IModuleAccess>>;
  isAuthorized: boolean;
  accessError?: string;
}

export interface IApprovalWorkflow {
  id?: number;
  title: string;
  workflowCode: string;
  entityType: MefriendApprovalEntityType;
  version: number;
  isActive: boolean;
  allowRejection: boolean;
  allowResubmission: boolean;
  finalAction: MefriendWorkflowFinalAction;
}

export interface IApprovalWorkflowStep {
  id?: number;
  title: string;
  workflowId: number;
  levelNumber: number;
  stepName: string;
  approverId: number;
  approverTitle?: string;
  approverEmail?: string;
  approvalMode: MefriendApprovalMode;
  requiredApprovals: number;
  isFinalLevel: boolean;
  sequence: number;
  isActive: boolean;
  instructions: string;
}

export interface IWorkflowLevel {
  localId: string;
  levelNumber: number;
  stepName: string;
  approvalMode: MefriendApprovalMode;
  requiredApprovals: number;
  isFinalLevel: boolean;
  sequence: number;
  isActive: boolean;
  instructions: string;
  approverIds: readonly number[];
  stepIdsByApproverId?: Readonly<Record<number, number>>;
}
