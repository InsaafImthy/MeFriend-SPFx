import * as React from 'react';
import { approvalsModuleConfig } from '../../../config/moduleConfig';
import type {
  IApprovalTask,
  IBCIntegrationQueueItem,
  ICustomerRequest,
  IRequestDetailResult,
  ISalesOrderRequestDetailResult
} from '../../../models/requests';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { ApprovalProcessingService } from '../../../services/sharepoint/approvalProcessingService';
import type { ApprovalTaskService } from '../../../services/sharepoint/approvalTaskService';
import type { BCIntegrationQueueService } from '../../../services/sharepoint/bcIntegrationQueueService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { Button } from '../../common/buttons/Button';
import { DetailViewLayout, type IDetailViewSection } from '../../common/detailView';
import { InputField } from '../../common/inputs/InputField';
import { useToast } from '../../common/toast/useToast';
import { buildCustomerRequestDetailSections, buildSalesOrderRequestDetailSections } from '../requests/RequestDetailSections';

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

type LoadedDetail =
  | { task: IApprovalTask; finalLevel: boolean; queueHistory: readonly IBCIntegrationQueueItem[]; customerDetail: IRequestDetailResult<ICustomerRequest>; salesOrderDetail?: never }
  | { task: IApprovalTask; finalLevel: boolean; queueHistory: readonly IBCIntegrationQueueItem[]; salesOrderDetail: ISalesOrderRequestDetailResult; customerDetail?: never };

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
  const canShowApprove = Boolean(canAct && !showReject);
  const canShowRejectToggle = Boolean(workflow?.allowRejection && canAct && !showReject);
  const canShowRejectConfirm = Boolean(workflow?.allowRejection && canAct && showReject);
  const canShowRejectCancel = Boolean(canAct && showReject);
  const hasFooterActions = canShowApprove || canShowRejectToggle || canShowRejectConfirm || canShowRejectCancel || Boolean(canPostApprovedRequest);

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

  const footerActions = hasFooterActions ? (
    <>
      {canShowRejectCancel ? (
        <Button label="Cancel Reject" variant="secondary" disabled={actionLoading} onClick={() => setShowReject(false)} />
      ) : null}
      {canShowApprove ? (
        <Button label={approveLabel} loading={actionLoading} disabled={actionLoading} onClick={() => handleApprove().catch(() => undefined)} />
      ) : null}
      {canShowRejectToggle ? (
        <Button label="Reject" variant="danger" disabled={actionLoading} onClick={() => setShowReject(true)} />
      ) : null}
      {canShowRejectConfirm ? (
        <Button
          label="Confirm Rejection"
          variant="danger"
          loading={actionLoading}
          disabled={!rejectionReason.trim() || actionLoading}
          onClick={() => handleReject().catch(() => undefined)}
        />
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
      ? buildCustomerRequestDetailSections(detail.customerDetail, {
        currentStepTitle: detail.task.workflowStepTitle,
        queueHistory: detail.queueHistory
      })
      : buildSalesOrderRequestDetailSections(detail.salesOrderDetail, {
        currentStepTitle: detail.task.workflowStepTitle,
        queueHistory: detail.queueHistory
      })
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
      footerActions={footerActions}
      sections={rejectSection ? [rejectSection, ...sections] : sections}
    />
  );
};
