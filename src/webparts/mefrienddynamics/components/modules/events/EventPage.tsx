import * as React from 'react';
import { eventsModuleConfig } from '../../../config/modules/eventsModuleConfig';
import type { IPaginationState } from '../../../models/common/IPaginationState';
import type { ISortState, SortDirection } from '../../../models/common/ISortState';
import type { IEventFilters, IEventListItem } from '../../../models/events';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { EventService } from '../../../services/events/eventService';
import { EntityDashboard } from '../../common/dashboard/EntityDashboard';
import type { EntityFilterValues, FilterValue } from '../../common/filters/EntityFilters';

export interface IEventPageProps {
  eventService: EventService;
  onNavigate: (path: string) => void;
}

const pageSize = 10;

const toEventFilters = (values: EntityFilterValues): IEventFilters => ({
  searchText: typeof values.searchText === 'string' ? values.searchText : undefined,
  status: typeof values.status === 'string' ? values.status : undefined
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
  const [pagination, setPagination] = React.useState<IPaginationState>({
    pageNumber: 1,
    pageSize,
    totalCount: 0
  });
  const [sorting, setSorting] = React.useState<ISortState | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  const loadEvents = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(undefined);

    try {
      const result = await eventService.getEvents(toEventFilters(appliedFilterValues), pagination, sorting);
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
  }, [appliedFilterValues, eventService, pagination.pageNumber, pagination.pageSize, sorting]);

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
          ? item => onNavigate(`${eventsModuleConfig.route}/detail/${encodeURIComponent(item.id || item.eventCode)}`)
          : undefined
      }
      onFilterChange={handleFilterChange}
      onFilterApply={handleFilterApply}
      onFilterClear={handleFilterClear}
      pagination={pagination}
      onPageChange={pageNumber => setPagination(current => ({ ...current, pageNumber }))}
      sorting={sorting}
      onSort={handleSort}
      getRowKey={(item, index) => item.id || item.eventCode || String(index)}
      emptyTitle="No events found"
      emptyMessage="No event records are available from the configured service."
    />
  );
};
