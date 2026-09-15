import * as React from 'react';
import { approvalsModuleConfig } from '../../../config/moduleConfig';
import type { IFilterConfig } from '../../../../../shared/models/IFilterConfig';
import type { IPaginationState } from '../../../../../shared/models/IPaginationState';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import type { ITableColumn } from '../../../../../shared/models/ITableColumn';
import type { IApprovalTaskRequestSummary, RequestType } from '../../../models/requests';
import { getUserFriendlyError } from '../../../../../shared/api/apiErrorHandler';
import type { ApprovalTaskService } from '../../../services/sharepoint/approvalTaskService';
import { Button } from '../../../../../shared/components/buttons/Button';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface IMyApprovalsPageProps {
  approvalTaskService: ApprovalTaskService;
  currentUserEmail: string;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const columns: readonly ITableColumn<IApprovalTaskRequestSummary>[] = [
  { key: 'taskNumber', header: 'Task Number', fieldName: 'taskNumber', sortable: true, renderType: 'text', minWidth: 230 },
  { key: 'requestNumber', header: 'Request Number', fieldName: 'requestNumber', sortable: true, renderType: 'text', minWidth: 160 },
  { key: 'requestType', header: 'Type', fieldName: 'requestType', sortable: true, renderType: 'tag', width: 120, align: 'center' },
  { key: 'levelNumber', header: 'Level', fieldName: 'levelNumber', sortable: true, renderType: 'text', width: 80 },
  { key: 'workflowStepTitle', header: 'Step', fieldName: 'workflowStepTitle', sortable: true, renderType: 'text' },
  { key: 'assignedOn', header: 'Assigned', fieldName: 'assignedOn', sortable: true, renderType: 'date' },
  { key: 'submittedByTitle', header: 'Submitted By', fieldName: 'submittedByTitle', sortable: true, renderType: 'text' },
  { key: 'customerName', header: 'Customer', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 210 },
  { key: 'requestApprovalStatus', header: 'Request Status', fieldName: 'requestApprovalStatus', sortable: true, renderType: 'status', minWidth: 176 }
];

const filters: readonly IFilterConfig[] = [
  { key: 'searchText', label: 'Search', type: 'text' },
  {
    key: 'requestType',
    label: 'Request Type',
    type: 'status',
    options: [
      { key: 'customer', text: 'Customer', value: 'Customer' },
      { key: 'salesOrder', text: 'Sales Order', value: 'SalesOrder' }
    ]
  }
];

const normalize = (value: unknown): string => value === undefined || value === null ? '' : String(value).trim().toLowerCase();

const filterItems = (
  items: readonly IApprovalTaskRequestSummary[],
  values: EntityFilterValues
): readonly IApprovalTaskRequestSummary[] => {
  const searchText = normalize(values.searchText);
  const requestType = typeof values.requestType === 'string' ? values.requestType as RequestType : undefined;

  return items.filter(item => {
    if (requestType && item.requestType !== requestType) {
      return false;
    }

    if (!searchText) {
      return true;
    }

    return [
      item.taskNumber,
      item.requestNumber,
      item.requestType,
      item.workflowStepTitle,
      item.submittedByTitle,
      item.customerName,
      item.requestApprovalStatus
    ].some(value => normalize(value).indexOf(searchText) !== -1);
  });
};

const sortItems = (
  items: readonly IApprovalTaskRequestSummary[],
  sorting?: ISortState
): readonly IApprovalTaskRequestSummary[] => {
  if (!sorting) {
    return items;
  }

  const multiplier = sorting.direction === 'desc' ? -1 : 1;
  return items.slice().sort((left, right) => {
    const leftValue = normalize((left as unknown as Record<string, unknown>)[sorting.fieldName]);
    const rightValue = normalize((right as unknown as Record<string, unknown>)[sorting.fieldName]);

    if (leftValue < rightValue) {
      return -1 * multiplier;
    }
    if (leftValue > rightValue) {
      return multiplier;
    }
    return 0;
  });
};

const paginateItems = (
  items: readonly IApprovalTaskRequestSummary[],
  pagination: IPaginationState
): { readonly items: readonly IApprovalTaskRequestSummary[]; readonly pagination: IPaginationState } => {
  const pageSizeValue = Math.max(1, pagination.pageSize || pageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSizeValue));
  const pageNumber = Math.min(Math.max(1, pagination.pageNumber || 1), totalPages);
  const startIndex = (pageNumber - 1) * pageSizeValue;

  return {
    items: items.slice(startIndex, startIndex + pageSizeValue),
    pagination: {
      pageNumber,
      pageSize: pageSizeValue,
      totalCount: items.length
    }
  };
};

export const MyApprovalsPage: React.FC<IMyApprovalsPageProps> = ({ approvalTaskService, currentUserEmail, onNavigate }) => {
  const [allItems, setAllItems] = React.useState<readonly IApprovalTaskRequestSummary[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>({});
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>({});
  const [pagination, setPagination] = React.useState<IPaginationState>({ pageNumber: 1, pageSize, totalCount: 0 });
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadApprovals = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      setAllItems(await approvalTaskService.getPendingTaskSummariesForApprover(currentUserEmail));
    } catch (loadError) {
      setAllItems([]);
      setError(getUserFriendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [approvalTaskService, currentUserEmail]);

  React.useEffect(() => {
    loadApprovals().catch(() => undefined);
  }, [loadApprovals]);

  const filteredItems = React.useMemo(
    () => sortItems(filterItems(allItems, appliedFilterValues), sorting),
    [allItems, appliedFilterValues, sorting]
  );
  const pagedResult = React.useMemo(
    () => paginateItems(filteredItems, pagination),
    [filteredItems, pagination]
  );

  React.useEffect(() => {
    setPagination(current => ({
      ...current,
      pageNumber: pagedResult.pagination.pageNumber,
      totalCount: pagedResult.pagination.totalCount
    }));
  }, [pagedResult.pagination.pageNumber, pagedResult.pagination.totalCount]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? { fieldName, direction } : undefined);
    setPagination(current => ({ ...current, pageNumber: 1 }));
  }, []);

  return (
    <EntityDashboard<IApprovalTaskRequestSummary>
      title="My Approvals"
      subtitle="Current approval tasks assigned to you."
      columns={columns}
      filters={filters}
      filterValues={filterValues}
      items={pagedResult.items}
      loading={loading}
      error={error}
      headerActions={<Button label="Refresh" variant="secondary" disabled={loading} onClick={() => loadApprovals().catch(() => undefined)} />}
      onRowClick={item => onNavigate(`${approvalsModuleConfig.route}/detail/${encodeURIComponent(String(item.id))}`)}
      onFilterChange={(key: string, value: FilterValue) => setFilterValues(current => ({ ...current, [key]: value }))}
      onFilterApply={() => {
        setPagination(current => ({ ...current, pageNumber: 1 }));
        setAppliedFilterValues(filterValues);
      }}
      onFilterClear={() => {
        setFilterValues({});
        setAppliedFilterValues({});
        setPagination(current => ({ ...current, pageNumber: 1 }));
      }}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.taskNumber || String(index)}
      emptyTitle="No pending approvals"
      emptyMessage="There are no current pending approval tasks assigned to you."
    />
  );
};
