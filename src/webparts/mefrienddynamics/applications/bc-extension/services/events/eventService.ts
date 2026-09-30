import type { ApiClient } from '../../../../shared/api/apiClient';
import type { IEventDetail, IEventFilters, IEventListItem } from '../../models/events';
import type { ICursorPaginationState, IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { buildServerPageQuery } from '../../../../shared/utilities/serverPagination';

interface IEventApiModel {
  id?: string;
  eventCode?: string;
  eventName?: string;
  code?: string;
  name?: string;
  status?: string;
  description?: string;
  venue?: string;
}

type EventApiResponse = IServerPagedResult<IEventApiModel>;

export class EventService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getEvents(
    filters: IEventFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IServerPagedResult<IEventListItem>> {
    const response = await this.apiClient.get<EventApiResponse>('/api/Events', buildServerPageQuery({
      searchText: filters.searchText,
      status: filters.status
    }, pagination, sorting));
    const result = response.data;
    const mappedItems = (result?.items || []).map(item => this.mapEventApiToUiModel(item));
    const filteredItems = this.filterEvents(mappedItems, filters);
    const sortedItems = this.sortEvents(filteredItems, sorting);

    return {
      items: sortedItems,
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getEventById(id: string): Promise<IEventDetail> {
    const response = await this.apiClient.get<IEventApiModel>(`/api/Events/${encodeURIComponent(id)}`);

    if (!response.data) {
      const notFoundError = new Error(`Event ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapEventApiToUiModel(response.data);
  }

  public mapEventApiToUiModel(api?: IEventApiModel): IEventDetail {
    const eventCode = api?.eventCode || api?.code || '';
    const eventName = api?.eventName || api?.name || eventCode;

    return {
      id: api?.id || eventCode,
      eventCode,
      eventName,
      status: api?.status || 'Active',
      description: api?.description || eventName,
      venue: api?.venue || ''
    };
  }

  private filterEvents(items: readonly IEventListItem[], filters: IEventFilters): readonly IEventListItem[] {
    const searchText = (filters.searchText || '').trim().toLowerCase();
    const status = (filters.status || '').trim().toLowerCase();

    return items.filter(item => {
      const searchableText = [item.eventCode, item.eventName, item.status].join(' ').toLowerCase();

      if (searchText && searchableText.indexOf(searchText) === -1) {
        return false;
      }

      if (status && item.status.toLowerCase() !== status) {
        return false;
      }

      return true;
    });
  }

  private sortEvents(items: readonly IEventListItem[], sorting?: ISortState): readonly IEventListItem[] {
    if (!sorting) {
      return items;
    }

    return items.slice().sort((left, right) => {
      const leftValue = this.getSortableValue(left, sorting.fieldName);
      const rightValue = this.getSortableValue(right, sorting.fieldName);
      const comparison = this.compareValues(leftValue, rightValue);

      return sorting.direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  private getSortableValue(item: IEventListItem, fieldName: string): string | undefined {
    switch (fieldName) {
      case 'eventCode':
        return item.eventCode;
      case 'eventName':
        return item.eventName;
      case 'status':
        return item.status;
      default:
        return undefined;
    }
  }

  private compareValues(leftValue?: string, rightValue?: string): number {
    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === undefined) {
      return -1;
    }

    if (rightValue === undefined) {
      return 1;
    }

    return leftValue.localeCompare(rightValue);
  }
}
