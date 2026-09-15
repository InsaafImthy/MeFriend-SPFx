import * as React from 'react';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import type { IBCIntegrationQueueItem, IRequestDetailResult, ICustomerRequest } from '../../../models/requests';
import { getUserFriendlyError } from '../../../../../shared/api/apiErrorHandler';
import type { BCIntegrationQueueService } from '../../../services/sharepoint/bcIntegrationQueueService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { Button } from '../../../../../shared/components/buttons/Button';
import { DetailViewLayout } from '../../../../../shared/components/detailView';
import { useToast } from '../../../../../shared/components/toast/useToast';
import { buildCustomerRequestDetailSections } from '../requests/RequestDetailSections';

export interface ICustomerRequestDetailPageProps {
  bcIntegrationQueueService?: BCIntegrationQueueService;
  canManageCustomerRequests?: boolean;
  canPostToBC?: boolean;
  currentUserEmail?: string;
  currentUserId?: number;
  requestId: string;
  requestSubmissionService: RequestSubmissionService;
  onNavigate: (path: string) => void;
}

export const CustomerRequestDetailPage: React.FC<ICustomerRequestDetailPageProps> = ({
  bcIntegrationQueueService,
  canManageCustomerRequests = false,
  canPostToBC = false,
  currentUserEmail = '',
  currentUserId,
  requestId,
  requestSubmissionService,
  onNavigate
}) => {
  const toast = useToast();
  const [detail, setDetail] = React.useState<IRequestDetailResult<ICustomerRequest> | undefined>();
  const [queueHistory, setQueueHistory] = React.useState<readonly IBCIntegrationQueueItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadDetail = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await requestSubmissionService.getCustomerRequestDetailForSubmitter(
        requestId,
        { sharePointUserId: currentUserId, email: currentUserEmail },
        canManageCustomerRequests
      );
      setDetail(result);

      if (bcIntegrationQueueService) {
        setQueueHistory(await bcIntegrationQueueService.getQueueHistory('Customer', result.request.id));
      }
    } catch (loadError) {
      setDetail(undefined);
      setQueueHistory([]);
      setError(getUserFriendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [bcIntegrationQueueService, canManageCustomerRequests, currentUserEmail, currentUserId, requestId, requestSubmissionService]);

  React.useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const canPostRequest = detail && bcIntegrationQueueService && canPostToBC && detail.request.approvalStatus === 'Approved' &&
    (detail.request.bcPostingStatus === 'Ready to Post' || detail.request.bcPostingStatus === 'Failed');
  const canResubmit = detail && detail.workflow?.allowResubmission && detail.request.approvalStatus === 'Rejected' &&
    detail.request.bcPostingStatus !== 'Posted' &&
    (canManageCustomerRequests || (detail.request.submittedByEmail || '').toLowerCase() === currentUserEmail.toLowerCase());

  const handlePost = async (): Promise<void> => {
    if (!detail || !bcIntegrationQueueService || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await bcIntegrationQueueService.postApprovedRequest('Customer', detail.request.id);
      toast.success('Customer request posted to Business Central.', { title: 'Business Central' });
      await loadDetail();
    } catch (postError) {
      toast.error(getUserFriendlyError(postError), { title: 'Business Central posting failed' });
      await loadDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const hasFooterActions = Boolean(canResubmit || canPostRequest);
  const footerActions = detail && hasFooterActions ? (
    <>
      {canResubmit ? <Button label="Edit and Resubmit" variant="secondary" disabled={actionLoading} onClick={() => onNavigate(`${customersModuleConfig.route}/requests/resubmit/${encodeURIComponent(String(detail.request.id))}`)} /> : null}
      {canPostRequest ? (
        <Button
          label={detail.request.bcPostingStatus === 'Failed' ? 'Retry Posting to BC' : 'Post to BC'}
          loading={actionLoading}
          disabled={actionLoading}
          onClick={() => handlePost().catch(() => undefined)}
        />
      ) : null}
    </>
  ) : undefined;

  return (
    <DetailViewLayout
      title={detail ? detail.request.requestNumber : 'Customer Request'}
      subtitle={detail ? detail.request.customerName : undefined}
      backLabel="Back to Customer Requests"
      onBack={() => onNavigate(`${customersModuleConfig.route}/requests`)}
      loading={loading}
      error={error}
      footerActions={footerActions}
      sections={detail ? buildCustomerRequestDetailSections(detail, { queueHistory }) : []}
    />
  );
};
