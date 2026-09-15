import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { mefriendFields, mefriendListTitles, normalizeEmail } from '../../config/sharePointConfig';
import type { IApprovalWorkflowStep } from '../../models/settings/IAppAccessModels';
import type { ApprovalTaskStatus, IApprovalTask, IApprovalTaskRequestSummary, RequestType } from '../../models/requests';
import { SharePointRestClient } from '../../../../shared/services/sharepoint/sharePointRestClient';

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
  webAbsoluteUrl?: string;
}

export interface ICreateInitialApprovalTasksInput {
  requestType: RequestType;
  requestNumber: string;
  requestItemId: number;
  workflowId: number;
  levelOneSteps: readonly IApprovalWorkflowStep[];
  approvalCycle?: number;
}

export interface ICreateApprovalTasksInput {
  requestType: RequestType;
  requestNumber: string;
  requestItemId: number;
  workflowId: number;
  steps: readonly IApprovalWorkflowStep[];
  approvalCycle: number;
}

export interface IUpdateApprovalTaskInput {
  taskStatus: ApprovalTaskStatus;
  isCurrent: boolean;
  actionById?: number;
  actionOn?: string;
  comments?: string;
  reassignmentReason?: string;
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

  public async getPendingTasksForApprover(approverEmail: string): Promise<readonly IApprovalTask[]> {
    const normalizedEmail = normalizeEmail(approverEmail);
    const escapedEmail = this.restClient.escapeODataString(normalizedEmail);
    const items = await this.restClient.readItems<IApprovalTaskListItem>(mefriendListTitles.approvalTasks, {
      select: taskSelect,
      expand: ['Workflow', 'WorkflowStep', 'Approver', 'ActionBy'],
      filter: `ApproverEmail eq '${escapedEmail}' and TaskStatus eq 'Pending' and IsCurrent eq 1`,
      orderBy: 'AssignedOn desc'
    });

    return items.map(this.mapTask);
  }

  public async getPendingTaskSummariesForApprover(approverEmail: string): Promise<readonly IApprovalTaskRequestSummary[]> {
    const tasks = await this.getPendingTasksForApprover(approverEmail);

    return Promise.all(tasks.map(async task => {
      const request = task.requestType === 'Customer'
        ? await this.loadCustomerSummary(task.requestItemId)
        : await this.loadSalesOrderSummary(task.requestItemId);

      return {
        ...task,
        submittedByTitle: request?.submittedByTitle,
        submittedByEmail: request?.submittedByEmail,
        customerName: request?.customerName,
        requestApprovalStatus: request?.requestApprovalStatus,
        requestBCPostingStatus: request?.requestBCPostingStatus
      };
    }));
  }

  public async getTaskById(id: number): Promise<IApprovalTask | undefined> {
    const items = await this.restClient.readItems<IApprovalTaskListItem>(mefriendListTitles.approvalTasks, {
      select: taskSelect,
      expand: ['Workflow', 'WorkflowStep', 'Approver', 'ActionBy'],
      filter: `Id eq ${id}`,
      top: 1
    });

    return items.length ? this.mapTask(items[0]) : undefined;
  }

  public async getTasksForRequestCycle(
    requestType: RequestType,
    requestItemId: number,
    approvalCycle: number
  ): Promise<readonly IApprovalTask[]> {
    const items = await this.restClient.readItems<IApprovalTaskListItem>(mefriendListTitles.approvalTasks, {
      select: taskSelect,
      expand: ['Workflow', 'WorkflowStep', 'Approver', 'ActionBy'],
      filter: `RequestType eq '${requestType}' and RequestItemId eq ${requestItemId} and ApprovalCycle eq ${approvalCycle}`,
      orderBy: 'LevelNumber asc, TaskNumber asc'
    });

    return items.map(this.mapTask);
  }

  public async getTasksForRequestCycleLevel(
    requestType: RequestType,
    requestItemId: number,
    approvalCycle: number,
    levelNumber: number
  ): Promise<readonly IApprovalTask[]> {
    const items = await this.restClient.readItems<IApprovalTaskListItem>(mefriendListTitles.approvalTasks, {
      select: taskSelect,
      expand: ['Workflow', 'WorkflowStep', 'Approver', 'ActionBy'],
      filter: `RequestType eq '${requestType}' and RequestItemId eq ${requestItemId} and ApprovalCycle eq ${approvalCycle} and LevelNumber eq ${levelNumber}`,
      orderBy: 'TaskNumber asc'
    });

    return items.map(this.mapTask);
  }

  public async createInitialApprovalTasks(input: ICreateInitialApprovalTasksInput): Promise<readonly IApprovalTask[]> {
    return this.createApprovalTasks({
      requestType: input.requestType,
      requestNumber: input.requestNumber,
      requestItemId: input.requestItemId,
      workflowId: input.workflowId,
      steps: input.levelOneSteps,
      approvalCycle: input.approvalCycle || 1
    });
  }

