export const mefriendListTitles = {
  appUsers: 'MeFriend App Users',
  appUserPermissions: 'MeFriend App User Permissions',
  approvalWorkflows: 'MeFriend Approval Workflows',
  approvalWorkflowSteps: 'MeFriend Approval Workflow Steps',
  customerRequests: 'MeFriend Customer Requests',
  salesOrderRequests: 'MeFriend Sales Order Requests',
  salesOrderRequestLines: 'MeFriend Sales Order Request Lines',
  approvalTasks: 'MeFriend Approval Tasks'
} as const;

export const mefriendFields = {
  appUsers: {
    id: 'Id',
    title: 'Title',
    user: 'User',
    userId: 'UserId',
    email: 'Email',
    role: 'Role',
    canAccessApp: 'CanAccessApp',
    isActive: 'IsActive'
  },
  appUserPermissions: {
    id: 'Id',
    title: 'Title',
    appUser: 'AppUser',
    appUserId: 'AppUserId',
    moduleKey: 'ModuleKey',
    canView: 'CanView',
    canCreate: 'CanCreate',
    canApprove: 'CanApprove',
    canPostToBC: 'CanPostToBC',
    canManage: 'CanManage',
    isActive: 'IsActive'
  },
  approvalWorkflows: {
    id: 'Id',
    title: 'Title',
    workflowCode: 'WorkflowCode',
    entityType: 'EntityType',
    version: 'Version',
    isActive: 'IsActive',
    allowRejection: 'AllowRejection',
    allowResubmission: 'AllowResubmission',
    finalAction: 'FinalAction'
  },
  approvalWorkflowSteps: {
    id: 'Id',
    title: 'Title',
    workflow: 'Workflow',
    workflowId: 'WorkflowId',
    levelNumber: 'LevelNumber',
    stepName: 'StepName',
    approver: 'Approver',
    approverId: 'ApproverId',
    approvalMode: 'ApprovalMode',
    requiredApprovals: 'RequiredApprovals',
    isFinalLevel: 'IsFinalLevel',
    sequence: 'Sequence',
    isActive: 'IsActive',
    instructions: 'Instructions'
  },
  customerRequests: {
    title: 'Title',
    requestNumber: 'RequestNumber',
    approvalStatus: 'ApprovalStatus',
    workflow: 'Workflow',
    workflowId: 'WorkflowId',
    currentLevel: 'CurrentLevel',
    approvalCycle: 'ApprovalCycle',
    submittedBy: 'SubmittedBy',
    submittedById: 'SubmittedById',
    submittedOn: 'SubmittedOn',
    lastActionBy: 'LastActionBy',
    lastActionById: 'LastActionById',
    lastActionOn: 'LastActionOn',
    rejectionReason: 'RejectionReason',
    bcPostingStatus: 'BCPostingStatus',
    bcCustomerNumber: 'BCCustomerNumber',
    bcSystemId: 'BCSystemId',
    bcPostedOn: 'BCPostedOn',
    bcErrorMessage: 'BCErrorMessage',
    customerName: 'CustomerName',
    name2: 'Name2',
    address: 'Address',
    address2: 'Address2',
    stateCode: 'StateCode',
    countryRegionCode: 'CountryRegionCode',
    city: 'City',
    postCode: 'PostCode',
    locationCode: 'LocationCode',
    phoneNumber: 'PhoneNumber',
    pan: 'PAN',
    gstRegistrationNo: 'GSTRegistrationNo',
    genPostingGroup: 'GenPostingGroup',
    customerPostingGroup: 'CustomerPostingGroup',
    gstCustomerType: 'GSTCustomerType'
  },
  salesOrderRequests: {
    title: 'Title',
    requestNumber: 'RequestNumber',
    approvalStatus: 'ApprovalStatus',
    workflow: 'Workflow',
    workflowId: 'WorkflowId',
    currentLevel: 'CurrentLevel',
    approvalCycle: 'ApprovalCycle',
    submittedBy: 'SubmittedBy',
    submittedById: 'SubmittedById',
    submittedOn: 'SubmittedOn',
    lastActionBy: 'LastActionBy',
    lastActionById: 'LastActionById',
    lastActionOn: 'LastActionOn',
    rejectionReason: 'RejectionReason',
    bcPostingStatus: 'BCPostingStatus',
    bcSalesOrderNumber: 'BCSalesOrderNumber',
    bcSystemId: 'BCSystemId',
    bcPostedOn: 'BCPostedOn',
    bcErrorMessage: 'BCErrorMessage',
    sellToCustomerCode: 'SellToCustomerCode',
    sellToCustomerName: 'SellToCustomerName',
    billToCustomerCode: 'BillToCustomerCode',
    billToCustomerName: 'BillToCustomerName',
    salespersonCode: 'SalespersonCode',
    salespersonName: 'SalespersonName',
    eventCode: 'EventCode',
    eventName: 'EventName',
    countryCode: 'CountryCode',
    stateCode: 'StateCode',
    orderDate: 'OrderDate',
    postingDate: 'PostingDate',
    externalDocumentNumber: 'ExternalDocumentNumber',
    remarks: 'Remarks',
    currencyCode: 'CurrencyCode',
    invoiceDiscountAmountExclVat: 'InvoiceDiscountAmountExclVat',
    invoiceDiscountPercent: 'InvoiceDiscountPercent',
    grossAmount: 'GrossAmount',
    totalLineDiscount: 'TotalLineDiscount',
    netAmount: 'NetAmount',
    lineCount: 'LineCount'
  },
  salesOrderRequestLines: {
    title: 'Title',
    salesOrderRequest: 'SalesOrderRequest',
    salesOrderRequestId: 'SalesOrderRequestId',
    requestNumber: 'RequestNumber',
    lineNumber: 'LineNumber',
    itemCode: 'ItemCode',
    description: 'Description',
    quantity: 'Quantity',
    rate: 'Rate',
    lineDiscountPercentage: 'LineDiscountPercentage',
    lineAmount: 'LineAmount',
    netLineAmount: 'NetLineAmount',
    productDimensionCode: 'ProductDimensionCode',
    unitOfMeasureCode: 'UnitOfMeasureCode',
    isActive: 'IsActive'
  },
  approvalTasks: {
    title: 'Title',
    taskNumber: 'TaskNumber',
    requestType: 'RequestType',
    requestNumber: 'RequestNumber',
    requestItemId: 'RequestItemId',
    workflow: 'Workflow',
    workflowId: 'WorkflowId',
    workflowStep: 'WorkflowStep',
    workflowStepId: 'WorkflowStepId',
    levelNumber: 'LevelNumber',
    approvalCycle: 'ApprovalCycle',
    approver: 'Approver',
    approverId: 'ApproverId',
    approverEmail: 'ApproverEmail',
    taskStatus: 'TaskStatus',
    isCurrent: 'IsCurrent',
    assignedOn: 'AssignedOn',
    actionOn: 'ActionOn',
    actionBy: 'ActionBy',
    actionById: 'ActionById',
    comments: 'Comments',
    reassignmentReason: 'ReassignmentReason'
  }
} as const;

