import type { ApiClient } from '../api/apiClient';
import type { QueryParams } from '../api/apiTypes';
import type { IEventDetail, IEventFilters, IEventListItem } from '../../models/events';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';

interface IEventApiModel {
  id?: string;
  eventCode?: string;
  eventName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  description?: string;
  venue?: string;
}

export class EventService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getEvents(
    filters: IEventFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IEventListItem>> {
    const response = await this.apiClient.get<IPagedResult<IEventApiModel>>(
      '/api/events',
      this.buildQueryParams(filters, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
  }

  public async getEventById(id: string): Promise<IEventDetail> {
    const response = await this.apiClient.get<IEventApiModel>(`/api/events/${encodeURIComponent(id)}`);
    return this.mapEventApiToUiModel(response.data);
  }

  public mapEventApiToUiModel(api?: IEventApiModel): IEventDetail {
    return {
      id: api?.id || api?.eventCode || '',
      eventCode: api?.eventCode || '',
      eventName: api?.eventName || '',
      startDate: api?.startDate,
      endDate: api?.endDate,
      status: api?.status || '',
      description: api?.description || '',
      venue: api?.venue || ''
    };
  }

  private buildQueryParams(
    filters: IEventFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): QueryParams {
    return {
      searchText: filters.searchText,
      status: filters.status,
      startDateFrom: filters.startDateFrom,
      startDateTo: filters.startDateTo,
      pageNumber: pagination?.pageNumber,
      pageSize: pagination?.pageSize,
      sortField: sorting?.fieldName,
      sortDirection: sorting?.direction
    };
  }

  private mapPagedResult(api?: IPagedResult<IEventApiModel>): IPagedResult<IEventListItem> {
    return {
      items: (api?.items || []).map(item => this.mapEventApiToUiModel(item)),
      pageNumber: api?.pageNumber || 1,
      pageSize: api?.pageSize || 0,
      totalCount: api?.totalCount || 0,
      totalPages: api?.totalPages || 0
    };
  }
}
