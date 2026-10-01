import * as React from 'react';
import { customersModuleConfig } from '../../../config/modules/customersModuleConfig';
import type { ICustomerFilters, ICustomerListItem } from '../../../models/customers';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { CustomerService } from '../../../services/customers/customerService';
import { Button } from '../../../../../shared/components/buttons/Button';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface ICustomerPageProps {
  canCreateCustomer: boolean;
  customerService: CustomerService;
  onNavigate: (path: string) => void;
}

const toCustomerFilters = (values: EntityFilterValues): ICustomerFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  city: typeof values.city === 'string' ? values.city : undefined,
  gstCustomerType: typeof values.gstCustomerType === 'string' ? values.gstCustomerType : undefined
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
  const { pagination, applyResult, changePage, reset } = useCursorPagination();
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadCustomers = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await customerService.getCustomers(toCustomerFilters(appliedFilterValues), pagination, sorting);
      setItems(result.items);
      applyResult(result);
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, applyResult, customerService, pagination.currentToken, pagination.pageNumber, pagination.pageSize, sorting]);

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
    reset();
    setAppliedFilterValues(filterValues);
  }, [filterValues, reset]);

  const handleFilterClear = React.useCallback((): void => {
    setFilterValues({});
    setAppliedFilterValues({});
    reset();
  }, [reset]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? {
      fieldName,
      direction
    } : undefined);
    reset();
  }, [reset]);

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
      headerActions={<Button label="Customer Requests" variant="secondary" onClick={() => onNavigate(`${customersModuleConfig.route}/requests`)} />}
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
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={item => item.id}
      emptyTitle="No customers found"
      emptyMessage="No customer records are available from the configured service."
    />
  );
};
