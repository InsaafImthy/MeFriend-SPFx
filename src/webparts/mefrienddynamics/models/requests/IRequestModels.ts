import type { IApprovalWorkflow, IApprovalWorkflowStep } from '../settings/IAppAccessModels';

export type RequestType = 'Customer' | 'SalesOrder';

export type RequestStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'In Approval'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export type BCPostingStatus =
  | 'Not Ready'
  | 'Ready to Post'
  | 'Posting'
  | 'Posted'
  | 'Failed';

export type ApprovalTaskStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled' | 'Skipped';
export type BCIntegrationOperation = 'CreateCustomer' | 'CreateSalesOrder';
export type BCIntegrationStatus = 'Ready' | 'Processing' | 'Succeeded' | 'Failed' | 'Cancelled';

export interface IRequestBase {
  id: number;
  title: string;
  requestNumber: string;
  approvalStatus: RequestStatus;
  workflowId: number;
  workflowTitle?: string;
  currentLevel: number;
  approvalCycle: number;
  submittedById?: number;
  submittedByTitle?: string;
  submittedByEmail?: string;
  submittedOn?: string;
  lastActionById?: number;
  lastActionByTitle?: string;
  lastActionByEmail?: string;
  lastActionOn?: string;
  rejectionReason?: string;
  bcPostingStatus: BCPostingStatus;
  bcSystemId?: string;
  bcPostedOn?: string;
  bcErrorMessage?: string;
}

export interface ICustomerRequest extends IRequestBase {
  customerName: string;
  name2: string;
  address: string;
  address2: string;
  stateCode: string;
  countryRegionCode: string;
  city: string;
  postCode: string;
  locationCode: string;
  phoneNumber: string;
  PAN: string;
  gstRegistrationNo: string;
  genPostingGroup: string;
  customerPostingGroup: string;
  gstCustomerType: string;
  bcCustomerNumber?: string;
}

export interface ISalesOrderRequest extends IRequestBase {
  sellToCustomerCode: string;
  sellToCustomerName: string;
  billToCustomerCode: string;
  billToCustomerName: string;
  salespersonCode: string;
  salespersonName: string;
  eventCode: string;
  eventName: string;
  countryCode: string;
  stateCode: string;
  orderDate?: string;
  postingDate?: string;
  externalDocumentNumber: string;
  remarks: string;
  currencyCode: string;
  invoiceDiscountAmountExclVat: number;
  invoiceDiscountPercent: number;
  grossAmount: number;
  totalLineDiscount: number;
  netAmount: number;
  lineCount: number;
  bcSalesOrderNumber?: string;
}

export interface ISalesOrderRequestLine {
  id: number;
  title: string;
  salesOrderRequestId: number;
  requestNumber: string;
  lineNumber: number;
  itemCode: string;
  description: string;
  quantity: number;
  rate: number;
  lineDiscountPercentage: number;
  lineAmount: number;
  netLineAmount: number;
  productDimensionCode: string;
  unitOfMeasureCode: string;
  isActive: boolean;
}

export interface IApprovalTask {
  id: number;
  title: string;
  taskNumber: string;
  requestType: RequestType;
  requestNumber: string;
  requestItemId: number;
  workflowId: number;
  workflowTitle?: string;
  workflowStepId: number;
  workflowStepTitle?: string;
  levelNumber: number;
  approvalCycle: number;
  approverId: number;
  approverTitle?: string;
  approverEmail: string;
  taskStatus: ApprovalTaskStatus;
  isCurrent: boolean;
  assignedOn?: string;
  actionOn?: string;
  actionById?: number;
  actionByTitle?: string;
  comments?: string;
  reassignmentReason?: string;
}

export interface IApprovalTaskRequestSummary extends IApprovalTask {
  submittedByTitle?: string;
  submittedByEmail?: string;
  customerName?: string;
  requestApprovalStatus?: RequestStatus;
  requestBCPostingStatus?: BCPostingStatus;
}

export interface IBCIntegrationQueueItem {
  id: number;
  title: string;
  queueNumber: string;
  requestType: RequestType;
  requestNumber: string;
  requestItemId: number;
  operation: BCIntegrationOperation;
  integrationStatus: BCIntegrationStatus;
  attemptCount: number;
  requestPayload: string;
  responsePayload: string;
  errorMessage: string;
  bcDocumentNumber: string;
  bcSystemId: string;
  correlationId: string;
  triggeredById?: number;
  triggeredByTitle?: string;
  triggeredOn?: string;
  lastAttemptOn?: string;
  completedOn?: string;
}

export interface IRequestSubmissionResult<TRequest extends IRequestBase = IRequestBase> {
  request: TRequest;
  approvalTasks: readonly IApprovalTask[];
}

export interface IRequestListFilter {
  searchText?: string;
  approvalStatus?: RequestStatus | '';
  bcPostingStatus?: BCPostingStatus | '';
}

export interface IRequestDetailResult<TRequest extends IRequestBase = IRequestBase> {
  request: TRequest;
  workflow?: IApprovalWorkflow;
  workflowSteps: readonly IApprovalWorkflowStep[];
  approvalTasks: readonly IApprovalTask[];
}

export interface ISalesOrderRequestDetailResult extends IRequestDetailResult<ISalesOrderRequest> {
  lines: readonly ISalesOrderRequestLine[];
}

export interface IBCIntegrationResult<TRequest extends IRequestBase = IRequestBase> {
  request: TRequest;
  queueItem: IBCIntegrationQueueItem;
}

export interface IResolvedApprovalWorkflow {
  workflow: IApprovalWorkflow;
  steps: readonly IApprovalWorkflowStep[];
  levelOneSteps: readonly IApprovalWorkflowStep[];
}
