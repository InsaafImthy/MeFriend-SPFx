import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { IFilterConfig } from '../../../models/common/IFilterConfig';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type { IRequestListFilter, ISalesOrderRequest } from '../../../models/requests';
import { getUserFriendlyError } from '../../../services/api/apiErrorHandler';
import type { SalesOrderRequestService } from '../../../services/sharepoint/salesOrderRequestService';
import { Button } from '../../common/buttons/Button';
import { EntityDashboard } from '../../common/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../common/filters/EntityFilters';

export interface ISalesOrderRequestsPageProps {
  canCreateSalesOrder: boolean;
  salesOrderRequestService: SalesOrderRequestService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const requestColumns: readonly ITableColumn<ISalesOrderRequest>[] = [
  { key: 'requestNumber', header: 'Request Number', fieldName: 'requestNumber', sortable: true, renderType: 'text' },
  { key: 'sellToCustomerName', header: 'Customer', fieldName: 'sellToCustomerName', sortable: true, renderType: 'text', minWidth: 210 },
  { key: 'submittedByTitle', header: 'Submitted By', fieldName: 'submittedByTitle', sortable: true, renderType: 'text' },
  { key: 'submittedOn', header: 'Submitted On', fieldName: 'submittedOn', sortable: true, renderType: 'date' },
  { key: 'approvalStatus', header: 'Approval Status', fieldName: 'approvalStatus', sortable: true, renderType: 'status', minWidth: 176 },
  { key: 'currentLevel', header: 'Level', fieldName: 'currentLevel', sortable: true, renderType: 'text', width: 90 },
  { key: 'bcPostingStatus', header: 'BC Posting', fieldName: 'bcPostingStatus', sortable: true, renderType: 'status', minWidth: 156 },
  { key: 'bcSalesOrderNumber', header: 'BC Sales Order No.', fieldName: 'bcSalesOrderNumber', sortable: true, renderType: 'text' },
  { key: 'netAmount', header: 'Net Amount', fieldName: 'netAmount', sortable: true, renderType: 'amount' }
];

const statusOptions = [
  { key: 'pending', text: 'Pending Approval', value: 'Pending Approval' },
  { key: 'inApproval', text: 'In Approval', value: 'In Approval' },
  { key: 'approved', text: 'Approved', value: 'Approved' },
  { key: 'rejected', text: 'Rejected', value: 'Rejected' },
  { key: 'cancelled', text: 'Cancelled', value: 'Cancelled' },
  { key: 'draft', text: 'Draft', value: 'Draft' }
];

const bcPostingOptions = [
  { key: 'notReady', text: 'Not Ready', value: 'Not Ready' },
  { key: 'ready', text: 'Ready to Post', value: 'Ready to Post' },
  { key: 'posting', text: 'Posting', value: 'Posting' },
  { key: 'posted', text: 'Posted', value: 'Posted' },
  { key: 'failed', text: 'Failed', value: 'Failed' }
];

const requestFilters: readonly IFilterConfig[] = [
  { key: 'searchText', label: 'Search', type: 'text' },
  { key: 'approvalStatus', label: 'Approval Status', type: 'status', options: statusOptions },
  { key: 'bcPostingStatus', label: 'BC Posting Status', type: 'status', options: bcPostingOptions }
];

const toRequestFilters = (values: EntityFilterValues): IRequestListFilter => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  approvalStatus: typeof values.approvalStatus === 'string' ? values.approvalStatus as IRequestListFilter['approvalStatus'] : undefined,
  bcPostingStatus: typeof values.bcPostingStatus === 'string' ? values.bcPostingStatus as IRequestListFilter['bcPostingStatus'] : undefined
});

export const SalesOrderRequestsPage: React.FC<ISalesOrderRequestsPageProps> = ({ canCreateSalesOrder, salesOrderRequestService, onNavigate }) => {
  const [items, setItems] = React.useState<readonly ISalesOrderRequest[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>({});
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>({});
  const [pagination, setPagination] = React.useState<IPaginationState>({ pageNumber: 1, pageSize, totalCount: 0 });
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadRequests = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await salesOrderRequestService.getRequests(toRequestFilters(appliedFilterValues), pagination, sorting);
      setItems(result.items);
      setPagination(current => ({
        ...current,
        pageNumber: result.pageNumber,
        pageSize: result.pageSize,
        totalCount: result.totalCount
      }));
    } catch (loadError) {
      setItems([]);
      setError(getUserFriendlyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, pagination.pageNumber, pagination.pageSize, salesOrderRequestService, sorting]);

  React.useEffect(() => {
    loadRequests().catch(() => undefined);
  }, [loadRequests]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? { fieldName, direction } : undefined);
    setPagination(current => ({ ...current, pageNumber: 1 }));
  }, []);

  return (
    <EntityDashboard<ISalesOrderRequest>
      title="Sales Order Requests"
      subtitle="SharePoint approval requests for new Business Central sales orders."
      columns={requestColumns}
      filters={requestFilters}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      headerActions={
        <>
          <Button label="Business Central Sales Orders" variant="secondary" onClick={() => onNavigate(salesOrdersModuleConfig.route)} />
          <Button label="Refresh" variant="secondary" disabled={loading} onClick={() => loadRequests().catch(() => undefined)} />
        </>
      }
      createButton={{ label: 'New Sales Order Request', visible: canCreateSalesOrder }}
      onCreate={() => onNavigate(`${salesOrdersModuleConfig.route}/create`)}
      onRowClick={item => onNavigate(`${salesOrdersModuleConfig.route}/requests/detail/${encodeURIComponent(String(item.id))}`)}
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
      getRowKey={(item, index) => item.requestNumber || String(item.id || index)}
      emptyTitle="No sales order requests"
      emptyMessage="No sales order approval requests match the current filters."
    />
  );
};
