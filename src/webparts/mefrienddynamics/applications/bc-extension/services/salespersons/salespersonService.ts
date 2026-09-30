import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ISalespersonDetail,
  ISalespersonFilters,
  ISalespersonListItem
} from '../../models/salespersons';
import type { ICursorPaginationState, IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { buildServerPageQuery } from '../../../../shared/utilities/serverPagination';
import { normalizeSalespersonCode } from '../../utils/salespersonDataScope';

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

interface ISalespersonLookupPagedResponse {
  items: readonly ISalespersonLookupItem[];
  pageSize?: number;
  hasNext?: boolean;
  nextToken?: string;
}

type SalespersonListApiResponse = IServerPagedResult<ISalespersonApiModel>;
type SalespersonLookupApiResponse =
  | readonly ISalespersonLookupItem[]
  | ISalespersonLookupPagedResponse;

const salespersonLookupPageSize = 100;

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
    const mappedItems = (result?.items || []).map(item => this.mapSalespersonApiToUiModel(item));
    const filteredItems = this.filterSalespersons(mappedItems, filters);
    const sortedItems = this.sortSalespersons(filteredItems, sorting);

    return {
      items: sortedItems,
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getSalespersonLookup(
    searchText?: string
  ): Promise<IServerPagedResult<ISalespersonLookupItem>> {
    const allItems: ISalespersonLookupItem[] = [];
    const seenContinuationTokens = new Set<string>();
    let nextToken: string | undefined;

    do {
      const response = await this.apiClient.get<SalespersonLookupApiResponse>('/api/Salespersons/lookup', {
        SearchText: searchText,
        PageSize: salespersonLookupPageSize,
        ContinuationToken: nextToken
      });
      const result = response.data;

      if (Array.isArray(result)) {
        allItems.push(...result);
        nextToken = undefined;
        continue;
      }

      const pagedResult = result as ISalespersonLookupPagedResponse | undefined;
      allItems.push(...(pagedResult?.items || []));

      const returnedNextToken = pagedResult?.hasNext === true
        ? pagedResult.nextToken
        : undefined;

      if (returnedNextToken && seenContinuationTokens.has(returnedNextToken)) {
        throw new Error('Salesperson lookup pagination returned a repeated continuation token.');
      }

      if (returnedNextToken) {
        seenContinuationTokens.add(returnedNextToken);
      }

      nextToken = returnedNextToken;
    } while (nextToken);

    return {
      items: this.normalizeSalespersonLookupItems(allItems),
      pageSize: salespersonLookupPageSize,
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
      phoneNumber: api?.phoneNo || api?.phoneNumber || '',
      branch: api?.branch || '',
      department: api?.department || ''
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
