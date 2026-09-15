import * as React from 'react';
import type { ITableColumn } from '../../../../../shared/models/ITableColumn';
import type {
  IApprovalTask,
  IBCIntegrationQueueItem,
  ICustomerRequest,
  IRequestDetailResult,
  ISalesOrderRequestDetailResult,
  ISalesOrderRequestLine
} from '../../../models/requests';
import type { IDetailViewField, IDetailViewSection } from '../../../../../shared/components/detailView';
import { EntityTable } from '../../../../../shared/components/table/EntityTable';

export interface IRequestDetailSectionOptions {
  currentStepTitle?: string;
  itemDescriptionByCode?: Readonly<Record<string, string>>;
  queueHistory?: readonly IBCIntegrationQueueItem[];
  salespersonNameByCode?: Readonly<Record<string, string>>;
}

const normalizeLookupKey = (value?: string): string => (value || '').trim().toLowerCase();

const getMappedDisplayValue = (
  value?: string,
  displayByCode: Readonly<Record<string, string>> = {},
  fallback?: string
): string => {
  const normalizedValue = normalizeLookupKey(value);

  if (!normalizedValue) {
    return fallback || '';
  }

  return displayByCode[normalizedValue] || fallback || value || '';
};

const getSalespersonDisplayName = (
  detail: ISalesOrderRequestDetailResult,
  salespersonNameByCode: Readonly<Record<string, string>> = {}
): string => getMappedDisplayValue(
  detail.request.salespersonCode,
  salespersonNameByCode,
  detail.request.salespersonName || detail.request.salespersonCode
);

const getLineItemDescription = (
  line: ISalesOrderRequestLine,
  itemDescriptionByCode: Readonly<Record<string, string>> = {}
): string => getMappedDisplayValue(line.itemCode, itemDescriptionByCode, line.description || line.itemCode);

const buildLineColumns = (
  itemDescriptionByCode: Readonly<Record<string, string>> = {}
): readonly ITableColumn<ISalesOrderRequestLine>[] => [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'description', header: 'Item', fieldName: 'description', sortable: false, renderType: 'custom', minWidth: 240, customRender: line => getLineItemDescription(line, itemDescriptionByCode) },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'rate', header: 'Rate', fieldName: 'rate', sortable: false, renderType: 'amount' },
  { key: 'lineDiscountPercentage', header: 'Discount %', fieldName: 'lineDiscountPercentage', sortable: false, renderType: 'text' },
  { key: 'lineAmount', header: 'Line Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'netLineAmount', header: 'Net Amount', fieldName: 'netLineAmount', sortable: false, renderType: 'amount' },
  { key: 'remarks', header: 'Remarks', fieldName: 'remarks', sortable: false, renderType: 'text', minWidth: 220 }
];

