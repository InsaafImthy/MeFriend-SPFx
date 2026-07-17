export type CustomerBranch = 'CLT' | 'MPM' | 'TVM' | 'TSR' | 'CHN' | 'KTM' | 'CORP' | 'KNR';
export type CustomerDepartment = 'CIR' | 'ADVT';

export interface ICustomerListItem {
  id: string;
  customerCode: string;
  customerName: string;
  branch?: string;
  department?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  locationCode?: string;
  status?: string;
}

export interface ICustomerDetail extends ICustomerListItem {
  name: string;
  name2: string;
  address: string;
  countryRegionCode: string;
  postCode: string;
  PAN: string;
  gstRegistrationNo: string;
  genPostingGroup: string;
  customerPostingGroup: string;
  gstCustomerType: string;
}

export interface ICustomerCreateFormState {
  name: string;
  name2: string;
  address: string;
  stateCode: string;
  countryRegionCode: string;
  city: string;
  postCode: string;
  locationCode: string;
  PAN: string;
  gstRegistrationNo: string;
  genPostingGroup: string;
  customerPostingGroup: string;
  gstCustomerType: string;
}

export interface ICustomerCreateRequest extends ICustomerCreateFormState {}

export interface ICustomerFilters {
  searchText?: string;
  branch?: string;
  department?: string;
  city?: string;
  stateCode?: string;
  status?: string;
}
