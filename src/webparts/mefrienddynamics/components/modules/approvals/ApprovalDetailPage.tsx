import * as React from 'react';
import { approvalsModuleConfig } from '../../../config/moduleConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type {
  IApprovalTask,
  IBCIntegrationQueueItem,
  ICustomerRequest,
  IRequestDetailResult,
  ISalesOrderRequestDetailResult,
  ISalesOrderRequestLine
} from '../../../models/requests';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { ApprovalProcessingService } from '../../../services/sharepoint/approvalProcessingService';
import type { ApprovalTaskService } from '../../../services/sharepoint/approvalTaskService';
import type { BCIntegrationQueueService } from '../../../services/sharepoint/bcIntegrationQueueService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { Button } from '../../common/buttons/Button';
import { DetailViewLayout, type IDetailViewSection } from '../../common/detailView';
import { InputField } from '../../common/inputs/InputField';
import { EntityTable } from '../../common/table/EntityTable';
import { useToast } from '../../common/toast/useToast';

export interface IApprovalDetailPageProps {
  taskId: string;
  approvalProcessingService: ApprovalProcessingService;
  approvalTaskService: ApprovalTaskService;
  bcIntegrationQueueService: BCIntegrationQueueService;
  canApprove: boolean;
  canPostCustomerToBC: boolean;
  canPostSalesOrderToBC: boolean;
  requestSubmissionService: RequestSubmissionService;
  onNavigate: (path: string) => void;
}

