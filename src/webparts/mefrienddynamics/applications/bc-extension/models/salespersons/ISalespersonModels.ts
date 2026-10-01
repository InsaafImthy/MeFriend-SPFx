export interface ISalespersonListItem {
  id: string;
  salespersonCode: string;
  salespersonName: string;
  email: string;
  phoneNumber: string;
  mdmCode: string;
}

export type ISalespersonDetail = ISalespersonListItem;

export interface ISalespersonFilters {
  searchText?: string;
}
