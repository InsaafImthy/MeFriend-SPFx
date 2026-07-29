import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import {
  mefriendFields,
  mefriendListTitles,
  type MefriendApprovalEntityType,
  type MefriendApprovalMode,
  type MefriendWorkflowFinalAction
} from '../../config/sharePointConfig';
import type {
  IApprovalWorkflow,
  IApprovalWorkflowStep,
  IWorkflowLevel
} from '../../models/settings/IAppAccessModels';
import { SharePointRestClient } from './sharePointRestClient';

interface IWorkflowListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  WorkflowCode?: string;
  EntityType?: string;
  Version?: number;
  IsActive?: boolean;
  AllowRejection?: boolean;
  AllowResubmission?: boolean;
  FinalAction?: string;
}

interface IWorkflowStepListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  WorkflowId?: number;
  LevelNumber?: number;
  StepName?: string;
  ApproverId?: number;
  Approver?: {
    Title?: string;
    Email?: string;
  };
  ApprovalMode?: string;
  RequiredApprovals?: number;
  IsFinalLevel?: boolean;
  Sequence?: number;
  IsActive?: boolean;
}

export interface IApprovalWorkflowServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

const workflowSelect = [
  'Id',
  'ID',
  'Title',
  'WorkflowCode',
  'EntityType',
  'Version',
  'IsActive',
  'AllowRejection',
  'AllowResubmission',
  'FinalAction'
];

const workflowStepSelect = [
  'Id',
  'ID',
  'Title',
  'WorkflowId',
  'LevelNumber',
  'StepName',
  'ApproverId',
  'Approver/Title',
  'Approver/Email',
  'ApprovalMode',
  'RequiredApprovals',
  'IsFinalLevel',
  'Sequence',
  'IsActive'
];

export class ApprovalWorkflowService {
  private readonly restClient: SharePointRestClient;

  public constructor(options: IApprovalWorkflowServiceOptions) {
    this.restClient = new SharePointRestClient(options);
  }

  public async getWorkflows(): Promise<readonly IApprovalWorkflow[]> {
    const items = await this.restClient.readItems<IWorkflowListItem>(mefriendListTitles.approvalWorkflows, {
      select: workflowSelect,
      orderBy: 'EntityType asc, Version desc'
    });

    return items.map(this.mapWorkflow).filter(workflow => !!workflow.workflowCode);
  }

  public async getWorkflowSteps(workflowId: number): Promise<readonly IApprovalWorkflowStep[]> {
    const items = await this.restClient.readItems<IWorkflowStepListItem>(mefriendListTitles.approvalWorkflowSteps, {
      select: workflowStepSelect,
      expand: ['Approver'],
      filter: `WorkflowId eq ${workflowId}`,
      orderBy: 'LevelNumber asc, Sequence asc'
    });

    return items.map(this.mapStep).filter(step => step.workflowId === workflowId);
  }

  public toLevels(steps: readonly IApprovalWorkflowStep[]): readonly IWorkflowLevel[] {
    const levelNumbers = steps
      .map(step => step.levelNumber)
      .filter((levelNumber, index, all) => all.indexOf(levelNumber) === index)
      .sort((first, second) => first - second);

    return levelNumbers.map(levelNumber => {
      const levelSteps = steps.filter(step => step.levelNumber === levelNumber);
      const firstStep = levelSteps[0];
      const stepIdsByApproverId = levelSteps.reduce<Record<number, number>>((map, step) => {
        if (step.id) {
          map[step.approverId] = step.id;
        }
        return map;
      }, {});

      return {
        localId: `level-${levelNumber}`,
        levelNumber,
        stepName: firstStep.stepName,
        approvalMode: firstStep.approvalMode,
        requiredApprovals: firstStep.requiredApprovals,
        isFinalLevel: firstStep.isFinalLevel,
        sequence: firstStep.sequence,
        isActive: firstStep.isActive,
        approverIds: levelSteps.map(step => step.approverId),
        stepIdsByApproverId
      };
    });
  }

  public async saveWorkflow(workflow: IApprovalWorkflow, levels: readonly IWorkflowLevel[]): Promise<IApprovalWorkflow> {
    this.validateWorkflow(workflow, levels);
    const existing = await this.getWorkflows();
    const duplicateCode = existing.filter(item =>
      item.workflowCode.toLowerCase() === workflow.workflowCode.trim().toLowerCase() && item.id !== workflow.id
    )[0];

    if (duplicateCode) {
      throw new Error('Workflow code must be unique.');
    }

    const duplicateEntity = existing.filter(item => item.entityType === workflow.entityType && item.id !== workflow.id)[0];

    if (duplicateEntity) {
      throw new Error(`${workflow.entityType} already has a workflow. Edit ${duplicateEntity.title} instead of creating another flow for the same entity.`);
    }

    const payload = {
      Title: workflow.title.trim(),
      WorkflowCode: workflow.workflowCode.trim(),
      EntityType: workflow.entityType,
      Version: workflow.version,
      IsActive: workflow.isActive,
      AllowRejection: workflow.allowRejection,
      AllowResubmission: workflow.allowResubmission,
      FinalAction: workflow.finalAction
    };

    let savedWorkflow: IApprovalWorkflow;

    if (workflow.id) {
      await this.restClient.updateItem(mefriendListTitles.approvalWorkflows, workflow.id, payload);
      savedWorkflow = { ...workflow, title: payload.Title, workflowCode: payload.WorkflowCode };
    } else {
      const created = await this.restClient.createItem<typeof payload, IWorkflowListItem>(mefriendListTitles.approvalWorkflows, payload);
      savedWorkflow = this.mapWorkflow(created);
    }

    await this.saveLevels(savedWorkflow.id || 0, levels);
    return savedWorkflow;
  }

