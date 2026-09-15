import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { IPaginationState } from '../../../../../shared/models/IPaginationState';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
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

const pageSize = 10;

const toSalesOrderFilters = (values: EntityFilterValues): ISalesOrderFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  customerCode: typeof values.customerCode === 'string' ? values.customerCode : undefined,
  salespersonCode: typeof values.salespersonCode === 'string' ? values.salespersonCode : undefined,
  eventCode: typeof values.eventCode === 'string' ? values.eventCode : undefined,
  status: typeof values.status === 'string' ? (values.status as SalesOrderStatus) : undefined,
  orderDateFrom: typeof values.orderDateFrom === 'string' ? values.orderDateFrom : undefined,
  orderDateTo: typeof values.orderDateTo === 'string' ? values.orderDateTo : undefined
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
  const [pagination, setPagination] = React.useState<IPaginationState>({
    pageNumber: 1,
    pageSize,
    totalCount: 0
  });
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
  }, [appliedFilterValues, currentUser, pagination.pageNumber, pagination.pageSize, salesOrderService, sorting]);

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
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
    setAppliedFilterValues(restrictedSalespersonCode
      ? { ...filterValues, salespersonCode: restrictedSalespersonCode }
      : filterValues);
  }, [filterValues, restrictedSalespersonCode]);

  const handleFilterClear = React.useCallback((): void => {
    const clearedValues = restrictedSalespersonCode ? { salespersonCode: restrictedSalespersonCode } : {};
    setFilterValues(clearedValues);
    setAppliedFilterValues(clearedValues);
    setPagination(current => ({
      ...current,
      pageNumber: 1
    }));
  }, [restrictedSalespersonCode]);

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
          ? item => onNavigate(`${salesOrdersModuleConfig.route}/detail/${encodeURIComponent(item.id || item.salesOrderNumber)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.salesOrderNumber || String(index)}
      emptyTitle="No sales orders found"
      emptyMessage="No sales order records are available from the configured service."
    />
  );
};
