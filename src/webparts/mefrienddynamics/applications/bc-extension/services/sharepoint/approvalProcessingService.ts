import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { normalizeEmail, type MefriendModuleKey } from '../../config/sharePointConfig';
import type { ICustomerCreateFormState } from '../../models/customers';
import type { IRequestBase, RequestType } from '../../models/requests';
import type { ISalesOrderCreateFormState } from '../../models/salesOrders';
import type { IAppUser, IApprovalWorkflowStep } from '../../models/settings/IAppAccessModels';
import { AppAccessService } from './appAccessService';
import { ApprovalTaskService } from './approvalTaskService';
import { ApprovalWorkflowService } from './approvalWorkflowService';
import {
  evaluateLevelCompletion,
  getNextApprovalLevel,
  groupActiveWorkflowLevels,
  isEffectivelyFinalLevel,
  type IApprovalLevelDefinition
} from './approvalCalculations';
import { CustomerRequestService } from './customerRequestService';
import { SalesOrderRequestService, type ISalesOrderRequestHeaderSnapshot, type ISalesOrderRequestLineSnapshot } from './salesOrderRequestService';
import { SharePointRestClient } from '../../../../shared/services/sharepoint/sharePointRestClient';

export interface IApprovalProcessingServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

export interface IApprovalActionResult {
  requestType: RequestType;
  requestItemId: number;
  requestNumber: string;
  approvalStatus: IRequestBase['approvalStatus'];
  bcPostingStatus: IRequestBase['bcPostingStatus'];
  isWorkflowComplete: boolean;
}

export interface ISalesOrderResubmissionInput {
  form: ISalesOrderCreateFormState;
  sellToCustomerName: string;
  billToCustomerName: string;
  salespersonName: string;
  eventName: string;
  lineSnapshots: readonly {
    item: ISalesOrderCreateFormState['lines'][number];
    description: string;
    unitOfMeasureCode?: string;
  }[];
}