  public async createApprovalTasks(input: ICreateApprovalTasksInput): Promise<readonly IApprovalTask[]> {
    const createdTasks: IApprovalTask[] = [];
    const now = new Date().toISOString();
    const cycle = input.approvalCycle || 1;

    try {
      for (let index = 0; index < input.steps.length; index++) {
        const step = input.steps[index];
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

  public async updateTask(id: number, input: IUpdateApprovalTaskInput): Promise<void> {
    const payload: Record<string, unknown> = {
      [mefriendFields.approvalTasks.taskStatus]: input.taskStatus,
      [mefriendFields.approvalTasks.isCurrent]: input.isCurrent
    };

    if (input.actionById !== undefined) {
      payload[mefriendFields.approvalTasks.actionById] = input.actionById;
    }

    if (input.actionOn !== undefined) {
      payload[mefriendFields.approvalTasks.actionOn] = input.actionOn;
    }

    if (input.comments !== undefined) {
      payload[mefriendFields.approvalTasks.comments] = input.comments;
    }

    if (input.reassignmentReason !== undefined) {
      payload[mefriendFields.approvalTasks.reassignmentReason] = input.reassignmentReason;
    }

    await this.restClient.updateItem(mefriendListTitles.approvalTasks, id, payload);
  }

  public async updateTaskComments(id: number, comments: string): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.approvalTasks, id, {
      [mefriendFields.approvalTasks.comments]: comments
    });
  }

  public async deleteTask(id: number): Promise<void> {
    await this.restClient.deleteItem(mefriendListTitles.approvalTasks, id);
  }

  private getTaskNumber(requestType: RequestType, requestNumber: string, cycle: number, levelNumber: number, index: number): string {
    const prefix = requestType === 'Customer' ? 'APR' : 'APR';
    return `${prefix}-${requestNumber}-C${cycle}-L${levelNumber}-${padIndex(index)}`;
  }

  private async loadCustomerSummary(id: number): Promise<IApprovalTaskRequestSummary | undefined> {
    const items = await this.restClient.readItems<{
      Id?: number;
      ApprovalStatus?: string;
      BCPostingStatus?: string;
      CustomerName?: string;
      SubmittedBy?: { Title?: string; EMail?: string; Email?: string };
    }>(mefriendListTitles.customerRequests, {
      select: [
        'Id',
        'ApprovalStatus',
        'BCPostingStatus',
        'CustomerName',
        'SubmittedBy/Title',
        'SubmittedBy/EMail'
      ],
      expand: ['SubmittedBy'],
      filter: `Id eq ${id}`,
      top: 1
    });
    const item = items[0];

    return item ? {
      id: item.Id || 0,
      title: '',
      taskNumber: '',
      requestType: 'Customer',
      requestNumber: '',
      requestItemId: id,
      workflowId: 0,
      workflowStepId: 0,
      levelNumber: 0,
      approvalCycle: 0,
      approverId: 0,
      approverEmail: '',
      taskStatus: 'Pending',
      isCurrent: true,
      customerName: item.CustomerName || '',
      requestApprovalStatus: item.ApprovalStatus as IApprovalTaskRequestSummary['requestApprovalStatus'],
      requestBCPostingStatus: item.BCPostingStatus as IApprovalTaskRequestSummary['requestBCPostingStatus'],
      submittedByTitle: item.SubmittedBy?.Title,
      submittedByEmail: item.SubmittedBy ? normalizeEmail(item.SubmittedBy.EMail || item.SubmittedBy.Email) : undefined
    } : undefined;
  }

  private async loadSalesOrderSummary(id: number): Promise<IApprovalTaskRequestSummary | undefined> {
    const items = await this.restClient.readItems<{
      Id?: number;
      ApprovalStatus?: string;
      BCPostingStatus?: string;
      SellToCustomerName?: string;
      SellToCustomerCode?: string;
      SubmittedBy?: { Title?: string; EMail?: string; Email?: string };
    }>(mefriendListTitles.salesOrderRequests, {
      select: [
        'Id',
        'ApprovalStatus',
        'BCPostingStatus',
        'SellToCustomerName',
        'SellToCustomerCode',
        'SubmittedBy/Title',
        'SubmittedBy/EMail'
      ],
      expand: ['SubmittedBy'],
      filter: `Id eq ${id}`,
      top: 1
    });
    const item = items[0];

    return item ? {
      id: item.Id || 0,
      title: '',
      taskNumber: '',
      requestType: 'SalesOrder',
      requestNumber: '',
      requestItemId: id,
      workflowId: 0,
      workflowStepId: 0,
      levelNumber: 0,
      approvalCycle: 0,
      approverId: 0,
      approverEmail: '',
      taskStatus: 'Pending',
      isCurrent: true,
      customerName: item.SellToCustomerName || item.SellToCustomerCode || '',
      requestApprovalStatus: item.ApprovalStatus as IApprovalTaskRequestSummary['requestApprovalStatus'],
      requestBCPostingStatus: item.BCPostingStatus as IApprovalTaskRequestSummary['requestBCPostingStatus'],
      submittedByTitle: item.SubmittedBy?.Title,
      submittedByEmail: item.SubmittedBy ? normalizeEmail(item.SubmittedBy.EMail || item.SubmittedBy.Email) : undefined
    } : undefined;
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
