import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { IBCIntegrationQueueItem, ISalesOrderRequestDetailResult } from '../../../models/requests';
import { getUserFriendlyError } from '../../../../../shared/api/apiErrorHandler';
import type { BCIntegrationQueueService } from '../../../services/sharepoint/bcIntegrationQueueService';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { Button } from '../../../../../shared/components/buttons/Button';
import { DetailViewLayout } from '../../../../../shared/components/detailView';
import { useToast } from '../../../../../shared/components/toast/useToast';
import { buildSalesOrderRequestDetailSections } from '../requests/RequestDetailSections';

export interface ISalesOrderRequestDetailPageProps {
  bcIntegrationQueueService?: BCIntegrationQueueService;
  canManageSalesOrderRequests?: boolean;
  canPostToBC?: boolean;
  currentUserEmail?: string;
  currentUserId?: number;
  requestId: string;
  requestSubmissionService: RequestSubmissionService;
  onNavigate: (path: string) => void;
}

type DisplayMap = Readonly<Record<string, string>>;

const normalizeLookupKey = (value?: string): string => (value || '').trim().toLowerCase();

export const SalesOrderRequestDetailPage: React.FC<ISalesOrderRequestDetailPageProps> = ({
  bcIntegrationQueueService,
  canManageSalesOrderRequests = false,
  canPostToBC = false,
  currentUserEmail = '',
  currentUserId,
  requestId,
  requestSubmissionService,
  onNavigate
}) => {
  const toast = useToast();
  const [detail, setDetail] = React.useState<ISalesOrderRequestDetailResult | undefined>();
  const [queueHistory, setQueueHistory] = React.useState<readonly IBCIntegrationQueueItem[]>([]);
  const [itemDescriptionByCode, setItemDescriptionByCode] = React.useState<DisplayMap>({});
  const [salespersonNameByCode, setSalespersonNameByCode] = React.useState<DisplayMap>({});
  const [loading, setLoading] = React.useState<boolean>(false);
  const [actionLoading, setActionLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadDetail = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await requestSubmissionService.getSalesOrderRequestDetailForSubmitter(
        requestId,
        { sharePointUserId: currentUserId, email: currentUserEmail },
        canManageSalesOrderRequests
      );
      setDetail(result);
      setItemDescriptionByCode(result.lines.reduce<Record<string, string>>((itemsByCode, line) => {
        itemsByCode[normalizeLookupKey(line.itemCode)] = line.description || line.itemCode;
        return itemsByCode;
      }, {}));
      setSalespersonNameByCode({
        [normalizeLookupKey(result.request.salespersonCode)]: result.request.salespersonName || result.request.salespersonCode
      });

      if (bcIntegrationQueueService) {
        setQueueHistory(await bcIntegrationQueueService.getQueueHistory('SalesOrder', result.request.id));
      }
    } catch (loadError) {
      setDetail(undefined);
      setQueueHistory([]);
      setItemDescriptionByCode({});
      setSalespersonNameByCode({});
      setError(getUserFriendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [bcIntegrationQueueService, canManageSalesOrderRequests, currentUserEmail, currentUserId, requestId, requestSubmissionService]);

  React.useEffect(() => {
    loadDetail().catch(() => undefined);
  }, [loadDetail]);

  const canPostRequest = detail && bcIntegrationQueueService && canPostToBC && detail.request.approvalStatus === 'Approved' &&
    (detail.request.bcPostingStatus === 'Ready to Post' || detail.request.bcPostingStatus === 'Failed');
  const canResubmit = detail && detail.workflow?.allowResubmission && detail.request.approvalStatus === 'Rejected' &&
    detail.request.bcPostingStatus !== 'Posted' &&
    (canManageSalesOrderRequests || (detail.request.submittedByEmail || '').toLowerCase() === currentUserEmail.toLowerCase());

  const handlePost = async (): Promise<void> => {
    if (!detail || !bcIntegrationQueueService || actionLoading) {
      return;
    }

    setActionLoading(true);

    try {
      await bcIntegrationQueueService.postApprovedRequest('SalesOrder', detail.request.id);
      toast.success('Sales-order request posted to Business Central.', { title: 'Business Central' });
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
      {canResubmit ? <Button label="Edit and Resubmit" variant="secondary" disabled={actionLoading} onClick={() => onNavigate(`${salesOrdersModuleConfig.route}/requests/resubmit/${encodeURIComponent(String(detail.request.id))}`)} /> : null}
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
      title={detail ? detail.request.requestNumber : 'Sales Order Request'}
      subtitle={detail ? detail.request.sellToCustomerName || detail.request.sellToCustomerCode : undefined}
      backLabel="Back to Sales Order Requests"
      onBack={() => onNavigate(`${salesOrdersModuleConfig.route}/requests`)}
      loading={loading}
      error={error}
      footerActions={footerActions}
      sections={detail ? buildSalesOrderRequestDetailSections(detail, { itemDescriptionByCode, queueHistory, salespersonNameByCode }) : []}
    />
  );
};