  public validateWorkflow(workflow: IApprovalWorkflow, levels: readonly IWorkflowLevel[]): void {
    if (!workflow.title.trim() || !workflow.workflowCode.trim()) {
      throw new Error('Workflow title and code are required.');
    }

    if (workflow.version <= 0) {
      throw new Error('Workflow version must be a positive number.');
    }

    const activeLevels = levels.filter(level => level.isActive);

    if (workflow.isActive && !activeLevels.length) {
      throw new Error('An active workflow must contain at least one active approval level.');
    }

    activeLevels.forEach((level, index) => {
      if (level.levelNumber !== index + 1) {
        throw new Error('Level numbers must be sequential beginning at 1.');
      }

      const activeApproverIds = level.approverIds.filter(approverId => approverId > 0);
      const uniqueApproverIds = activeApproverIds.filter((approverId, approverIndex) => activeApproverIds.indexOf(approverId) === approverIndex);

      if (!activeApproverIds.length) {
        throw new Error(`Level ${level.levelNumber} requires at least one active approver.`);
      }

      if (uniqueApproverIds.length !== activeApproverIds.length) {
        throw new Error(`Level ${level.levelNumber} contains the same approver more than once.`);
      }

      if (level.requiredApprovals < 1 || level.requiredApprovals > activeApproverIds.length) {
        throw new Error(`Level ${level.levelNumber} has an invalid required approval count.`);
      }
    });

    if (workflow.isActive) {
      const finalLevels = activeLevels.filter(level => level.isFinalLevel);
      const highestLevel = activeLevels[activeLevels.length - 1];

      if (finalLevels.length !== 1 || !highestLevel || !highestLevel.isFinalLevel) {
        throw new Error('An active workflow must have exactly one final level, and it must be the highest level.');
      }
    }
  }

  private async saveLevels(workflowId: number, levels: readonly IWorkflowLevel[]): Promise<void> {
    const existingSteps = workflowId ? await this.getWorkflowSteps(workflowId) : [];
    const retainedStepIds: number[] = [];

    for (const level of levels) {
      for (const approverId of level.approverIds) {
        const existingId = level.stepIdsByApproverId ? level.stepIdsByApproverId[approverId] : undefined;
        const payload = {
          Title: `${level.levelNumber}-${level.stepName}-${approverId}`,
          [mefriendFields.approvalWorkflowSteps.workflowId]: workflowId,
          LevelNumber: level.levelNumber,
          StepName: level.stepName,
          [mefriendFields.approvalWorkflowSteps.approverId]: approverId,
          ApprovalMode: level.approvalMode,
          RequiredApprovals: level.requiredApprovals,
          IsFinalLevel: level.isFinalLevel,
          Sequence: level.sequence,
          IsActive: level.isActive
        };

        if (existingId) {
          await this.restClient.updateItem(mefriendListTitles.approvalWorkflowSteps, existingId, payload);
          retainedStepIds.push(existingId);
        } else {
          const created = await this.restClient.createItem<typeof payload, IWorkflowStepListItem>(mefriendListTitles.approvalWorkflowSteps, payload);
          const createdId = created.Id || created.ID;
          if (createdId) {
            retainedStepIds.push(createdId);
          }
        }
      }
    }

    for (const step of existingSteps) {
      if (step.id && retainedStepIds.indexOf(step.id) === -1) {
        await this.restClient.updateItem(mefriendListTitles.approvalWorkflowSteps, step.id, { IsActive: false });
      }
    }
  }

  private mapWorkflow(item: IWorkflowListItem): IApprovalWorkflow {
    return {
      id: item.Id || item.ID,
      title: item.Title || '',
      workflowCode: item.WorkflowCode || '',
      entityType: (item.EntityType || 'Customer') as MefriendApprovalEntityType,
      version: item.Version || 1,
      isActive: item.IsActive === true,
      allowRejection: item.AllowRejection !== false,
      allowResubmission: item.AllowResubmission !== false,
      finalAction: (item.FinalAction || 'ApproveOnly') as MefriendWorkflowFinalAction
    };
  }

  private mapStep(item: IWorkflowStepListItem): IApprovalWorkflowStep {
    return {
      id: item.Id || item.ID,
      title: item.Title || '',
      workflowId: item.WorkflowId || 0,
      levelNumber: item.LevelNumber || 1,
      stepName: item.StepName || '',
      approverId: item.ApproverId || 0,
      approverTitle: item.Approver ? item.Approver.Title : undefined,
      approverEmail: item.Approver ? item.Approver.Email : undefined,
      approvalMode: (item.ApprovalMode || 'Any') as MefriendApprovalMode,
      requiredApprovals: item.RequiredApprovals || 1,
      isFinalLevel: item.IsFinalLevel === true,
      sequence: item.Sequence || item.LevelNumber || 1,
      isActive: item.IsActive !== false
    };
  }
}
