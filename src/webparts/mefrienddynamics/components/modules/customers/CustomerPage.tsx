import * as React from 'react';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import type { ICustomerFilters, ICustomerListItem } from '../../../models/customers';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import { EntityDashboard } from '../../common/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../common/filters/EntityFilters';

export interface ICustomerPageProps {
  canCreateCustomer: boolean;
  customerService: CustomerService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const toCustomerFilters = (values: EntityFilterValues): ICustomerFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  branch: typeof values.branch === 'string' ? values.branch : undefined,
  department: typeof values.department === 'string' ? values.department : undefined,
  city: typeof values.city === 'string' ? values.city : undefined,
  stateCode: typeof values.stateCode === 'string' ? values.stateCode : undefined
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Customer listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const CustomerPage: React.FC<ICustomerPageProps> = ({ canCreateCustomer, customerService, onNavigate }) => {
  const [items, setItems] = React.useState<readonly ICustomerListItem[]>([]);
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

  const loadCustomers = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await customerService.getCustomers(toCustomerFilters(appliedFilterValues), pagination, sorting);
      setItems(result.items);
      setPagination(current => ({
        ...current,
        pageNumber: result.pageNumber || current.pageNumber,
        pageSize: result.pageSize || current.pageSize,
        totalCount: result.totalCount || 0
      }));
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, customerService, pagination.pageNumber, pagination.pageSize, sorting]);

  React.useEffect(() => {
    loadCustomers().catch(() => undefined);
  }, [loadCustomers]);

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

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? {
      fieldName,
      direction
    } : undefined);
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, []);

  return (
    <EntityDashboard<ICustomerListItem>
      title={customersModuleConfig.title}
      subtitle={customersModuleConfig.description}
      columns={customersModuleConfig.tableColumns || []}
      filters={customersModuleConfig.filters || []}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      createButton={customersModuleConfig.createEnabled ? { label: 'Create Customer', visible: canCreateCustomer } : undefined}
      onCreate={() => onNavigate(`${customersModuleConfig.route}/create`)}
      onRowClick={
        customersModuleConfig.detailEnabled
          ? item => onNavigate(`${customersModuleConfig.route}/detail/${encodeURIComponent(item.id || item.customerCode)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.customerCode || String(index)}
      emptyTitle="No customers found"
      emptyMessage="No customer records are available from the configured service."
    />
  );
};
