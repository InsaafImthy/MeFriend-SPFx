import type { ApiClient } from '../api/apiClient';
import type { QueryParams } from '../api/apiTypes';
import type {
  ISalespersonDetail,
  ISalespersonFilters,
  ISalespersonListItem
} from '../../models/salespersons';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';

interface ISalespersonApiModel {
  id?: string;
  salespersonCode?: string;
  salespersonName?: string;
  email?: string;
  status?: string;
  phoneNumber?: string;
  branch?: string;
  department?: string;
}

export class SalespersonService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalespersons(
    filters: ISalespersonFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ISalespersonListItem>> {
    const response = await this.apiClient.get<IPagedResult<ISalespersonApiModel>>(
      '/api/salespersons',
      this.buildQueryParams(filters, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
  }

  public async getSalespersonById(id: string): Promise<ISalespersonDetail> {
    const response = await this.apiClient.get<ISalespersonApiModel>(`/api/salespersons/${encodeURIComponent(id)}`);
    return this.mapSalespersonApiToUiModel(response.data);
  }

  public mapSalespersonApiToUiModel(api?: ISalespersonApiModel): ISalespersonDetail {
    return {
      id: api?.id || api?.salespersonCode || '',
      salespersonCode: api?.salespersonCode || '',
      salespersonName: api?.salespersonName || '',
      email: api?.email || '',
      status: api?.status || '',
      phoneNumber: api?.phoneNumber || '',
      branch: api?.branch || '',
      department: api?.department || ''
    };
  }

  private buildQueryParams(
    filters: ISalespersonFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): QueryParams {
    return {
      searchText: filters.searchText,
      status: filters.status,
      branch: filters.branch,
      department: filters.department,
      pageNumber: pagination?.pageNumber,
      pageSize: pagination?.pageSize,
      sortField: sorting?.fieldName,
      sortDirection: sorting?.direction
    };
  }

  private mapPagedResult(api?: IPagedResult<ISalespersonApiModel>): IPagedResult<ISalespersonListItem> {
    return {
      items: (api?.items || []).map(item => this.mapSalespersonApiToUiModel(item)),
      pageNumber: api?.pageNumber || 1,
      pageSize: api?.pageSize || 0,
      totalCount: api?.totalCount || 0,
      totalPages: api?.totalPages || 0
    };
  }
}
