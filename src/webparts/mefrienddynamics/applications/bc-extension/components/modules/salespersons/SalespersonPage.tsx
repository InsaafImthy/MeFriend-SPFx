import * as React from 'react';
import { salespersonsModuleConfig } from '../../../config/modules/salespersonsModuleConfig';
import type { IPaginationState } from '../../../../../shared/models/IPaginationState';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import type { ISalespersonFilters, ISalespersonListItem } from '../../../models/salespersons';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface ISalespersonPageProps {
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const toSalespersonFilters = (values: EntityFilterValues): ISalespersonFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  status: typeof values.status === 'string' ? values.status : undefined,
  branch: typeof values.branch === 'string' ? values.branch : undefined,
  department: typeof values.department === 'string' ? values.department : undefined
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Salesperson listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const SalespersonPage: React.FC<ISalespersonPageProps> = ({ salespersonService, onNavigate }) => {
  const [items, setItems] = React.useState<readonly ISalespersonListItem[]>([]);
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

  const loadSalespersons = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await salespersonService.getSalespersons(toSalespersonFilters(appliedFilterValues), pagination, sorting);
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
  }, [appliedFilterValues, pagination.pageNumber, pagination.pageSize, salespersonService, sorting]);

  React.useEffect(() => {
    loadSalespersons().catch(() => undefined);
  }, [loadSalespersons]);

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
    <EntityDashboard<ISalespersonListItem>
      title={salespersonsModuleConfig.title}
      subtitle={salespersonsModuleConfig.description}
      columns={salespersonsModuleConfig.tableColumns || []}
      filters={salespersonsModuleConfig.filters || []}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      onRowClick={
        salespersonsModuleConfig.detailEnabled
          ? item =>
              onNavigate(
                `${salespersonsModuleConfig.route}/detail/${encodeURIComponent(item.id || item.salespersonCode)}`
              )
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.salespersonCode || String(index)}
      emptyTitle="No salespersons found"
      emptyMessage="No salesperson records are available from the configured service."
    />
  );
};
