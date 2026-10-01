import * as React from 'react';
import { eventsModuleConfig } from '../../../config/modules/eventsModuleConfig';
import type { ISortState, SortDirection } from '../../../../../shared/models/ISortState';
import { useCursorPagination } from '../../../../../shared/hooks/useCursorPagination';
import type { IEventFilters, IEventListItem } from '../../../models/events';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { EventService } from '../../../services/events/eventService';
import { EntityDashboard } from '../../../../../shared/components/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../../../../shared/components/filters/EntityFilters';

export interface IEventPageProps {
  eventService: EventService;
  onNavigate: (path: string) => void;
}

const toEventFilters = (values: EntityFilterValues): IEventFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined
});

const getListErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Event listing API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const EventPage: React.FC<IEventPageProps> = ({ eventService, onNavigate }) => {
  const [items, setItems] = React.useState<readonly IEventListItem[]>([]);
  const [filterValues, setFilterValues] = React.useState<EntityFilterValues>({});
  const [appliedFilterValues, setAppliedFilterValues] = React.useState<EntityFilterValues>({});
  const { pagination, applyResult, changePage, reset } = useCursorPagination();
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadEvents = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await eventService.getEvents(toEventFilters(appliedFilterValues), pagination, sorting);
      setItems(result.items);
      applyResult(result);
    } catch (loadError) {
      setItems([]);
      setError(getListErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [appliedFilterValues, applyResult, eventService, pagination.currentToken, pagination.pageNumber, pagination.pageSize, sorting]);

  React.useEffect(() => {
    loadEvents().catch(() => undefined);
  }, [loadEvents]);

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
    <EntityDashboard<IEventListItem>
      title={eventsModuleConfig.title}
      subtitle={eventsModuleConfig.description}
      columns={eventsModuleConfig.tableColumns || []}
      filters={eventsModuleConfig.filters || []}
      filterValues={filterValues}
      items={items}
      loading={loading}
      error={error}
      onRowClick={
        eventsModuleConfig.detailEnabled
          ? item => onNavigate(`${eventsModuleConfig.route}/detail/${encodeURIComponent(item.eventCode)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      cursorPagination={pagination}
      onPageChange={changePage}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={item => item.eventCode}
      emptyTitle="No events found"
      emptyMessage="No event records are available from the configured service."
    />
  );
};
