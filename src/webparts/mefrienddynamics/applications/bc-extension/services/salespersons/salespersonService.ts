import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ISalespersonDetail,
  ISalespersonFilters,
  ISalespersonListItem
} from '../../models/salespersons';
import type { IBcPagedResult, ICursorPaginationState } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { fetchAllBcLookupItems, MAX_BC_LOOKUP_PAGE_SIZE } from '../../../../shared/utilities/bcLookupPagination';
import { buildBcPageQuery } from '../../../../shared/utilities/serverPagination';
import { normalizeSalespersonCode } from '../../utils/salespersonDataScope';

interface ISalespersonApiModel {
  id?: string;
  '@odata.etag'?: string;
  code?: string;
  name?: string;
  phone?: string;
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

type SalespersonListApiResponse = IBcPagedResult<ISalespersonApiModel>;
type SalespersonLookupApiResponse = IBcPagedResult<ISalespersonLookupItem>;

export class SalespersonService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalespersons(
    filters: ISalespersonFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IBcPagedResult<ISalespersonListItem>> {
    const response = await this.apiClient.get<SalespersonListApiResponse>('/api/Salespersons', buildBcPageQuery({
      search: filters.searchText
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
    searchText?: string
  ): Promise<IBcPagedResult<ISalespersonLookupItem>> {
    const allItems = await fetchAllBcLookupItems<ISalespersonLookupItem>(async query => {
      const response = await this.apiClient.get<SalespersonLookupApiResponse>('/api/Salespersons/lookup', query);
      return response.data;
    }, searchText);

    return {
      items: this.normalizeSalespersonLookupItems(allItems),
      pageSize: MAX_BC_LOOKUP_PAGE_SIZE,
      hasNext: false
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
      phoneNumber: api?.phone || api?.phoneNo || api?.phoneNumber || '',
      branch: api?.branch || '',
      department: api?.department || ''
    };
  }

  private normalizeSalespersonLookupItems(
    items: readonly ISalespersonLookupItem[]
  ): readonly ISalespersonLookupItem[] {
    const itemsByCode = new Map<string, ISalespersonLookupItem>();

    items.forEach(item => {
      const code = normalizeSalespersonCode(item.code);

      if (!code) {
        return;
      }

      const name = (item.name || '').trim();
      const existingItem = itemsByCode.get(code);

      if (!existingItem || (!existingItem.name && name)) {
        itemsByCode.set(code, { code, name });
      }
    });

    return Array.from(itemsByCode.values()).sort((left, right) => left.code.localeCompare(right.code));
  }
}
