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
  address: string;
  postCode: string;
  panNo: string;
  gstNo: string;
}

export interface ICustomerCreateFormState {
  branch: CustomerBranch | string;
  department: CustomerDepartment | string;
  customerCode: string;
  customerName: string;
  address: string;
  stateCode: string;
  countryCode: string;
  city: string;
  postCode: string;
  locationCode: string;
  panNo: string;
  gstNo: string;
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
