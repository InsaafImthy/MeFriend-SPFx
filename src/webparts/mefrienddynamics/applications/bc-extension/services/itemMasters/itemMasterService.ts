import type { ApiClient } from '../../../../shared/api/apiClient';

export interface IItemMasterLookupItem {
  number: string;
  description: string;
  unitPrice?: number;
}

type ItemMasterLookupApiResponse = readonly IItemMasterLookupItem[];

const normalizeText = (value: string): string => value.trim();
const normalizeNumber = (value: number | undefined): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export class ItemMasterService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getItemMasterLookup(): Promise<readonly IItemMasterLookupItem[]> {
    const response = await this.apiClient.get<ItemMasterLookupApiResponse>('/api/ItemMasters/lookup');

    return (response.data || []).map(item => ({
      number: normalizeText(item.number || ''),
      description: normalizeText(item.description || ''),
      unitPrice: normalizeNumber(item.unitPrice)
    })).filter(item => item.number);
  }
}
