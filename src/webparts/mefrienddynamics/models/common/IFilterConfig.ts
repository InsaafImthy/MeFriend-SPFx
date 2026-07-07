import type { ILookupOption } from './ILookupOption';

export type FilterConfigType = 'text' | 'dropdown' | 'dateRange' | 'status' | 'outstandingOnly';

export interface IFilterConfig<TValue = unknown> {
  key: string;
  label: string;
  type: FilterConfigType;
  options?: readonly ILookupOption[];
  defaultValue?: TValue;
}