const toNumber = (value: number | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export class ApprovalProcessingService {
  private readonly appAccessService: AppAccessService;
  private readonly approvalTaskService: ApprovalTaskService;
  private readonly approvalWorkflowService: ApprovalWorkflowService;
  private readonly customerRequestService: CustomerRequestService;
  private readonly salesOrderRequestService: SalesOrderRequestService;
  private readonly restClient: SharePointRestClient;

  public constructor(options: IApprovalProcessingServiceOptions) {
    this.appAccessService = new AppAccessService(options);
    this.approvalTaskService = new ApprovalTaskService(options);
    this.approvalWorkflowService = new ApprovalWorkflowService(options);
    this.customerRequestService = new CustomerRequestService(options);
    this.salesOrderRequestService = new SalesOrderRequestService(options);
    this.restClient = new SharePointRestClient(options);
  }

  public async approveTask(taskId: number, comments: string = ''): Promise<IApprovalActionResult> {
    const context = await this.getApprovalContext(taskId);
    const now = new Date().toISOString();

    await this.approvalTaskService.updateTask(context.task.id, {
      taskStatus: 'Approved',
      isCurrent: false,
      actionById: context.currentSharePointUserId,
      actionOn: now,
      comments: this.mergeTaskComments(context.task.comments, comments)
    });

    const levelTasks = await this.approvalTaskService.getTasksForRequestCycleLevel(
      context.task.requestType,
      context.task.requestItemId,
      context.task.approvalCycle,
      context.task.levelNumber
    );
    const completion = evaluateLevelCompletion(context.currentLevel, levelTasks);

    if (!completion.isComplete) {
      await this.updateRequestState(context.task.requestType, context.task.requestItemId, {
        approvalStatus: 'In Approval',
        currentLevel: context.task.levelNumber,
        lastActionById: context.currentSharePointUserId,
        lastActionOn: now
      });

      return {
        requestType: context.task.requestType,
        requestItemId: context.task.requestItemId,
        requestNumber: context.task.requestNumber,
        approvalStatus: 'In Approval',
        bcPostingStatus: context.request.bcPostingStatus,
        isWorkflowComplete: false
      };
    }

    await this.skipRemainingLevelTasks(context.task, now, context.currentSharePointUserId, completion.shouldSkipRemaining);

    const nextLevel = getNextApprovalLevel(context.levels, context.task.levelNumber);

    if (nextLevel) {
      await this.approvalTaskService.createApprovalTasks({
        requestType: context.task.requestType,
        requestNumber: context.task.requestNumber,
        requestItemId: context.task.requestItemId,
        workflowId: context.request.workflowId,
        steps: this.resolveApproverEmails(nextLevel.steps, context.appUsers),
        approvalCycle: context.task.approvalCycle
      });
      await this.updateRequestState(context.task.requestType, context.task.requestItemId, {
        approvalStatus: 'In Approval',
        currentLevel: nextLevel.levelNumber,
        lastActionById: context.currentSharePointUserId,
        lastActionOn: now
      });

      return {
        requestType: context.task.requestType,
        requestItemId: context.task.requestItemId,
        requestNumber: context.task.requestNumber,
        approvalStatus: 'In Approval',
        bcPostingStatus: context.request.bcPostingStatus,
        isWorkflowComplete: false
      };
    }

    await this.updateRequestState(context.task.requestType, context.task.requestItemId, {
      approvalStatus: 'Approved',
      bcPostingStatus: 'Ready to Post',
      lastActionById: context.currentSharePointUserId,
      lastActionOn: now
    });

    return {
      requestType: context.task.requestType,
      requestItemId: context.task.requestItemId,
      requestNumber: context.task.requestNumber,
      approvalStatus: 'Approved',
      bcPostingStatus: 'Ready to Post',
      isWorkflowComplete: true
    };
  }

  public async rejectTask(taskId: number, reason: string, comments: string = ''): Promise<IApprovalActionResult> {
    if (!reason.trim()) {
      throw new Error('A rejection reason is required.');
    }

    const context = await this.getApprovalContext(taskId);

    if (!context.workflow.allowRejection) {
      throw new Error('This workflow does not allow rejection.');
    }

    const now = new Date().toISOString();
    await this.approvalTaskService.updateTask(context.task.id, {
      taskStatus: 'Rejected',
      isCurrent: false,
      actionById: context.currentSharePointUserId,
      actionOn: now,
      comments: this.mergeTaskComments(context.task.comments, comments || reason),
      reassignmentReason: reason
    });

    const cycleTasks = await this.approvalTaskService.getTasksForRequestCycle(
      context.task.requestType,
      context.task.requestItemId,
      context.task.approvalCycle
    );
    await Promise.all(cycleTasks
      .filter(task => task.id !== context.task.id && task.taskStatus === 'Pending')
      .map(task => this.approvalTaskService.updateTask(task.id, {
        taskStatus: 'Cancelled',
        isCurrent: false,
        actionById: context.currentSharePointUserId,
        actionOn: now,
        comments: this.mergeTaskComments(task.comments, 'Cancelled after rejection.')
      })));

    await this.updateRequestState(context.task.requestType, context.task.requestItemId, {
      approvalStatus: 'Rejected',
      rejectionReason: reason.trim(),
      bcPostingStatus: 'Not Ready',
      lastActionById: context.currentSharePointUserId,
      lastActionOn: now
    });

    return {
      requestType: context.task.requestType,
      requestItemId: context.task.requestItemId,
      requestNumber: context.task.requestNumber,
      approvalStatus: 'Rejected',
      bcPostingStatus: 'Not Ready',
      isWorkflowComplete: false
    };
  }

  public async resubmitCustomerRequest(requestId: number, form: ICustomerCreateFormState): Promise<void> {
    const request = await this.loadCustomerRequest(requestId);
    const context = await this.getResubmissionContext(request, 'customers');
    const now = new Date().toISOString();
    const nextCycle = request.approvalCycle + 1;

    await this.customerRequestService.updateRequestSnapshot(request.id, form);
    await this.customerRequestService.updateWorkflowState(request.id, {
      approvalStatus: 'Pending Approval',
      currentLevel: 1,
      approvalCycle: nextCycle,
      bcPostingStatus: 'Not Ready',
      rejectionReason: '',
      bcErrorMessage: '',
      lastActionById: context.currentSharePointUserId,
      lastActionOn: now
    });
    await this.approvalTaskService.createApprovalTasks({
      requestType: 'Customer',
      requestNumber: request.requestNumber,
      requestItemId: request.id,
      workflowId: request.workflowId,
      steps: context.levelOneSteps,
      approvalCycle: nextCycle
    });
  }

  public async updateCustomerRequestDuringApproval(taskId: number, form: ICustomerCreateFormState): Promise<void> {
    const context = await this.getApprovalContext(taskId);

    if (context.task.requestType !== 'Customer') {
      throw new Error('This approval task is not for a customer request.');
    }

    await this.customerRequestService.updateRequestSnapshot(context.task.requestItemId, form);
    await this.recordApprovalEdit(context);
  }

  public async updateSalesOrderRequestDuringApproval(taskId: number, input: ISalesOrderResubmissionInput): Promise<void> {
    const context = await this.getApprovalContext(taskId);

    if (context.task.requestType !== 'SalesOrder') {
      throw new Error('This approval task is not for a sales-order request.');
    }

    const snapshot = this.toSalesOrderHeaderSnapshot(input);
    const lineSnapshots = input.form.lines.map((line, index): ISalesOrderRequestLineSnapshot => ({
      item: line,
      lineNumber: index + 1,
      requestNumber: context.task.requestNumber,
      requestHeaderId: context.task.requestItemId,
      description: input.lineSnapshots[index] ? input.lineSnapshots[index].description : line.description,
      productDimensionCode: input.form.eventCode || '',
      unitOfMeasureCode: input.lineSnapshots[index] ? input.lineSnapshots[index].unitOfMeasureCode || '' : line.unitOfMeasureCode || ''
    }));

    await this.salesOrderRequestService.updateRequestSnapshot(snapshot, context.task.requestItemId);
    await this.salesOrderRequestService.replaceRequestLines(context.task.requestItemId, lineSnapshots);
    await this.recordApprovalEdit(context);
  }

  public async resubmitSalesOrderRequest(requestId: number, input: ISalesOrderResubmissionInput): Promise<void> {
    const request = await this.loadSalesOrderRequest(requestId);
    const context = await this.getResubmissionContext(request, 'salesOrders');
    const now = new Date().toISOString();
    const nextCycle = request.approvalCycle + 1;
    const snapshot = this.toSalesOrderHeaderSnapshot(input);
    const lineSnapshots = input.form.lines.map((line, index): ISalesOrderRequestLineSnapshot => ({
      item: line,
      lineNumber: index + 1,
      requestNumber: request.requestNumber,
      requestHeaderId: request.id,
      description: input.lineSnapshots[index] ? input.lineSnapshots[index].description : line.description,
      productDimensionCode: input.form.eventCode || '',
      unitOfMeasureCode: input.lineSnapshots[index] ? input.lineSnapshots[index].unitOfMeasureCode || '' : line.unitOfMeasureCode || ''
    }));

    await this.salesOrderRequestService.updateRequestSnapshot(snapshot, request.id);
    await this.salesOrderRequestService.replaceRequestLines(request.id, lineSnapshots);
    await this.salesOrderRequestService.updateWorkflowState(request.id, {
      approvalStatus: 'Pending Approval',
      currentLevel: 1,
      approvalCycle: nextCycle,
      bcPostingStatus: 'Not Ready',
      rejectionReason: '',
      bcErrorMessage: '',
      lastActionById: context.currentSharePointUserId,
      lastActionOn: now
    });
    await this.approvalTaskService.createApprovalTasks({
      requestType: 'SalesOrder',
      requestNumber: request.requestNumber,
      requestItemId: request.id,
      workflowId: request.workflowId,
      steps: context.levelOneSteps,
      approvalCycle: nextCycle
    });
  }

  public async isFinalLevelForTask(taskId: number): Promise<boolean> {
    const task = await this.approvalTaskService.getTaskById(taskId);

    if (!task) {
      return false;
    }

    const workflowSteps = await this.approvalWorkflowService.getWorkflowSteps(task.workflowId);
    const levels = groupActiveWorkflowLevels(workflowSteps);
    return isEffectivelyFinalLevel(levels, task.levelNumber);
  }

  private async getApprovalContext(taskId: number): Promise<{
    task: NonNullable<Awaited<ReturnType<ApprovalTaskService['getTaskById']>>>;
    request: IRequestBase;
    workflow: NonNullable<Awaited<ReturnType<ApprovalWorkflowService['getWorkflows']>>>[number];
    levels: readonly IApprovalLevelDefinition[];
    currentLevel: IApprovalLevelDefinition;
    appUsers: readonly IAppUser[];
    currentSharePointUserId: number;
    currentUserEmail: string;
  }> {
    const access = await this.appAccessService.getCurrentAccess(true);
    const approvalAccess = access.permissions.approvals;

    if (!access.isAuthorized || !approvalAccess || !approvalAccess.canApprove) {
      throw new Error('You do not have permission to approve requests.');
    }

    const task = await this.approvalTaskService.getTaskById(taskId);

    if (!task) {
      throw new Error('The approval task was not found.');
    }

    if (task.approverEmail !== normalizeEmail(access.signedInEmail)) {
      throw new Error('This approval task is assigned to another approver.');
    }

    if (task.taskStatus !== 'Pending' || !task.isCurrent) {
      throw new Error('This approval task has already been processed.');
    }

    const request = task.requestType === 'Customer'
      ? await this.loadCustomerRequest(task.requestItemId)
      : await this.loadSalesOrderRequest(task.requestItemId);

    if (request.currentLevel !== task.levelNumber || request.approvalCycle !== task.approvalCycle) {
      throw new Error('The request has moved to another approval level. Refresh the page.');
    }

    if (request.approvalStatus === 'Approved' || request.approvalStatus === 'Rejected' || request.approvalStatus === 'Cancelled' || request.bcPostingStatus === 'Posted') {
      throw new Error('This request can no longer be approved.');
    }

    if (request.approvalStatus !== 'Pending Approval' && request.approvalStatus !== 'In Approval') {
      throw new Error('This request is not currently in approval.');
    }

    const workflows = await this.approvalWorkflowService.getWorkflows();
    const workflow = workflows.filter(item => item.id === request.workflowId)[0];

    if (!workflow || !workflow.isActive) {
      throw new Error('The request workflow is no longer active.');
    }

    const workflowSteps = await this.approvalWorkflowService.getWorkflowSteps(request.workflowId);
    const levels = groupActiveWorkflowLevels(workflowSteps);
    const currentLevel = levels.filter(level => level.levelNumber === task.levelNumber)[0];

    if (!currentLevel || !currentLevel.steps.filter(step => step.id === task.workflowStepId)[0]) {
      throw new Error('The approval step is no longer valid.');
    }

    return {
      task,
      request,
      workflow,
      levels,
      currentLevel,
      appUsers: await this.appAccessService.getUsers(),
      currentSharePointUserId: await this.getCurrentSharePointUserId(access.signedInEmail),
      currentUserEmail: normalizeEmail(access.signedInEmail)
    };
  }

  private async recordApprovalEdit(context: {
    task: NonNullable<Awaited<ReturnType<ApprovalTaskService['getTaskById']>>>;
    currentUserEmail: string;
  }): Promise<void> {
    const auditNote = `Request updated during approval by ${context.currentUserEmail} at Stage ${context.task.levelNumber} on ${new Date().toISOString()}.`;
    await this.approvalTaskService.updateTaskComments(
      context.task.id,
      this.mergeTaskComments(context.task.comments, auditNote)
    );
  }

  private mergeTaskComments(existing?: string, next?: string): string {
    return [existing?.trim(), next?.trim()].filter(Boolean).join('\n');
  }

  private async getResubmissionContext(request: IRequestBase, moduleKey: MefriendModuleKey): Promise<{
    currentSharePointUserId: number;
    levelOneSteps: readonly IApprovalWorkflowStep[];
  }> {
    const access = await this.appAccessService.getCurrentAccess(true);
    const moduleAccess = access.permissions[moduleKey];

    if (!access.isAuthorized) {
      throw new Error('You do not have permission to resubmit requests.');
    }

    if (request.approvalStatus !== 'Rejected' || request.bcPostingStatus === 'Posted') {
      throw new Error('Only rejected requests that have not been posted to Business Central can be resubmitted.');
    }

    const isSubmitter = normalizeEmail(request.submittedByEmail) === normalizeEmail(access.signedInEmail);
    const canManage = moduleAccess && moduleAccess.canManage;

    if (!isSubmitter && !canManage) {
      throw new Error('Only the original submitter or a module manager can resubmit this request.');
    }

    const workflows = await this.approvalWorkflowService.getWorkflows();
    const workflow = workflows.filter(item => item.id === request.workflowId)[0];

    if (!workflow || !workflow.allowResubmission) {
      throw new Error('This workflow does not allow resubmission.');
    }

    const workflowSteps = await this.approvalWorkflowService.getWorkflowSteps(request.workflowId);
    const appUsers = await this.appAccessService.getUsers();
    const levelOne = groupActiveWorkflowLevels(workflowSteps).filter(level => level.levelNumber === 1)[0];

    if (!levelOne) {
      throw new Error('The retained workflow has no active level 1 approvers.');
    }

    return {
      currentSharePointUserId: await this.getCurrentSharePointUserId(access.signedInEmail),
      levelOneSteps: this.resolveApproverEmails(levelOne.steps, appUsers)
    };
  }

  private resolveApproverEmails(steps: readonly IApprovalWorkflowStep[], appUsers: readonly IAppUser[]): readonly IApprovalWorkflowStep[] {
    return steps.map(step => {
      const appUser = appUsers.filter(user => user.id === step.approverId)[0];

      if (!appUser || !appUser.isActive || !appUser.canAccessApp || !normalizeEmail(appUser.email)) {
        throw new Error(`Approver for workflow level ${step.levelNumber} is inactive or invalid.`);
      }

      return {
        ...step,
        approverTitle: step.approverTitle || appUser.title,
        approverEmail: normalizeEmail(step.approverEmail || appUser.email)
      };
    });
  }

  private async skipRemainingLevelTasks(
    approvedTask: { requestType: RequestType; requestItemId: number; approvalCycle: number; levelNumber: number; id: number },
    now: string,
    actionById: number,
    shouldSkipRemaining: boolean
  ): Promise<void> {
    if (!shouldSkipRemaining) {
      return;
    }

    const levelTasks = await this.approvalTaskService.getTasksForRequestCycleLevel(
      approvedTask.requestType,
      approvedTask.requestItemId,
      approvedTask.approvalCycle,
      approvedTask.levelNumber
    );

    await Promise.all(levelTasks
      .filter(task => task.id !== approvedTask.id && task.taskStatus === 'Pending')
      .map(task => this.approvalTaskService.updateTask(task.id, {
        taskStatus: 'Skipped',
        isCurrent: false,
        actionById,
        actionOn: now,
        comments: this.mergeTaskComments(task.comments, 'Skipped after approval threshold was met.')
      })));
  }

  private async updateRequestState(
    requestType: RequestType,
    requestId: number,
    input: {
      approvalStatus?: IRequestBase['approvalStatus'];
      currentLevel?: number;
      lastActionById?: number;
      lastActionOn?: string;
      rejectionReason?: string;
      bcPostingStatus?: IRequestBase['bcPostingStatus'];
    }
  ): Promise<void> {
    if (requestType === 'Customer') {
      await this.customerRequestService.updateWorkflowState(requestId, input);
      return;
    }

    await this.salesOrderRequestService.updateWorkflowState(requestId, input);
  }

  private async loadCustomerRequest(id: number): Promise<IRequestBase> {
    const request = await this.customerRequestService.getRequestById(id);

    if (!request) {
      throw new Error(`Customer request ${id} was not found.`);
    }

    return request;
  }

  private async loadSalesOrderRequest(id: number): Promise<IRequestBase> {
    const request = await this.salesOrderRequestService.getRequestById(id);

    if (!request) {
      throw new Error(`Sales order request ${id} was not found.`);
    }

    return request;
  }

  private async getCurrentSharePointUserId(email: string): Promise<number> {
    const ensuredUser = await this.restClient.ensureUser(email);
    return ensuredUser.id;
  }

  private toSalesOrderHeaderSnapshot(input: ISalesOrderResubmissionInput): ISalesOrderRequestHeaderSnapshot {
    const grossAmount = input.form.lines.reduce((total, line) => total + (toNumber(line.quantity) * toNumber(line.unitPrice)), 0);
    const netLinesBeforeInvoiceDiscount = input.form.lines.reduce((total, line) => total + toNumber(line.lineAmount), 0);
    const totalLineDiscount = Math.max(0, grossAmount - netLinesBeforeInvoiceDiscount);
    const netAmount = Math.max(0, netLinesBeforeInvoiceDiscount - toNumber(input.form.invoiceDiscountAmountExclVat));

    return {
      form: input.form,
      sellToCustomerName: input.sellToCustomerName,
      billToCustomerName: input.billToCustomerName,
      salespersonName: input.salespersonName,
      eventName: input.eventName,
      grossAmount: Number(grossAmount.toFixed(2)),
      totalLineDiscount: Number(totalLineDiscount.toFixed(2)),
      netAmount: Number(netAmount.toFixed(2)),
      lineCount: input.form.lines.length
    };
  }
}
