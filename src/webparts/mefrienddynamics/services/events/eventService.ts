import type { ApiClient } from '../api/apiClient';
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

interface IDimensionValueApiModel {
  '@odata.etag'?: string;
  dimensionCode?: string;
  code?: string;
  name?: string;
}

interface IDimensionApiModel {
  '@odata.etag'?: string;
  code?: string;
  name?: string;
  dimensionvalues?: readonly IDimensionValueApiModel[];
  dimensionValues?: readonly IDimensionValueApiModel[];
}

type EventApiResponse =
  | IPagedResult<IEventApiModel>
  | readonly IEventApiModel[]
  | IDimensionApiModel
  | readonly IDimensionApiModel[];

export class EventService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getEvents(
    filters: IEventFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IEventListItem>> {
    const response = await this.apiClient.get<EventApiResponse>('/api/Dimensions');

    return this.mapEventsApiToPagedResult(response.data, filters, pagination, sorting);
  }

  public async getEventById(id: string): Promise<IEventDetail> {
    const result = await this.getEvents({}, { pageNumber: 1, pageSize: 500 });
    const normalizedId = id.trim().toLowerCase();
    const event = result.items.filter(item =>
      [item.id, item.eventCode, item.eventName]
        .filter((value): value is string => Boolean(value))
        .map(value => value.toLowerCase())
        .indexOf(normalizedId) !== -1
    )[0];

    if (!event) {
      throw new Error(`Event ${id} was not found.`);
    }

    return {
      ...event,
      description: event.eventName
    };
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

  private mapEventsApiToPagedResult(
    api: EventApiResponse | undefined,
    filters: IEventFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<IEventListItem> {
    if (this.isDimensionResponse(api)) {
      return this.mapEventItemsToPagedResult(
        this.mapDimensionsToEvents(api),
        filters,
        pagination,
        sorting
      );
    }

    if (this.isEventArray(api)) {
      return this.mapEventItemsToPagedResult(
        api.map(item => this.mapEventApiToUiModel(item)),
        filters,
        pagination,
        sorting
      );
    }

    return this.mapEventItemsToPagedResult(
      (api?.items || []).map(item => this.mapEventApiToUiModel(item)),
      filters,
      pagination,
      sorting
    );
  }

  private mapEventItemsToPagedResult(
    items: readonly IEventListItem[],
    filters: IEventFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<IEventListItem> {
    const filteredItems = this.filterEvents(items, filters);
    const sortedItems = this.sortEvents(filteredItems, sorting);
    const pageSize = Math.max(1, pagination?.pageSize || sortedItems.length || 1);
    const totalCount = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pageNumber = Math.min(Math.max(1, pagination?.pageNumber || 1), totalPages);
    const startIndex = (pageNumber - 1) * pageSize;

    return {
      items: sortedItems.slice(startIndex, startIndex + pageSize),
      pageNumber,
      pageSize,
      totalCount,
      totalPages
    };
  }

  private mapDimensionsToEvents(api: IDimensionApiModel | readonly IDimensionApiModel[]): readonly IEventListItem[] {
    const dimensions = Array.isArray(api) ? api : [api];
    const productDimension = dimensions.filter(dimension =>
      String(dimension.code || '').toUpperCase() === 'PRODUCT'
    )[0] || dimensions[0];
    const values: readonly IDimensionValueApiModel[] =
      productDimension?.dimensionvalues || productDimension?.dimensionValues || [];

    return values.map(value => ({
      id: value.code || '',
      eventCode: value.code || '',
      eventName: (value.name || value.code || '').trim(),
      status: 'Active'
    }));
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

      if (filters.startDateFrom && (!item.startDate || item.startDate < filters.startDateFrom)) {
        return false;
      }

      if (filters.startDateTo && (!item.startDate || item.startDate > filters.startDateTo)) {
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
      case 'startDate':
        return item.startDate;
      case 'endDate':
        return item.endDate;
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

  private isDimensionResponse(api: EventApiResponse | undefined): api is IDimensionApiModel | readonly IDimensionApiModel[] {
    if (!api) {
      return false;
    }

    if (Array.isArray(api)) {
      return api.length === 0 || api.filter(item => this.isDimension(item)).length === api.length;
    }

    if ('items' in api) {
      return false;
    }

    return this.isDimension(api as IEventApiModel | IDimensionApiModel);
  }

  private isDimension(api: IEventApiModel | IDimensionApiModel): api is IDimensionApiModel {
    if ('dimensionvalues' in api || 'dimensionValues' in api) {
      return true;
    }

    if ('code' in api) {
      return String(api.code || '').toUpperCase() === 'PRODUCT';
    }

    return false;
  }

  private isEventArray(api: EventApiResponse | undefined): api is readonly IEventApiModel[] {
    return Array.isArray(api) && !this.isDimensionResponse(api);
  }
}
