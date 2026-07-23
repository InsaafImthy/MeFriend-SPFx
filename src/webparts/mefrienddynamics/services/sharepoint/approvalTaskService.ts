import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { mefriendFields, mefriendListTitles, normalizeEmail } from '../../config/sharePointConfig';
import type { IApprovalWorkflowStep } from '../../models/settings/IAppAccessModels';
import type { IApprovalTask, RequestType } from '../../models/requests';
import { SharePointRestClient } from './sharePointRestClient';

interface IApprovalTaskListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  TaskNumber?: string;
  RequestType?: string;
  RequestNumber?: string;
  RequestItemId?: number;
  WorkflowId?: number;
  Workflow?: { Title?: string };
  WorkflowStepId?: number;
  WorkflowStep?: { Title?: string };
  LevelNumber?: number;
  ApprovalCycle?: number;
  ApproverId?: number;
  Approver?: { Title?: string; Email?: string; EMail?: string };
  ApproverEmail?: string;
  TaskStatus?: string;
  IsCurrent?: boolean;
  AssignedOn?: string;
  ActionOn?: string;
  ActionById?: number;
  ActionBy?: { Title?: string };
  Comments?: string;
  ReassignmentReason?: string;
}

export interface IApprovalTaskServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}

export interface ICreateInitialApprovalTasksInput {
  requestType: RequestType;
  requestNumber: string;
  requestItemId: number;
  workflowId: number;
  levelOneSteps: readonly IApprovalWorkflowStep[];
  approvalCycle?: number;
}

const taskSelect = [
  'Id',
  'ID',
  'Title',
  'TaskNumber',
  'RequestType',
  'RequestNumber',
  'RequestItemId',
  'WorkflowId',
  'Workflow/Title',
  'WorkflowStepId',
  'WorkflowStep/Title',
  'LevelNumber',
  'ApprovalCycle',
  'ApproverId',
  'Approver/Title',
  'Approver/Email',
  'ApproverEmail',
  'TaskStatus',
  'IsCurrent',
  'AssignedOn',
  'ActionOn',
  'ActionById',
  'ActionBy/Title',
  'Comments',
  'ReassignmentReason'
];

const padIndex = (value: number): string => {
  const text = value.toString();
  return text.length >= 2 ? text : `0${text}`;
};

export class ApprovalTaskService {
  private readonly restClient: SharePointRestClient;

  public constructor(options: IApprovalTaskServiceOptions) {
    this.restClient = new SharePointRestClient(options);
  }

  public async getTasksForRequest(requestType: RequestType, requestNumber: string): Promise<readonly IApprovalTask[]> {
    const escapedRequestNumber = this.restClient.escapeODataString(requestNumber);
    const items = await this.restClient.readItems<IApprovalTaskListItem>(mefriendListTitles.approvalTasks, {
      select: taskSelect,
      expand: ['Workflow', 'WorkflowStep', 'Approver', 'ActionBy'],
      filter: `RequestType eq '${requestType}' and RequestNumber eq '${escapedRequestNumber}'`,
      orderBy: 'LevelNumber asc, TaskNumber asc'
    });

    return items.map(this.mapTask);
  }

  public async createInitialApprovalTasks(input: ICreateInitialApprovalTasksInput): Promise<readonly IApprovalTask[]> {
    const createdTasks: IApprovalTask[] = [];
    const now = new Date().toISOString();
    const cycle = input.approvalCycle || 1;

    try {
      for (let index = 0; index < input.levelOneSteps.length; index++) {
        const step = input.levelOneSteps[index];
        const taskNumber = this.getTaskNumber(input.requestType, input.requestNumber, cycle, step.levelNumber, index + 1);
        const payload = {
          [mefriendFields.approvalTasks.title]: taskNumber,
          [mefriendFields.approvalTasks.taskNumber]: taskNumber,
          [mefriendFields.approvalTasks.requestType]: input.requestType,
          [mefriendFields.approvalTasks.requestNumber]: input.requestNumber,
          [mefriendFields.approvalTasks.requestItemId]: input.requestItemId,
          [mefriendFields.approvalTasks.workflowId]: input.workflowId,
          [mefriendFields.approvalTasks.workflowStepId]: step.id || 0,
          [mefriendFields.approvalTasks.levelNumber]: step.levelNumber,
          [mefriendFields.approvalTasks.approvalCycle]: cycle,
          [mefriendFields.approvalTasks.approverId]: step.approverId,
          [mefriendFields.approvalTasks.approverEmail]: normalizeEmail(step.approverEmail),
          [mefriendFields.approvalTasks.taskStatus]: 'Pending',
          [mefriendFields.approvalTasks.isCurrent]: true,
          [mefriendFields.approvalTasks.assignedOn]: now,
          [mefriendFields.approvalTasks.comments]: '',
          [mefriendFields.approvalTasks.reassignmentReason]: ''
        };

        const created = await this.restClient.createItem<typeof payload, IApprovalTaskListItem>(
          mefriendListTitles.approvalTasks,
          payload
        );
        createdTasks.push(this.mapTask(created));
      }
    } catch (error) {
      await this.rollbackCreatedTasks(createdTasks);
      throw error;
    }

    return createdTasks;
  }

  public async deleteTask(id: number): Promise<void> {
    await this.restClient.deleteItem(mefriendListTitles.approvalTasks, id);
  }

  private getTaskNumber(requestType: RequestType, requestNumber: string, cycle: number, levelNumber: number, index: number): string {
    const prefix = requestType === 'Customer' ? 'APR' : 'APR';
    return `${prefix}-${requestNumber}-C${cycle}-L${levelNumber}-${padIndex(index)}`;
  }

  private async rollbackCreatedTasks(tasks: readonly IApprovalTask[]): Promise<void> {
    for (const task of tasks) {
      try {
        await this.deleteTask(task.id);
      } catch (rollbackError) {
        console.error('Unable to roll back approval task after submission failure.', rollbackError);
      }
    }
  }

  private mapTask(item: IApprovalTaskListItem): IApprovalTask {
    return {
      id: item.Id || item.ID || 0,
      title: item.Title || '',
      taskNumber: item.TaskNumber || item.Title || '',
      requestType: (item.RequestType || 'Customer') as RequestType,
      requestNumber: item.RequestNumber || '',
      requestItemId: item.RequestItemId || 0,
      workflowId: item.WorkflowId || 0,
      workflowTitle: item.Workflow ? item.Workflow.Title : undefined,
      workflowStepId: item.WorkflowStepId || 0,
      workflowStepTitle: item.WorkflowStep ? item.WorkflowStep.Title : undefined,
      levelNumber: item.LevelNumber || 1,
      approvalCycle: item.ApprovalCycle || 1,
      approverId: item.ApproverId || 0,
      approverTitle: item.Approver ? item.Approver.Title : undefined,
      approverEmail: normalizeEmail(item.ApproverEmail || (item.Approver ? item.Approver.Email || item.Approver.EMail : '')),
      taskStatus: (item.TaskStatus || 'Pending') as IApprovalTask['taskStatus'],
      isCurrent: item.IsCurrent === true,
      assignedOn: item.AssignedOn,
      actionOn: item.ActionOn,
      actionById: item.ActionById,
      actionByTitle: item.ActionBy ? item.ActionBy.Title : undefined,
      comments: item.Comments || '',
      reassignmentReason: item.ReassignmentReason || ''
    };
  }
}
