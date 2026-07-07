import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { IInvoiceFilters, IInvoiceListItem, PaymentStatus } from '../../../models/invoices';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import { EntityDashboard } from '../../common/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../common/filters/EntityFilters';

export interface IInvoicePageProps {
  invoiceService: InvoiceService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const toInvoiceFilters = (values: EntityFilterValues): IInvoiceFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  customerCode: typeof values.customerCode === 'string' ? values.customerCode : undefined,
  salesOrderNumber: typeof values.salesOrderNumber === 'string' ? values.salesOrderNumber : undefined,
  invoiceStatus: typeof values.invoiceStatus === 'string' ? values.invoiceStatus : undefined,
  paymentStatus: typeof values.paymentStatus === 'string' ? (values.paymentStatus as PaymentStatus) : undefined,
  invoiceDateFrom: typeof values.invoiceDateFrom === 'string' ? values.invoiceDateFrom : undefined,
  invoiceDateTo: typeof values.invoiceDateTo === 'string' ? values.invoiceDateTo : undefined,
  dueDateFrom: typeof values.dueDateFrom === 'string' ? values.dueDateFrom : undefined,
  dueDateTo: typeof values.dueDateTo === 'string' ? values.dueDateTo : undefined,
  outstandingOnly: values.outstandingOnly === true
});

const isOutstandingInvoice = (invoice: IInvoiceListItem): boolean => {
  const status = invoice.paymentStatus.toLowerCase();

  return (
    (typeof invoice.outstandingAmount === 'number' && invoice.outstandingAmount > 0) ||
    status === 'unpaid' ||
    status === 'partially paid' ||
    status === 'overdue'
  );
};

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const InvoicePage: React.FC<IInvoicePageProps> = ({ invoiceService, onNavigate }) => {
  const [items, setItems] = React.useState<readonly IInvoiceListItem[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>({});
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>({});
  const [pagination, setPagination] = React.useState<IPaginationState>({
    pageNumber: 1,
    pageSize,
    totalCount: 0
  });
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadInvoices = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const filters = toInvoiceFilters(appliedFilterValues);
      const result = await invoiceService.getInvoices(filters, pagination, sorting);
      const visibleItems = filters.outstandingOnly ? result.items.filter(isOutstandingInvoice) : result.items;

      setItems(visibleItems);
      setPagination(current => ({
        ...current,
        pageNumber: result.pageNumber || current.pageNumber,
        pageSize: result.pageSize || current.pageSize,
        totalCount: filters.outstandingOnly ? visibleItems.length : result.totalCount || 0
      }));
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, invoiceService, pagination.pageNumber, pagination.pageSize, sorting]);

  React.useEffect(() => {
    loadInvoices().catch(() => undefined);
  }, [loadInvoices]);

  const handleFilterChange = React.useCallback((key: string, value: FilterValue): void => {
    setFilterValues(current => ({
      ...current,
      [key]: value
    }));
  }, []);

  const handleFilterApply = React.useCallback((): void => {
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
    setAppliedFilterValues(filterValues);
  }, [filterValues]);

  const handleFilterClear = React.useCallback((): void => {
    setFilterValues({});
    setAppliedFilterValues({});
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, []);

  const handleSort = React.useCallback((fieldName: string, direction: SortDirection): void => {
    setSorting({
      fieldName,
      direction
    });
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, []);

  const outstandingOnlyActive = appliedFilterValues.outstandingOnly === true;

  return (
    <EntityDashboard<IInvoiceListItem>
      title={invoicesModuleConfig.title}
      subtitle={invoicesModuleConfig.description}
      columns={invoicesModuleConfig.tableColumns || []}
      filters={invoicesModuleConfig.filters || []}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      onRowClick={
        invoicesModuleConfig.detailEnabled
          ? item => onNavigate(`${invoicesModuleConfig.route}/detail/${encodeURIComponent(item.id || item.invoiceNumber)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.invoiceNumber || String(index)}
      emptyTitle={outstandingOnlyActive ? 'No outstanding invoices found.' : 'No invoices found'}
      emptyMessage={
        outstandingOnlyActive
          ? 'No outstanding invoices found.'
          : 'No invoice records are available from the configured service.'
      }
    />
  );
};
