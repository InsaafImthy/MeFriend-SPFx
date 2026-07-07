export interface ISalespersonListItem {
  id: string;
  salespersonCode: string;
  salespersonName: string;
  email: string;
  status: string;
}

export interface ISalespersonDetail extends ISalespersonListItem {
  phoneNumber?: string;
  branch?: string;
  department?: string;
}

export interface ISalespersonFilters {
  searchText?: string;
  status?: string;
  branch?: string;
  department?: string;
}