const taskColumns: readonly ITableColumn<IApprovalTask>[] = [
  { key: 'taskNumber', header: 'Task Number', fieldName: 'taskNumber', sortable: false, renderType: 'text', minWidth: 230 },
  { key: 'levelNumber', header: 'Level', fieldName: 'levelNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'workflowStepTitle', header: 'Step', fieldName: 'workflowStepTitle', sortable: false, renderType: 'text' },
  { key: 'approverTitle', header: 'Approver', fieldName: 'approverTitle', sortable: false, renderType: 'text' },
  { key: 'taskStatus', header: 'Status', fieldName: 'taskStatus', sortable: false, renderType: 'status' },
  { key: 'assignedOn', header: 'Assigned', fieldName: 'assignedOn', sortable: false, renderType: 'date' },
  { key: 'actionOn', header: 'Action On', fieldName: 'actionOn', sortable: false, renderType: 'date' },
  { key: 'actionByTitle', header: 'Action By', fieldName: 'actionByTitle', sortable: false, renderType: 'text' },
  { key: 'comments', header: 'Comments', fieldName: 'comments', sortable: false, renderType: 'text', minWidth: 220 }
];

const queueColumns: readonly ITableColumn<IBCIntegrationQueueItem>[] = [
  { key: 'queueNumber', header: 'Queue Number', fieldName: 'queueNumber', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'operation', header: 'Operation', fieldName: 'operation', sortable: false, renderType: 'tag' },
  { key: 'integrationStatus', header: 'Status', fieldName: 'integrationStatus', sortable: false, renderType: 'status' },
  { key: 'attemptCount', header: 'Attempts', fieldName: 'attemptCount', sortable: false, renderType: 'text', width: 100 },
  { key: 'triggeredByTitle', header: 'Triggered By', fieldName: 'triggeredByTitle', sortable: false, renderType: 'text' },
  { key: 'lastAttemptOn', header: 'Last Attempt', fieldName: 'lastAttemptOn', sortable: false, renderType: 'date' },
  { key: 'bcDocumentNumber', header: 'BC Document', fieldName: 'bcDocumentNumber', sortable: false, renderType: 'text' },
  { key: 'errorMessage', header: 'Error', fieldName: 'errorMessage', sortable: false, renderType: 'text', minWidth: 240 }
];

const withCurrentStep = (fields: IDetailViewField[], currentStepTitle?: string): readonly IDetailViewField[] => {
  if (!currentStepTitle) {
    return fields;
  }

  const [workflowField, ...remainingFields] = fields;
  return [
    workflowField,
    { key: 'currentStep', label: 'Current Step', value: currentStepTitle },
    ...remainingFields
  ];
};

const approvalHistorySection = (tasks: readonly IApprovalTask[]): IDetailViewSection => ({
  title: 'Approval History',
  customContent: (
    <EntityTable<IApprovalTask>
      columns={taskColumns}
      items={tasks}
      getRowKey={(item, index) => item.taskNumber || String(index)}
      emptyTitle="No approval history"
      emptyMessage="No approval tasks are attached to this request."
    />
  )
});

const queueHistorySection = (items: readonly IBCIntegrationQueueItem[]): IDetailViewSection => ({
  title: 'BC Integration History',
  customContent: (
    <EntityTable<IBCIntegrationQueueItem>
      columns={queueColumns}
      items={items}
      getRowKey={(item, index) => item.queueNumber || String(index)}
      emptyTitle="No Business Central attempts"
      emptyMessage="No Business Central posting attempts have been recorded for this request."
    />
  )
});

export const buildCustomerRequestDetailSections = (
  detail: IRequestDetailResult<ICustomerRequest>,
  options: IRequestDetailSectionOptions = {}
): readonly IDetailViewSection[] => [
  {
    title: 'Request Metadata',
    fields: [
      { key: 'requestNumber', label: 'Request Number', value: detail.request.requestNumber },
      { key: 'approvalStatus', label: 'Approval Status', value: detail.request.approvalStatus, renderType: 'status' },
      { key: 'currentLevel', label: 'Current Level', value: detail.request.currentLevel },
      { key: 'approvalCycle', label: 'Approval Cycle', value: detail.request.approvalCycle },
      { key: 'submittedBy', label: 'Submitted By', value: detail.request.submittedByTitle },
      { key: 'submittedOn', label: 'Submitted On', value: detail.request.submittedOn, renderType: 'date' }
    ]
  },
  {
    title: 'Workflow and Posting',
    fields: withCurrentStep([
      { key: 'workflow', label: 'Workflow', value: detail.workflow ? detail.workflow.title : detail.request.workflowTitle },
      { key: 'bcPostingStatus', label: 'BC Posting Status', value: detail.request.bcPostingStatus, renderType: 'status' },
      { key: 'bcCustomerNumber', label: 'BC Customer Number', value: detail.request.bcCustomerNumber },
      { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
      { key: 'bcPostedOn', label: 'BC Posted On', value: detail.request.bcPostedOn, renderType: 'date' },
      { key: 'rejectionReason', label: 'Rejection / Cancellation Reason', value: detail.request.rejectionReason }
    ], options.currentStepTitle)
  },
  {
    title: 'Customer Snapshot',
    fields: [
      { key: 'customerName', label: 'Customer Name', value: detail.request.customerName },
      { key: 'name2', label: 'Secondary Name', value: detail.request.name2 },
      { key: 'address', label: 'Address', value: detail.request.address },
      { key: 'address2', label: 'Address 2', value: detail.request.address2 },
      { key: 'city', label: 'City', value: detail.request.city },
      { key: 'stateCode', label: 'State Code', value: detail.request.stateCode },
      { key: 'countryRegionCode', label: 'Country / Region Code', value: detail.request.countryRegionCode },
      { key: 'postCode', label: 'Post Code', value: detail.request.postCode },
      { key: 'locationCode', label: 'Location Code', value: detail.request.locationCode },
      { key: 'phoneNumber', label: 'Phone Number', value: detail.request.phoneNumber },
      { key: 'pan', label: 'PAN', value: detail.request.PAN },
      { key: 'gstRegistrationNo', label: 'GST Registration No.', value: detail.request.gstRegistrationNo },
      { key: 'genPostingGroup', label: 'Gen. Posting Group', value: detail.request.genPostingGroup },
      { key: 'customerPostingGroup', label: 'Customer Posting Group', value: detail.request.customerPostingGroup },
      { key: 'gstCustomerType', label: 'GST Customer Type', value: detail.request.gstCustomerType }
    ]
  },
  approvalHistorySection(detail.approvalTasks),
  queueHistorySection(options.queueHistory || [])
];

export const buildSalesOrderRequestDetailSections = (
  detail: ISalesOrderRequestDetailResult,
  options: IRequestDetailSectionOptions = {}
): readonly IDetailViewSection[] => {
  const lineColumns = buildLineColumns(options.itemDescriptionByCode);

  return [
    {
    title: 'Request Metadata',
    fields: [
      { key: 'requestNumber', label: 'Request Number', value: detail.request.requestNumber },
      { key: 'approvalStatus', label: 'Approval Status', value: detail.request.approvalStatus, renderType: 'status' },
      { key: 'currentLevel', label: 'Current Level', value: detail.request.currentLevel },
      { key: 'approvalCycle', label: 'Approval Cycle', value: detail.request.approvalCycle },
      { key: 'submittedBy', label: 'Submitted By', value: detail.request.submittedByTitle },
      { key: 'submittedOn', label: 'Submitted On', value: detail.request.submittedOn, renderType: 'date' }
    ]
  },
  {
    title: 'Workflow and Posting',
    fields: withCurrentStep([
      { key: 'workflow', label: 'Workflow', value: detail.workflow ? detail.workflow.title : detail.request.workflowTitle },
      { key: 'bcPostingStatus', label: 'BC Posting Status', value: detail.request.bcPostingStatus, renderType: 'status' },
      { key: 'bcSalesOrderNumber', label: 'BC Sales Order Number', value: detail.request.bcSalesOrderNumber },
      { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
      { key: 'bcPostedOn', label: 'BC Posted On', value: detail.request.bcPostedOn, renderType: 'date' },
      { key: 'rejectionReason', label: 'Rejection / Cancellation Reason', value: detail.request.rejectionReason }
    ], options.currentStepTitle)
  },
  {
    title: 'Sales Order Snapshot',
    fields: [
      { key: 'sellToCustomerCode', label: 'Sell-to Customer Code', value: detail.request.sellToCustomerCode },
      { key: 'sellToCustomerName', label: 'Sell-to Customer Name', value: detail.request.sellToCustomerName },
      { key: 'billToCustomerCode', label: 'Bill-to Customer Code', value: detail.request.billToCustomerCode },
      { key: 'billToCustomerName', label: 'Bill-to Customer Name', value: detail.request.billToCustomerName },
      { key: 'salespersonName', label: 'Salesperson', value: getSalespersonDisplayName(detail, options.salespersonNameByCode) },
      { key: 'eventCode', label: 'Event / Product Dimension', value: detail.request.eventCode },
      { key: 'eventName', label: 'Event Name', value: detail.request.eventName },
      { key: 'stateCode', label: 'Location Code', value: detail.request.stateCode },
      { key: 'orderDate', label: 'Order Date', value: detail.request.orderDate, renderType: 'date' },
      { key: 'postingDate', label: 'Posting Date', value: detail.request.postingDate, renderType: 'date' },
      { key: 'externalDocumentNumber', label: 'External Document No.', value: detail.request.externalDocumentNumber },
      { key: 'remarks', label: 'Remarks', value: detail.request.remarks }
    ]
  },
  {
    title: 'Totals',
    fields: [
      { key: 'grossAmount', label: 'Gross Amount', value: detail.request.grossAmount, renderType: 'amount' },
      { key: 'totalLineDiscount', label: 'Total Line Discount', value: detail.request.totalLineDiscount, renderType: 'amount' },
      { key: 'invoiceDiscountAmountExclVat', label: 'Invoice Discount Amount', value: detail.request.invoiceDiscountAmountExclVat, renderType: 'amount' },
      { key: 'invoiceDiscountPercent', label: 'Invoice Discount %', value: detail.request.invoiceDiscountPercent },
      { key: 'netAmount', label: 'Net Amount', value: detail.request.netAmount, renderType: 'amount' },
      { key: 'lineCount', label: 'Line Count', value: detail.request.lineCount }
    ]
  },
  {
    title: 'Request Lines',
    customContent: (
      <EntityTable<ISalesOrderRequestLine>
        columns={lineColumns}
        items={detail.lines}
        getRowKey={(item, index) => item.title || String(index)}
        emptyTitle="No request lines"
        emptyMessage="No line items are attached to this request."
      />
    )
  },
  approvalHistorySection(detail.approvalTasks),
  queueHistorySection(options.queueHistory || [])
  ];
};
