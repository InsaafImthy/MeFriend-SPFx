import type { ApiClient } from '../../../../shared/api/apiClient';
import type { IEventDetail, IEventFilters, IEventListItem } from '../../models/events';
import type { IBcPagedResult, ICursorPaginationState } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { buildBcPageQuery } from '../../../../shared/utilities/serverPagination';

interface IEventApiModel {
  '@odata.etag': string;
  dimensionCode: string;
  code: string;
  name: string;
}

type EventApiResponse = IBcPagedResult<IEventApiModel>;

export class EventService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getEvents(
    filters: IEventFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IBcPagedResult<IEventListItem>> {
    const response = await this.apiClient.get<EventApiResponse>('/api/Events', buildBcPageQuery({
      search: filters.searchText
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

  public mapEventApiToUiModel(api: IEventApiModel): IEventDetail {
    return {
      id: api.code,
      dimensionCode: api.dimensionCode,
      eventCode: api.code,
      eventName: api.name
    };
  }
}
