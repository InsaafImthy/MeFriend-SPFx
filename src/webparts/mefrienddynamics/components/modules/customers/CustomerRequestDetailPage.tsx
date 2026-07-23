import * as React from 'react';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type { IApprovalTask, IRequestDetailResult, ICustomerRequest } from '../../../models/requests';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { RequestSubmissionService } from '../../../services/sharepoint/requestSubmissionService';
import { DetailViewLayout, type IDetailViewSection } from '../../common/detailView';
import { EntityTable } from '../../common/table/EntityTable';

export interface ICustomerRequestDetailPageProps {
  requestId: string;
  requestSubmissionService: RequestSubmissionService;
  onNavigate: (path: string) => void;
}

const taskColumns: readonly ITableColumn<IApprovalTask>[] = [
  { key: 'taskNumber', header: 'Task Number', fieldName: 'taskNumber', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'levelNumber', header: 'Level', fieldName: 'levelNumber', sortable: false, renderType: 'text', width: 80 },
  { key: 'approverTitle', header: 'Approver', fieldName: 'approverTitle', sortable: false, renderType: 'text' },
  { key: 'approverEmail', header: 'Approver Email', fieldName: 'approverEmail', sortable: false, renderType: 'text', minWidth: 210 },
  { key: 'taskStatus', header: 'Status', fieldName: 'taskStatus', sortable: false, renderType: 'status' },
  { key: 'isCurrent', header: 'Current', fieldName: 'isCurrent', sortable: false, renderType: 'text', width: 90 },
  { key: 'assignedOn', header: 'Assigned On', fieldName: 'assignedOn', sortable: false, renderType: 'date' }
];

const buildSections = (detail: IRequestDetailResult<ICustomerRequest>): readonly IDetailViewSection[] => [
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
      { key: 'bcCustomerNumber', label: 'BC Customer Number', value: detail.request.bcCustomerNumber },
      { key: 'bcSystemId', label: 'BC System ID', value: detail.request.bcSystemId },
      { key: 'bcPostedOn', label: 'BC Posted On', value: detail.request.bcPostedOn, renderType: 'date' },
      { key: 'rejectionReason', label: 'Rejection / Cancellation Reason', value: detail.request.rejectionReason }
    ]
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

export const CustomerRequestDetailPage: React.FC<ICustomerRequestDetailPageProps> = ({ requestId, requestSubmissionService, onNavigate }) => {
  const [detail, setDetail] = React.useState<IRequestDetailResult<ICustomerRequest> | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);

    const loadDetail = async (): Promise<void> => {
      try {
        const result = await requestSubmissionService.getCustomerRequestDetail(requestId);
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
      title={detail ? detail.request.requestNumber : 'Customer Request'}
      subtitle={detail ? detail.request.customerName : undefined}
      backLabel="Back to Customer Requests"
      onBack={() => onNavigate(`${customersModuleConfig.route}/requests`)}
      loading={loading}
      error={error}
      sections={detail ? buildSections(detail) : []}
    />
  );
};
