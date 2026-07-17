export type MasterDataListKey = 'stateCodes' | 'countryCodes';

export interface IMasterCodeItem {
  id?: number;
  code: string;
  name: string;
}

export interface IMasterCodeInput {
  code: string;
  name: string;
}
