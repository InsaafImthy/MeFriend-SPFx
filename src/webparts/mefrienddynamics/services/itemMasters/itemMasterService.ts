import type { ApiClient } from '../api/apiClient';

export interface IItemMasterLookupItem {
  number: string;
  description: string;
}

type ItemMasterLookupApiResponse = readonly IItemMasterLookupItem[];

const normalizeText = (value: string): string => value.trim();

export class ItemMasterService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getItemMasterLookup(): Promise<readonly IItemMasterLookupItem[]> {
    const response = await this.apiClient.get<ItemMasterLookupApiResponse>('/api/ItemMasters/lookup');

    return (response.data || []).map(item => ({
      number: normalizeText(item.number || ''),
      description: normalizeText(item.description || '')
    })).filter(item => item.number);
  }
}