const taskColumns: readonly ITableColumn<IApprovalTask>[] = [
  { key: 'taskNumber', header: 'Task Number', fieldName: 'taskNumber', sortable: false, renderType: 'text', minWidth: 230 },
  { key: 'levelNumber', header: 'Level', fieldName: 'levelNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'workflowStepTitle', header: 'Step', fieldName: 'workflowStepTitle', sortable: false, renderType: 'text' },
  { key: 'approverTitle', header: 'Approver', fieldName: 'approverTitle', sortable: false, renderType: 'text' },
  { key: 'taskStatus', header: 'Status', fieldName: 'taskStatus', sortable: false, renderType: 'status' },
  { key: 'assignedOn', header: 'Assigned', fieldName: 'assignedOn', sortable: false, renderType: 'date' },
  { key: 'actionOn', header: 'Action On', fieldName: 'actionOn', sortable: false, renderType: 'date' },
  { key: 'actionByTitle', header: 'Action By', fieldName: 'actionByTitle', sortable: false, renderType: 'text' },
  { key: 'comments', header: 'Comments', fieldName: 'comments', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'reassignmentReason', header: 'Reason', fieldName: 'reassignmentReason', sortable: false, renderType: 'text', minWidth: 180 }
];

const lineColumns: readonly ITableColumn<ISalesOrderRequestLine>[] = [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'itemCode', header: 'Item', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Description', fieldName: 'description', sortable: false, renderType: 'text', minWidth: 230 },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'rate', header: 'Rate', fieldName: 'rate', sortable: false, renderType: 'amount' },
  { key: 'lineDiscountPercentage', header: 'Discount %', fieldName: 'lineDiscountPercentage', sortable: false, renderType: 'text' },
  { key: 'netLineAmount', header: 'Net Amount', fieldName: 'netLineAmount', sortable: false, renderType: 'amount' }
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

type LoadedDetail =
  | { task: IApprovalTask; finalLevel: boolean; queueHistory: readonly IBCIntegrationQueueItem[]; customerDetail: IRequestDetailResult<ICustomerRequest>; salesOrderDetail?: never }
  | { task: IApprovalTask; finalLevel: boolean; queueHistory: readonly IBCIntegrationQueueItem[]; salesOrderDetail: ISalesOrderRequestDetailResult; customerDetail?: never };

const buildCustomerSections = (loaded: LoadedDetail): readonly IDetailViewSection[] => {
  const detail = loaded.customerDetail;

  if (!detail) {
    return [];
  }

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
      title: 'Customer Snapshot',
      fields: [
        { key: 'customerName', label: 'Customer Name', value: detail.request.customerName },
        { key: 'address', label: 'Address', value: detail.request.address },
        { key: 'city', label: 'City', value: detail.request.city },
        { key: 'stateCode', label: 'State Code', value: detail.request.stateCode },
        { key: 'countryRegionCode', label: 'Country / Region', value: detail.request.countryRegionCode },
        { key: 'gstRegistrationNo', label: 'GST Registration No.', value: detail.request.gstRegistrationNo },
        { key: 'pan', label: 'PAN', value: detail.request.PAN },
        { key: 'postingGroups', label: 'Posting Groups', value: `${detail.request.genPostingGroup} / ${detail.request.customerPostingGroup}` }
      ]
    },
    {
      title: 'Workflow and Posting',
      fields: [
        { key: 'workflow', label: 'Workflow', value: detail.workflow ? detail.workflow.title : detail.request.workflowTitle },
        { key: 'step', label: 'Current Step', value: loaded.task.workflowStepTitle },
        { key: 'bcPostingStatus', label: 'BC Posting Status', value: detail.request.bcPostingStatus, renderType: 'status' },
        { key: 'bcCustomerNumber', label: 'BC Customer Number', value: detail.request.bcCustomerNumber },
        { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
        { key: 'rejectionReason', label: 'Rejection Reason', value: detail.request.rejectionReason }
      ]
    },
    historySection(detail.approvalTasks),
    queueSection(loaded.queueHistory)
  ];
};

const buildSalesOrderSections = (loaded: LoadedDetail): readonly IDetailViewSection[] => {
  const detail = loaded.salesOrderDetail;

  if (!detail) {
    return [];
  }

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
      title: 'Sales Order Snapshot',
      fields: [
        { key: 'sellToCustomerCode', label: 'Sell-to Customer', value: `${detail.request.sellToCustomerCode} ${detail.request.sellToCustomerName}` },
        { key: 'billToCustomerCode', label: 'Bill-to Customer', value: `${detail.request.billToCustomerCode} ${detail.request.billToCustomerName}` },
        { key: 'salesperson', label: 'Salesperson', value: `${detail.request.salespersonCode} ${detail.request.salespersonName}` },
        { key: 'event', label: 'Event / Product', value: `${detail.request.eventCode} ${detail.request.eventName}` },
        { key: 'orderDate', label: 'Order Date', value: detail.request.orderDate, renderType: 'date' },
        { key: 'postingDate', label: 'Posting Date', value: detail.request.postingDate, renderType: 'date' },
        { key: 'externalDocumentNumber', label: 'External Document No.', value: detail.request.externalDocumentNumber },
        { key: 'netAmount', label: 'Net Amount', value: detail.request.netAmount, renderType: 'amount' }
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
      title: 'Workflow and Posting',
      fields: [
        { key: 'workflow', label: 'Workflow', value: detail.workflow ? detail.workflow.title : detail.request.workflowTitle },
        { key: 'step', label: 'Current Step', value: loaded.task.workflowStepTitle },
        { key: 'bcPostingStatus', label: 'BC Posting Status', value: detail.request.bcPostingStatus, renderType: 'status' },
        { key: 'bcSalesOrderNumber', label: 'BC Sales Order Number', value: detail.request.bcSalesOrderNumber },
        { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
        { key: 'rejectionReason', label: 'Rejection Reason', value: detail.request.rejectionReason }
      ]
    },
    historySection(detail.approvalTasks),
    queueSection(loaded.queueHistory)
  ];
};

function historySection(tasks: readonly IApprovalTask[]): IDetailViewSection {
  return {
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
  };
}

function queueSection(items: readonly IBCIntegrationQueueItem[]): IDetailViewSection {
  return {
    title: 'BC Integration History',
    customContent: (
      <EntityTable<IBCIntegrationQueueItem>
        columns={queueColumns}
        items={items}
        getRowKey={(item, index) => item.queueNumber || String(index)}
        emptyTitle="No Business Central attempts"
        emptyMessage="No Business Central integration attempts have been recorded for this request."
      />
    )
  };
}

export const ApprovalDetailPage: React.FC<IApprovalDetailPageProps> = ({
  taskId,
  approvalProcessingService,
  approvalTaskService,
  bcIntegrationQueueService,
  canApprove,
  canPostCustomerToBC,
  canPostSalesOrderToBC,
  requestSubmissionService,
  onNavigate
}) => {
  const toast = useToast();
  const [detail, setDetail] = React.useState<LoadedDetail | undefined>();
  const [comments, setComments] = React.useState<string>('');
  const [rejectionReason, setRejectionReason] = React.useState<string>('');
  const [showReject, setShowReject] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const numericTaskId = Number(taskId);

  const loadDetail = React.useCallback(async (): Promise<void> => {
    if (!Number.isFinite(numericTaskId) || numericTaskId <= 0) {
      setError('The approval task reference is invalid.');
      return;
    }

    setLoading(true);
    setError(undefined);

    try {
      const task = await approvalTaskService.getTaskById(numericTaskId);

      if (!task) {
        throw new Error('The approval task was not found.');
      }

      const finalLevel = await approvalProcessingService.isFinalLevelForTask(task.id);
      const queueHistory = await bcIntegrationQueueService.getQueueHistory(task.requestType, task.requestItemId);

      if (task.requestType === 'Customer') {
        const customerDetail = await requestSubmissionService.getCustomerRequestDetail(String(task.requestItemId));
        setDetail({ task, finalLevel, queueHistory, customerDetail });
        return;
      }

      const salesOrderDetail = await requestSubmissionService.getSalesOrderRequestDetail(String(task.requestItemId));
      setDetail({ task, finalLevel, queueHistory, salesOrderDetail });
    } catch (loadError) {
      setDetail(undefined);
      setError(getUserFriendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [approvalProcessingService, approvalTaskService, bcIntegrationQueueService, numericTaskId, requestSubmissionService]);

  React.useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const request = detail?.customerDetail?.request || detail?.salesOrderDetail?.request;
  const workflow = detail?.customerDetail?.workflow || detail?.salesOrderDetail?.workflow;
  const canPost = detail?.task.requestType === 'Customer' ? canPostCustomerToBC : canPostSalesOrderToBC;
  const hasPendingTask = detail?.task.taskStatus === 'Pending' && detail.task.isCurrent;
  const canAct = canApprove && hasPendingTask && request?.bcPostingStatus !== 'Posted';
  const canPostApprovedRequest = request && canPost && request.approvalStatus === 'Approved' && (request.bcPostingStatus === 'Ready to Post' || request.bcPostingStatus === 'Failed');
  const approveLabel = detail?.finalLevel && canPost ? 'Approve and Post to BC' : 'Approve';

  const handleApprove = async (): Promise<void> => {
    if (!detail || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      const result = await approvalProcessingService.approveTask(detail.task.id, comments);

      if (result.isWorkflowComplete && canPost) {
        await bcIntegrationQueueService.postApprovedRequest(result.requestType, result.requestItemId);
        toast.success('Request approved and posted to Business Central.', { title: 'Approval Complete' });
      } else {
        toast.success('Approval recorded.', { title: 'Approval Complete' });
      }

      await loadDetail();
    } catch (actionError) {
      toast.error(getUserFriendlyError(actionError), { title: 'Unable to approve' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (): Promise<void> => {
    if (!detail || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await approvalProcessingService.rejectTask(detail.task.id, rejectionReason, comments);
      toast.success('Request rejected and current tasks closed.', { title: 'Approval Rejected' });
      await loadDetail();
    } catch (actionError) {
      toast.error(getUserFriendlyError(actionError), { title: 'Unable to reject' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async (): Promise<void> => {
    if (!detail || !request || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await bcIntegrationQueueService.postApprovedRequest(detail.task.requestType, request.id);
      toast.success('Request posted to Business Central.', { title: 'Business Central' });
      await loadDetail();
    } catch (postError) {
      toast.error(getUserFriendlyError(postError), { title: 'Business Central posting failed' });
      await loadDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const actions = detail && request ? (
    <>
      {canAct ? <Button label={approveLabel} loading={actionLoading} disabled={actionLoading} onClick={() => handleApprove().catch(() => undefined)} /> : null}
      {workflow?.allowRejection && canAct ? (
        <Button label={showReject ? 'Hide Reject' : 'Reject'} variant="danger" disabled={actionLoading} onClick={() => setShowReject(current => !current)} />
      ) : null}
      {canPostApprovedRequest ? (
        <Button
          label={request.bcPostingStatus === 'Failed' ? 'Retry Posting to BC' : 'Post to BC'}
          variant="secondary"
          loading={actionLoading}
          disabled={actionLoading}
          onClick={() => handlePost().catch(() => undefined)}
        />
      ) : null}
    </>
  ) : undefined;

  const sections = detail
    ? detail.customerDetail
      ? buildCustomerSections(detail)
      : buildSalesOrderSections(detail)
    : [];
  const rejectSection: IDetailViewSection | undefined = showReject && canAct ? {
    title: 'Reject Request',
    fields: [],
    customContent: (
      <>
        <InputField
          label="Approval Comments"
          value={comments}
          type="textarea"
          disabled={actionLoading}
          onChange={setComments}
        />
        <InputField
          label="Rejection Reason"
          value={rejectionReason}
          type="textarea"
          required
          disabled={actionLoading}
          onChange={setRejectionReason}
        />
        <Button
          label="Confirm Rejection"
          variant="danger"
          loading={actionLoading}
          disabled={!rejectionReason.trim() || actionLoading}
          onClick={() => handleReject().catch(() => undefined)}
        />
      </>
    )
  } : undefined;

  return (
    <DetailViewLayout
      title={request ? `${detail?.task.requestType || ''} Approval ${request.requestNumber}` : 'Approval Detail'}
      subtitle={request ? `${request.approvalStatus} / ${request.bcPostingStatus}` : undefined}
      backLabel="Back to My Approvals"
      onBack={() => onNavigate(approvalsModuleConfig.route)}
      loading={loading}
      error={error}
      actions={actions}
      sections={rejectSection ? [rejectSection, ...sections] : sections}
    />
  );
};
