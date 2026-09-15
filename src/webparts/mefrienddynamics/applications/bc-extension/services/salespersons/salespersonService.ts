import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ISalespersonDetail,
  ISalespersonFilters,
  ISalespersonListItem
} from '../../models/salespersons';
import type { IPagedResult } from '../../../../shared/models/IPagedResult';
import type { IPaginationState } from '../../../../shared/models/IPaginationState';
import type { ISortState } from '../../../../shared/models/ISortState';

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

type SalespersonListApiResponse = IPagedResult<ISalespersonApiModel> | readonly ISalespersonApiModel[];
type SalespersonLookupApiResponse = readonly ISalespersonLookupItem[];

export class SalespersonService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalespersons(
    filters: ISalespersonFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ISalespersonListItem>> {
    const response = await this.apiClient.get<SalespersonListApiResponse>('/api/Salespersons');

    return this.mapSalespersonListResult(response.data, filters, pagination, sorting);
  }

  public async getSalespersonLookup(): Promise<readonly ISalespersonLookupItem[]> {
    const response = await this.apiClient.get<SalespersonLookupApiResponse>('/api/Salespersons/lookup');

    return (response.data || []).map(item => ({
      code: (item.code || '').trim(),
      name: (item.name || '').trim()
    })).filter(item => item.code);
  }

  public async getSalespersonById(id: string): Promise<ISalespersonDetail> {
    const response = await this.apiClient.get<SalespersonListApiResponse>('/api/Salespersons');
    const salesperson = this.findSalespersonById(response.data, id);

    if (!salesperson) {
      const notFoundError = new Error(`Salesperson ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapSalespersonApiToUiModel(salesperson);
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

  private mapSalespersonListResult(
    api: SalespersonListApiResponse | undefined,
    filters: ISalespersonFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ISalespersonListItem> {
    if (this.isSalespersonArray(api)) {
      return this.mapArrayResult(api, filters, pagination, sorting);
    }

    return this.mapPagedResult(api);
  }

  private mapArrayResult(
    apiItems: readonly ISalespersonApiModel[],
    filters: ISalespersonFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ISalespersonListItem> {
    const pageNumber = Math.max(1, pagination?.pageNumber || 1);
    const pageSize = Math.max(1, pagination?.pageSize || apiItems.length || 1);
    const mappedItems = apiItems.map(item => this.mapSalespersonApiToUiModel(item));
    const filteredItems = this.filterSalespersons(mappedItems, filters);
    const sortedItems = this.sortSalespersons(filteredItems, sorting);
    const startIndex = (pageNumber - 1) * pageSize;
    const totalCount = sortedItems.length;

    return {
      items: sortedItems.slice(startIndex, startIndex + pageSize),
      pageNumber,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
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

  private filterSalespersons(
    salespersons: readonly ISalespersonListItem[],
    filters: ISalespersonFilters
  ): readonly ISalespersonListItem[] {
    const searchText = this.normalizeFilterText(filters.searchText);
    const status = this.normalizeFilterText(filters.status);
    const branch = this.normalizeFilterText(filters.branch);
    const department = this.normalizeFilterText(filters.department);

    return salespersons.filter(salesperson => {
      if (searchText && !this.salespersonMatchesSearch(salesperson, searchText)) {
        return false;
      }

      if (status && this.normalizeFilterText(salesperson.status).indexOf(status) === -1) {
        return false;
      }

      if (branch && this.normalizeFilterText(salesperson.branch).indexOf(branch) === -1) {
        return false;
      }

      if (department && this.normalizeFilterText(salesperson.department).indexOf(department) === -1) {
        return false;
      }

      return true;
    });
  }

  private salespersonMatchesSearch(salesperson: ISalespersonListItem, searchText: string): boolean {
    const searchableText = [
      salesperson.salespersonCode,
      salesperson.salespersonName,
      salesperson.email,
      salesperson.phoneNumber
    ].map(value => this.normalizeFilterText(value)).join(' ');

    return searchableText.indexOf(searchText) !== -1;
  }

  private sortSalespersons(
    salespersons: readonly ISalespersonListItem[],
    sorting?: ISortState
  ): readonly ISalespersonListItem[] {
    if (!sorting) {
      return salespersons;
    }

    const directionMultiplier = sorting.direction === 'desc' ? -1 : 1;

    return salespersons.slice().sort((left, right) => {
      const leftValue = this.normalizeSortValue(this.getSalespersonFieldValue(left, sorting.fieldName));
      const rightValue = this.normalizeSortValue(this.getSalespersonFieldValue(right, sorting.fieldName));

      if (leftValue < rightValue) {
        return -1 * directionMultiplier;
      }

      if (leftValue > rightValue) {
        return directionMultiplier;
      }

      return 0;
    });
  }

  private isSalespersonArray(api: SalespersonListApiResponse | undefined): api is readonly ISalespersonApiModel[] {
    return Array.isArray(api);
  }

  private findSalespersonById(
    api: SalespersonListApiResponse | undefined,
    id: string
  ): ISalespersonApiModel | undefined {
    const normalizedId = this.normalizeFilterText(id);
    const items = this.isSalespersonArray(api) ? api : api?.items || [];

    return items.find(item => this.salespersonMatchesId(item, normalizedId));
  }

  private salespersonMatchesId(salesperson: ISalespersonApiModel, normalizedId: string): boolean {
    return [
      salesperson.id,
      salesperson.code,
      salesperson.salespersonCode
    ].some(value => this.normalizeFilterText(value) === normalizedId);
  }

  private getSalespersonFieldValue(salesperson: ISalespersonListItem, fieldName: string): unknown {
    return (salesperson as unknown as Record<string, unknown>)[fieldName];
  }

  private normalizeFilterText(value: string | undefined): string {
    return (value || '').trim().toLowerCase();
  }

  private normalizeSortValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).trim().toLowerCase();
  }
}
