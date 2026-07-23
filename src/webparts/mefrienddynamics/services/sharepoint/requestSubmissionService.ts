import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { normalizeEmail, type MefriendApprovalEntityType, type MefriendModuleKey } from '../../config/sharePointConfig';
import type { ICustomerCreateFormState } from '../../models/customers';
import type { ISalesOrderCreateFormState, ISalesOrderLineItem } from '../../models/salesOrders';
import type {
  ICustomerRequest,
  IRequestDetailResult,
  IRequestSubmissionResult,
  IResolvedApprovalWorkflow,
  ISalesOrderRequest,
  ISalesOrderRequestDetailResult,
  ISalesOrderRequestLine
} from '../../models/requests';
import type { IAppUser, IApprovalWorkflowStep } from '../../models/settings/IAppAccessModels';
import { AppAccessService } from './appAccessService';
import { ApprovalTaskService } from './approvalTaskService';
import { ApprovalWorkflowService } from './approvalWorkflowService';
import { CustomerRequestService } from './customerRequestService';
import { SalesOrderRequestService } from './salesOrderRequestService';
import type { ISalesOrderRequestHeaderSnapshot } from './salesOrderRequestService';
import { SharePointRestClient } from './sharePointRestClient';

export interface IRequestSubmissionServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}

export interface ISalesOrderSubmissionLineSnapshot {
  item: ISalesOrderLineItem;
  description: string;
  unitOfMeasureCode?: string;
}

export interface ISalesOrderSubmissionInput {
  form: ISalesOrderCreateFormState;
  sellToCustomerName: string;
  billToCustomerName: string;
  salespersonName: string;
  eventName: string;
  lineSnapshots: readonly ISalesOrderSubmissionLineSnapshot[];
}

const knownSubmissionErrorMessage = 'Request submission failed before approval tasks could be prepared.';

