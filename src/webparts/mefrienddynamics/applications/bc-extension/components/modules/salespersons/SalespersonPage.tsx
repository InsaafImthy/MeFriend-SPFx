import * as React from 'react';
import { salespersonsModuleConfig } from '../../../config/modules/salespersonsModuleConfig';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import type { ISalespersonFilters, ISalespersonListItem } from '../../../models/salespersons';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { SalespersonService } from '../../../services/salespersons/salespersonService';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface ISalespersonPageProps {
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const toSalespersonFilters = (values: EntityFilterValues): ISalespersonFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined
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
  const { pagination, applyResult, changePage, reset } = useCursorPagination();
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadSalespersons = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await salespersonService.getSalespersons(toSalespersonFilters(appliedFilterValues), pagination, sorting);
      setItems(result.items);
      applyResult(result);
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, applyResult, pagination.currentToken, pagination.pageNumber, pagination.pageSize, salespersonService, sorting]);

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
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.salespersonCode || String(index)}
      emptyTitle="No salespersons found"
      emptyMessage="No salesperson records are available from the configured service."
    />
  );
};
