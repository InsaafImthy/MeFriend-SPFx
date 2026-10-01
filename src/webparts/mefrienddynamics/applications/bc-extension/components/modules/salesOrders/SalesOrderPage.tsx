import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import type { ISalesOrderFilters, ISalesOrderListItem, SalesOrderStatus } from '../../../models/salesOrders';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { SalesOrderService } from '../../../services/salesOrders/salesOrderService';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { useSalespersonFilter } from '../../../hooks/useSalespersonFilter';
import { Button } from '../../../../../shared/components/buttons/Button';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface ISalesOrderPageProps {
  canCreateSalesOrder: boolean;
  currentUser?: IAppUser;
  salesOrderService: SalesOrderService;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const toSalesOrderFilters = (values: EntityFilterValues): ISalesOrderFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  customerCode: typeof values.customerCode === 'string' ? values.customerCode : undefined,
  salespersonCode: typeof values.salespersonCode === 'string' ? values.salespersonCode : undefined,
  status: typeof values.status === 'string' ? (values.status as SalesOrderStatus) : undefined
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Sales order listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const SalesOrderPage: React.FC<ISalesOrderPageProps> = ({
  canCreateSalesOrder,
  currentUser,
  salesOrderService,
  salespersonService,
  onNavigate
}) => {
  const { filters, restrictedSalespersonCode } = useSalespersonFilter(
    salesOrdersModuleConfig.filters || [],
    salespersonService,
    currentUser
  );
  const initialFilterValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
  const [items, setItems] = React.useState<readonly ISalesOrderListItem[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>(initialFilterValues);
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>(initialFilterValues);
  const { pagination, applyResult, changePage, reset } = useCursorPagination();
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadSalesOrders = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await salesOrderService.getSalesOrders(
        toSalesOrderFilters(appliedFilterValues),
        pagination,
        sorting,
        currentUser
      );
      setItems(result.items);
      applyResult(result);
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, applyResult, currentUser, pagination.currentToken, pagination.pageNumber, pagination.pageSize, salesOrderService, sorting]);

  React.useEffect(() => {
    loadSalesOrders().catch(() => undefined);
  }, [loadSalesOrders]);

  React.useEffect(() => {
    if (!restrictedSalespersonCode) {
      return;
    }

    setFilterValues(current => ({ ...current, salespersonCode: restrictedSalespersonCode }));
    setAppliedFilterValues(current => ({ ...current, salespersonCode: restrictedSalespersonCode }));
  }, [restrictedSalespersonCode]);

  const handleFilterChange = React.useCallback((key: string, value: FilterValue): void => {
    if (key === 'salespersonCode' && currentUser?.isSalesperson === true) {
      return;
    }

    setFilterValues(current => ({
      ...current,
      [key]: value
    }));
  }, [currentUser?.isSalesperson]);

  const handleFilterApply = React.useCallback((): void => {
    reset();
    setAppliedFilterValues(restrictedSalespersonCode
      ? { ...filterValues, salespersonCode: restrictedSalespersonCode }
      : filterValues);
  }, [filterValues, reset, restrictedSalespersonCode]);

  const handleFilterClear = React.useCallback((): void => {
    const clearedValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
    setFilterValues(clearedValues);
    setAppliedFilterValues(clearedValues);
    reset();
  }, [reset, restrictedSalespersonCode]);

  const handleSort = React.useCallback((fieldName: string, direction?: SortDirection): void => {
    setSorting(direction ? {
      fieldName,
      direction
    } : undefined);
    reset();
  }, [reset]);

  return (
    <EntityDashboard<ISalesOrderListItem>
      title={salesOrdersModuleConfig.title}
      subtitle={salesOrdersModuleConfig.description}
      columns={salesOrdersModuleConfig.tableColumns || []}
      filters={filters}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      headerActions={<Button label="Sales Order Requests" variant="secondary" onClick={() => onNavigate(`${salesOrdersModuleConfig.route}/requests`)} />}
      createButton={{ label: 'Create Sales Order', visible: canCreateSalesOrder }}
      onCreate={() => onNavigate(`${salesOrdersModuleConfig.route}/create`)}
      onRowClick={
        salesOrdersModuleConfig.detailEnabled
          ? item => onNavigate(`${salesOrdersModuleConfig.route}/detail/${encodeURIComponent(item.salesOrderNumber)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.salesOrderNumber || String(index)}
      emptyTitle="No sales orders found"
      emptyMessage="No sales order records are available from the configured service."
    />
  );
};
