import type { ApiClient } from '../../../../shared/api/apiClient';
import type { IBcPagedResult } from '../../../../shared/models/IServerPagination';
import { fetchAllBcLookupItems, MAX_BC_LOOKUP_PAGE_SIZE } from '../../../../shared/utilities/bcLookupPagination';

export interface IItemMasterLookupItem {
  number: string;
  description: string;
  unitPrice?: number;
}

type ItemMasterLookupApiResponse = IBcPagedResult<IItemMasterLookupItem>;

const normalizeText = (value: string): string => value.trim();
const normalizeNumber = (value: number | undefined): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export class ItemMasterService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getItemMasterLookup(
    searchText?: string,
    pageSize: number = MAX_BC_LOOKUP_PAGE_SIZE
  ): Promise<IBcPagedResult<IItemMasterLookupItem>> {
    const items = await fetchAllBcLookupItems<IItemMasterLookupItem>(async query => {
      const response = await this.apiClient.get<ItemMasterLookupApiResponse>('/api/ItemMasters/lookup', query);
      return response.data;
    }, searchText, pageSize);

    return {
      items: items.map(item => ({
        number: normalizeText(item.number || ''),
        description: normalizeText(item.description || ''),
        unitPrice: normalizeNumber(item.unitPrice)
      })).filter(item => item.number),
      pageSize,
      hasNext: false
    };
  }
}
