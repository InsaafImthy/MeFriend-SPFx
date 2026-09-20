import type { ApiClient } from '../../../../shared/api/apiClient';
import { DEFAULT_SERVER_PAGE_SIZE, type IServerPagedResult } from '../../../../shared/models/IServerPagination';

export interface IItemMasterLookupItem {
  number: string;
  description: string;
  unitPrice?: number;
}

type ItemMasterLookupApiResponse = IServerPagedResult<IItemMasterLookupItem>;

const normalizeText = (value: string): string => value.trim();
const normalizeNumber = (value: number | undefined): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export class ItemMasterService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getItemMasterLookup(
    searchText?: string,
    pageSize: number = DEFAULT_SERVER_PAGE_SIZE
  ): Promise<IServerPagedResult<IItemMasterLookupItem>> {
    const response = await this.apiClient.get<ItemMasterLookupApiResponse>('/api/ItemMasters/lookup', {
      searchText,
      pageSize
    });
    const result = response.data;

    return {
      items: (result?.items || []).map(item => ({
        number: normalizeText(item.number || ''),
        description: normalizeText(item.description || ''),
        unitPrice: normalizeNumber(item.unitPrice)
      })).filter(item => item.number),
      pageSize: result?.pageSize || pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }
}
