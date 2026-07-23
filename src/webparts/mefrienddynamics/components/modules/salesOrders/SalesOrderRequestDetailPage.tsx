import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type { IApprovalTask, ISalesOrderRequestDetailResult, ISalesOrderRequestLine } from '../../../models/requests';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { DetailViewLayout, type IDetailViewSection } from '../../common/detailView';
import { EntityTable } from '../../common/table/EntityTable';

export interface ISalesOrderRequestDetailPageProps {
  requestId: string;
  requestSubmissionService: RequestSubmissionService;
  onNavigate: (path: string) => void;
}

const lineColumns: readonly ITableColumn<ISalesOrderRequestLine>[] = [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'itemCode', header: 'Item', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Description', fieldName: 'description', sortable: false, renderType: 'text', minWidth: 230 },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'rate', header: 'Rate', fieldName: 'rate', sortable: false, renderType: 'amount' },
  { key: 'lineDiscountPercentage', header: 'Discount %', fieldName: 'lineDiscountPercentage', sortable: false, renderType: 'text' },
  { key: 'lineAmount', header: 'Line Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'netLineAmount', header: 'Net Amount', fieldName: 'netLineAmount', sortable: false, renderType: 'amount' }
];

const taskColumns: readonly ITableColumn<IApprovalTask>[] = [
  { key: 'taskNumber', header: 'Task Number', fieldName: 'taskNumber', sortable: false, renderType: 'text', minWidth: 240 },
  { key: 'levelNumber', header: 'Level', fieldName: 'levelNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'approverTitle', header: 'Approver', fieldName: 'approverTitle', sortable: false, renderType: 'text' },
  { key: 'approverEmail', header: 'Approver Email', fieldName: 'approverEmail', sortable: false, renderType: 'text', minWidth: 210 },
  { key: 'taskStatus', header: 'Status', fieldName: 'taskStatus', sortable: false, renderType: 'status' },
  { key: 'isCurrent', header: 'Current', fieldName: 'isCurrent', sortable: false, renderType: 'text', width: 90 },
  { key: 'assignedOn', header: 'Assigned On', fieldName: 'assignedOn', sortable: false, renderType: 'date' }
];

const buildSections = (detail: ISalesOrderRequestDetailResult): readonly IDetailViewSection[] => [
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
    fields: [
      { key: 'workflow', label: 'Workflow', value: detail.workflow ? detail.workflow.title : detail.request.workflowTitle },
      { key: 'bcPostingStatus', label: 'BC Posting Status', value: detail.request.bcPostingStatus, renderType: 'status' },
      { key: 'bcSalesOrderNumber', label: 'BC Sales Order Number', value: detail.request.bcSalesOrderNumber },
      { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
      { key: 'bcPostedOn', label: 'BC Posted On', value: detail.request.bcPostedOn, renderType: 'date' },
      { key: 'rejectionReason', label: 'Rejection / Cancellation Reason', value: detail.request.rejectionReason }
    ]
  },
  {
    title: 'Sales Order Snapshot',
    fields: [
      { key: 'sellToCustomerCode', label: 'Sell-to Customer Code', value: detail.request.sellToCustomerCode },
      { key: 'sellToCustomerName', label: 'Sell-to Customer Name', value: detail.request.sellToCustomerName },
      { key: 'billToCustomerCode', label: 'Bill-to Customer Code', value: detail.request.billToCustomerCode },
      { key: 'billToCustomerName', label: 'Bill-to Customer Name', value: detail.request.billToCustomerName },
      { key: 'salespersonCode', label: 'Salesperson Code', value: detail.request.salespersonCode },
      { key: 'salespersonName', label: 'Salesperson Name', value: detail.request.salespersonName },
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
  {
    title: 'Approval Tasks',
    customContent: (
      <EntityTable<IApprovalTask>
        columns={taskColumns}
        items={detail.approvalTasks}
        getRowKey={(item, index) => item.taskNumber || String(index)}
        emptyTitle="No approval tasks"
        emptyMessage="No approval tasks are attached to this request."
      />
    )
  }
];

export const SalesOrderRequestDetailPage: React.FC<ISalesOrderRequestDetailPageProps> = ({ requestId, requestSubmissionService, onNavigate }) => {
  const [detail, setDetail] = React.useState<ISalesOrderRequestDetailResult | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);

    const loadDetail = async (): Promise<void> => {
      try {
        const result = await requestSubmissionService.getSalesOrderRequestDetail(requestId);
        if (isMounted) {
          setDetail(result);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getUserFriendlyError(loadError));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetail().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [requestId, requestSubmissionService]);

  return (
    <DetailViewLayout
      title={detail ? detail.request.requestNumber : 'Sales Order Request'}
      subtitle={detail ? detail.request.sellToCustomerName || detail.request.sellToCustomerCode : undefined}
      backLabel="Back to Sales Order Requests"
      onBack={() => onNavigate(`${salesOrdersModuleConfig.route}/requests`)}
      loading={loading}
      error={error}
      sections={detail ? buildSections(detail) : []}
    />
  );
};
