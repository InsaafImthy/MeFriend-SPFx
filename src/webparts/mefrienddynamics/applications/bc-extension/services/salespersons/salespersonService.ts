import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ISalespersonDetail,
  ISalespersonFilters,
  ISalespersonListItem
} from '../../models/salespersons';
import { DEFAULT_SERVER_PAGE_SIZE, type ICursorPaginationState, type IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { buildServerPageQuery } from '../../../../shared/utilities/serverPagination';

interface ISalespersonApiModel {
  id?: string;
  '@odata.etag'?: string;
  code?: string;
  name?: string;
  phoneNo?: string;
  salespersonCode?: string;
  salespersonName?: string;
  email?: string;
  status?: string;
  phoneNumber?: string;
  branch?: string;
  department?: string;
}

export interface ISalespersonLookupItem {
  code: string;
  name: string;
}

type SalespersonListApiResponse = IServerPagedResult<ISalespersonApiModel>;
type SalespersonLookupApiResponse = IServerPagedResult<ISalespersonLookupItem>;

export class SalespersonService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalespersons(
    filters: ISalespersonFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IServerPagedResult<ISalespersonListItem>> {
    const response = await this.apiClient.get<SalespersonListApiResponse>('/api/Salespersons', buildServerPageQuery({
      searchText: filters.searchText,
      status: filters.status,
      branch: filters.branch,
      department: filters.department
    }, pagination, sorting));
    const result = response.data;

    return {
      items: (result?.items || []).map(item => this.mapSalespersonApiToUiModel(item)),
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getSalespersonLookup(
    searchText?: string,
    pageSize: number = DEFAULT_SERVER_PAGE_SIZE
  ): Promise<IServerPagedResult<ISalespersonLookupItem>> {
    const response = await this.apiClient.get<SalespersonLookupApiResponse>('/api/Salespersons/lookup', {
      searchText,
      pageSize
    });
    const result = response.data;

    return {
      items: (result?.items || []).map(item => ({
        code: (item.code || '').trim(),
        name: (item.name || '').trim()
      })).filter(item => item.code),
      pageSize: result?.pageSize || pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getSalespersonById(id: string): Promise<ISalespersonDetail> {
    const response = await this.apiClient.get<ISalespersonApiModel>(`/api/Salespersons/${encodeURIComponent(id)}`);

    if (!response.data) {
      const notFoundError = new Error(`Salesperson ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapSalespersonApiToUiModel(response.data);
  }

  public mapSalespersonApiToUiModel(api?: ISalespersonApiModel): ISalespersonDetail {
    const salespersonCode = api?.code || api?.salespersonCode || '';

    return {
      id: api?.id || salespersonCode,
      salespersonCode,
      salespersonName: api?.name || api?.salespersonName || '',
      email: api?.email || '',
      status: api?.status || '',
      phoneNumber: api?.phoneNo || api?.phoneNumber || '',
      branch: api?.branch || '',
      department: api?.department || ''
    };
  }
}
