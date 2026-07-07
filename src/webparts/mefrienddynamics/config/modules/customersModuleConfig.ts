import type { IModuleConfig } from '../../models/common/IModuleConfig';
import type { ILookupOption } from '../../models/common/ILookupOption';
import type { ICustomerListItem } from '../../models/customers/ICustomerModels';

export const customerBranchOptions: readonly ILookupOption[] = [
  { key: 'CLT', text: 'CLT', value: 'CLT' },
  { key: 'MPM', text: 'MPM', value: 'MPM' },
  { key: 'TVM', text: 'TVM', value: 'TVM' },
  { key: 'TSR', text: 'TSR', value: 'TSR' },
  { key: 'CHN', text: 'CHN', value: 'CHN' },
  { key: 'KTM', text: 'KTM', value: 'KTM' },
  { key: 'CORP', text: 'CORP', value: 'CORP' },
  { key: 'KNR', text: 'KNR', value: 'KNR' }
];

export const customerDepartmentOptions: readonly ILookupOption[] = [
  { key: 'CIR', text: 'CIR', value: 'CIR' },
  { key: 'ADVT', text: 'ADVT', value: 'ADVT' }
];

export const customersModuleConfig: IModuleConfig<ICustomerListItem> = {
  key: 'customers',
  title: 'Customer Master',
  route: 'customers',
  icon: 'Contact',
  description: 'Customer listing, details, search, filtering, and creation.',
  createEnabled: true,
  detailEnabled: true,
  order: 1,
  visible: true,
  tableColumns: [
    { key: 'customerCode', header: 'Customer Code', fieldName: 'customerCode', sortable: true, renderType: 'text' },
    { key: 'customerName', header: 'Customer Name', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'city', header: 'City', fieldName: 'city', sortable: true, renderType: 'text' },
    { key: 'stateCode', header: 'State', fieldName: 'stateCode', sortable: true, renderType: 'text' },
    { key: 'countryCode', header: 'Country', fieldName: 'countryCode', sortable: true, renderType: 'text' },
    { key: 'branch', header: 'Branch', fieldName: 'branch', sortable: true, renderType: 'text' },
    { key: 'department', header: 'Department', fieldName: 'department', sortable: true, renderType: 'text' }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'branch', label: 'Branch', type: 'dropdown', options: customerBranchOptions },
    { key: 'department', label: 'Department', type: 'dropdown', options: customerDepartmentOptions },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'stateCode', label: 'State', type: 'text' }
  ],
  formFields: [
    { key: 'branch', label: 'Branch', type: 'dropdown', required: true, options: customerBranchOptions, section: 'Customer Information' },
    { key: 'department', label: 'Department', type: 'dropdown', required: true, options: customerDepartmentOptions, section: 'Customer Information' },
    { key: 'customerCode', label: 'Customer Code', type: 'text', required: true, section: 'Customer Information' },
    { key: 'customerName', label: 'Customer Name', type: 'text', required: true, section: 'Customer Information' },
    { key: 'address', label: 'Address', type: 'textarea', required: true, section: 'Address Details' },
    { key: 'stateCode', label: 'State Code', type: 'text', required: true, section: 'Address Details' },
    { key: 'countryCode', label: 'Country Code', type: 'text', required: true, section: 'Address Details' },
    { key: 'city', label: 'City', type: 'text', required: true, section: 'Address Details' },
    { key: 'postCode', label: 'Postcode', type: 'text', required: true, section: 'Address Details' },
    { key: 'locationCode', label: 'Location Code', type: 'text', required: true, section: 'Address Details' },
    { key: 'panNo', label: 'PAN No', type: 'text', required: false, section: 'Tax Details' },
    { key: 'gstNo', label: 'GST No', type: 'text', required: false, section: 'Tax Details' }
  ]
};