const toNumber = (value: number | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export class RequestSubmissionService {
  private readonly appAccessService: AppAccessService;
  private readonly approvalTaskService: ApprovalTaskService;
  private readonly approvalWorkflowService: ApprovalWorkflowService;
  private readonly customerRequestService: CustomerRequestService;
  private readonly salesOrderRequestService: SalesOrderRequestService;
  private readonly restClient: SharePointRestClient;

  public constructor(options: IRequestSubmissionServiceOptions) {
    this.appAccessService = new AppAccessService(options);
    this.approvalTaskService = new ApprovalTaskService(options);
    this.approvalWorkflowService = new ApprovalWorkflowService(options);
    this.customerRequestService = new CustomerRequestService(options);
    this.salesOrderRequestService = new SalesOrderRequestService(options);
    this.restClient = new SharePointRestClient(options);
  }

  public async submitCustomerRequest(form: ICustomerCreateFormState): Promise<IRequestSubmissionResult<ICustomerRequest>> {
    await this.ensureCreatePermission('customers');
    const workflow = await this.resolveActiveWorkflow('Customer');
    const submittedById = await this.getCurrentSharePointUserId();
    let request: ICustomerRequest | undefined;

    try {
      request = await this.customerRequestService.createRequestHeader({
        form,
        workflowId: workflow.workflow.id || 0,
        submittedById
      });
      request = await this.customerRequestService.updateRequestNumber(request.id);
      const approvalTasks = await this.approvalTaskService.createInitialApprovalTasks({
        requestType: 'Customer',
        requestNumber: request.requestNumber,
        requestItemId: request.id,
        workflowId: workflow.workflow.id || 0,
        levelOneSteps: workflow.levelOneSteps,
        approvalCycle: request.approvalCycle
      });

      return { request, approvalTasks };
    } catch (error) {
      if (request && request.id) {
        await this.safeCancelCustomerRequest(request.id, 'Customer request submission failed while preparing approval tasks.');
      }
      console.error('Customer request submission failed.', error);
      throw this.toSubmissionError(error, knownSubmissionErrorMessage);
    }
  }

  public async submitSalesOrderRequest(input: ISalesOrderSubmissionInput): Promise<IRequestSubmissionResult<ISalesOrderRequest>> {
    await this.ensureCreatePermission('salesOrders');
    const workflow = await this.resolveActiveWorkflow('SalesOrder');
    const submittedById = await this.getCurrentSharePointUserId();
    const snapshot = this.toSalesOrderHeaderSnapshot(input);
    let request: ISalesOrderRequest | undefined;
    const createdLines: ISalesOrderRequestLine[] = [];

    try {
      request = await this.salesOrderRequestService.createRequestHeader({
        snapshot,
        workflowId: workflow.workflow.id || 0,
        submittedById
      });
      request = await this.salesOrderRequestService.updateRequestNumber(request.id);

      for (let index = 0; index < input.form.lines.length; index++) {
        const line = input.form.lines[index];
        const lineSnapshot = input.lineSnapshots[index];
        const createdLine = await this.salesOrderRequestService.createRequestLine({
          item: line,
          lineNumber: index + 1,
          requestNumber: request.requestNumber,
          requestHeaderId: request.id,
          description: lineSnapshot ? lineSnapshot.description : line.description,
          productDimensionCode: input.form.eventCode || '',
          unitOfMeasureCode: lineSnapshot ? lineSnapshot.unitOfMeasureCode || '' : line.unitOfMeasureCode || ''
        });
        createdLines.push(createdLine);
      }

      const approvalTasks = await this.approvalTaskService.createInitialApprovalTasks({
        requestType: 'SalesOrder',
        requestNumber: request.requestNumber,
        requestItemId: request.id,
        workflowId: workflow.workflow.id || 0,
        levelOneSteps: workflow.levelOneSteps,
        approvalCycle: request.approvalCycle
      });

      return { request, approvalTasks };
    } catch (error) {
      await this.rollbackSalesOrderLines(createdLines);
      if (request && request.id) {
        await this.safeCancelSalesOrderRequest(request.id, 'Sales order request submission failed while preparing request lines or approval tasks.');
      }
      console.error('Sales order request submission failed.', error);
      throw this.toSubmissionError(error, 'Sales order request submission failed before approval tasks could be prepared.');
    }
  }

  public async getCustomerRequestDetail(idOrRequestNumber: string): Promise<IRequestDetailResult<ICustomerRequest>> {
    const request = await this.loadCustomerRequest(idOrRequestNumber);
    const [tasks, workflows, steps] = await Promise.all([
      this.approvalTaskService.getTasksForRequest('Customer', request.requestNumber),
      this.approvalWorkflowService.getWorkflows(),
      this.approvalWorkflowService.getWorkflowSteps(request.workflowId)
    ]);

    return {
      request,
      workflow: workflows.filter(workflow => workflow.id === request.workflowId)[0],
      workflowSteps: steps,
      approvalTasks: tasks
    };
  }

  public async getSalesOrderRequestDetail(idOrRequestNumber: string): Promise<ISalesOrderRequestDetailResult> {
    const request = await this.loadSalesOrderRequest(idOrRequestNumber);
    const [lines, tasks, workflows, steps] = await Promise.all([
      this.salesOrderRequestService.getRequestLines(request.id),
      this.approvalTaskService.getTasksForRequest('SalesOrder', request.requestNumber),
      this.approvalWorkflowService.getWorkflows(),
      this.approvalWorkflowService.getWorkflowSteps(request.workflowId)
    ]);

    return {
      request,
      lines,
      workflow: workflows.filter(workflow => workflow.id === request.workflowId)[0],
      workflowSteps: steps,
      approvalTasks: tasks
    };
  }

  private async ensureCreatePermission(moduleKey: MefriendModuleKey): Promise<void> {
    const access = await this.appAccessService.getCurrentAccess(true);
    const moduleAccess = access.permissions[moduleKey];

    if (!access.isAuthorized || !moduleAccess || !moduleAccess.canView || !moduleAccess.canCreate) {
      throw new Error('You do not have permission to submit requests for this module.');
    }
  }

  private async resolveActiveWorkflow(entityType: MefriendApprovalEntityType): Promise<IResolvedApprovalWorkflow> {
    const workflows = await this.approvalWorkflowService.getWorkflows();
    const activeWorkflows = workflows.filter(workflow => workflow.entityType === entityType && workflow.isActive && workflow.id);

    if (activeWorkflows.length === 0) {
      throw new Error(`No active ${entityType} approval workflow is configured. Ask an administrator to configure Approval Management.`);
    }

    if (activeWorkflows.length > 1) {
      throw new Error(`Multiple active ${entityType} approval workflows are configured. Ask an administrator to keep exactly one active workflow in Approval Management.`);
    }

    const workflow = activeWorkflows[0];
    const steps = await this.approvalWorkflowService.getWorkflowSteps(workflow.id || 0);
    const activeSteps = steps.filter(step => step.isActive && step.approverId > 0 && step.id);
    const levelOneSteps = activeSteps.filter(step => step.levelNumber === 1);

    if (!levelOneSteps.length) {
      throw new Error(`The active ${entityType} workflow does not have a usable level 1 approver. Ask an administrator to update Approval Management.`);
    }

    const appUsers = await this.appAccessService.getUsers();
    const resolvedLevelOneSteps = this.validateAndResolveApprovers(entityType, levelOneSteps, appUsers);

    return {
      workflow,
      steps: activeSteps,
      levelOneSteps: resolvedLevelOneSteps
    };
  }

  private validateAndResolveApprovers(
    entityType: MefriendApprovalEntityType,
    levelOneSteps: readonly IApprovalWorkflowStep[],
    appUsers: readonly IAppUser[]
  ): readonly IApprovalWorkflowStep[] {
    return levelOneSteps.map(step => {
      const appUser = appUsers.filter(user => user.id === step.approverId)[0];

      if (!appUser || !appUser.isActive || !appUser.canAccessApp || !normalizeEmail(appUser.email)) {
        throw new Error(`The active ${entityType} workflow has an inactive or invalid level 1 approver. Ask an administrator to update Approval Management.`);
      }

      return {
        ...step,
        approverTitle: step.approverTitle || appUser.title,
        approverEmail: normalizeEmail(step.approverEmail || appUser.email)
      };
    });
  }

  private async getCurrentSharePointUserId(): Promise<number> {
    const access = await this.appAccessService.getCurrentAccess();
    const email = normalizeEmail(access.signedInEmail || (access.currentAppUser ? access.currentAppUser.email : ''));

    if (!email) {
      throw new Error('Unable to resolve the signed-in SharePoint user.');
    }

    const ensuredUser = await this.restClient.ensureUser(email);
    return ensuredUser.id;
  }

  private toSalesOrderHeaderSnapshot(input: ISalesOrderSubmissionInput): ISalesOrderRequestHeaderSnapshot {
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

  private async loadCustomerRequest(idOrRequestNumber: string): Promise<ICustomerRequest> {
    const id = Number(idOrRequestNumber);
    const request = Number.isFinite(id) && id > 0
      ? await this.customerRequestService.getRequestById(id)
      : await this.customerRequestService.getRequestByNumber(idOrRequestNumber);

    if (!request) {
      throw new Error(`Customer request ${idOrRequestNumber} was not found.`);
    }

    return request;
  }

  private async loadSalesOrderRequest(idOrRequestNumber: string): Promise<ISalesOrderRequest> {
    const id = Number(idOrRequestNumber);
    const request = Number.isFinite(id) && id > 0
      ? await this.salesOrderRequestService.getRequestById(id)
      : await this.salesOrderRequestService.getRequestByNumber(idOrRequestNumber);

    if (!request) {
      throw new Error(`Sales order request ${idOrRequestNumber} was not found.`);
    }

    return request;
  }

  private async rollbackSalesOrderLines(lines: readonly ISalesOrderRequestLine[]): Promise<void> {
    for (const line of lines) {
      try {
        await this.salesOrderRequestService.deleteRequestLine(line.id);
      } catch (rollbackError) {
        console.error('Unable to roll back sales order request line after submission failure.', rollbackError);
      }
    }
  }

  private async safeCancelCustomerRequest(id: number, reason: string): Promise<void> {
    try {
      await this.customerRequestService.cancelRequest(id, reason);
    } catch (rollbackError) {
      console.error('Unable to cancel incomplete customer request after submission failure.', rollbackError);
    }
  }

  private async safeCancelSalesOrderRequest(id: number, reason: string): Promise<void> {
    try {
      await this.salesOrderRequestService.cancelRequest(id, reason);
    } catch (rollbackError) {
      console.error('Unable to cancel incomplete sales order request after submission failure.', rollbackError);
    }
  }

  private toSubmissionError(error: unknown, fallbackMessage: string): Error {
    if (error instanceof Error && error.message && error.message !== knownSubmissionErrorMessage) {
      return error;
    }

    return new Error(fallbackMessage);
  }
}