export const mefriendModuleKeys = [
  'customers',
  'salesOrders',
  'invoices',
  'events',
  'salespersons',
  'itemMasters',
  'approvals',
  'approvalManagement',
  'appUsers',
  'settings'
] as const;

export type MefriendModuleKey = typeof mefriendModuleKeys[number];

export const mefriendModuleLabels: Readonly<Record<MefriendModuleKey, string>> = {
  customers: 'Customers',
  salesOrders: 'Sales Orders',
  invoices: 'Invoices',
  events: 'Events',
  salespersons: 'Salespersons',
  itemMasters: 'Item Masters',
  approvals: 'My Approvals',
  approvalManagement: 'Approval Management',
  appUsers: 'App Users',
  settings: 'Settings'
};

export const mefriendEntityTypes = ['Customer', 'SalesOrder'] as const;
export type MefriendApprovalEntityType = typeof mefriendEntityTypes[number];

export const mefriendWorkflowFinalActions = ['PostToBC', 'ApproveOnly'] as const;
export type MefriendWorkflowFinalAction = typeof mefriendWorkflowFinalActions[number];

export const mefriendApprovalModes = ['Any', 'All'] as const;
export type MefriendApprovalMode = typeof mefriendApprovalModes[number];

export const lookupIdField = (fieldInternalName: string): string => `${fieldInternalName}Id`;

export const personIdField = (fieldInternalName: string): string => `${fieldInternalName}Id`;

export const normalizeEmail = (email?: string): string => (email || '').trim().toLowerCase();

export const escapeODataString = (value: string): string => value.replace(/'/g, "''");
