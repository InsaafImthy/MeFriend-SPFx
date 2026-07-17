export interface ISalespersonListItem {
  id: string;
  salespersonCode: string;
  salespersonName: string;
  email: string;
  phoneNumber: string;
  status: string;
  branch?: string;
  department?: string;
}

export type ISalespersonDetail = ISalespersonListItem;

export interface ISalespersonFilters {
  searchText?: string;
  status?: string;
  branch?: string;
  department?: string;
}
