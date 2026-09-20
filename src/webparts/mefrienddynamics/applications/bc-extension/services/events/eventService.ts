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

    return {
      items: (result?.items || []).map(item => this.mapEventApiToUiModel(item)),
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
}
