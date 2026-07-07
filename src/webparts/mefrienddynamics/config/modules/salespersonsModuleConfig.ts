import type { IModuleConfig } from '../../models/common/IModuleConfig';
import type { ILookupOption } from '../../models/common/ILookupOption';
import type { ISalespersonListItem } from '../../models/salespersons/ISalespersonModels';

const salespersonStatusOptions: readonly ILookupOption[] = [
  { key: 'active', text: 'Active', value: 'Active' },
  { key: 'inactive', text: 'Inactive', value: 'Inactive' },
  { key: 'blocked', text: 'Blocked', value: 'Blocked' }
];

export const salespersonsModuleConfig: IModuleConfig<ISalespersonListItem> = {
  key: 'salespersons',
  title: 'Salespersons',
  route: 'salespersons',
  icon: 'People',
  description: 'Read-only salesperson listing with search and filtering.',
  createEnabled: false,
  detailEnabled: false,
  order: 3,
  visible: true,
  tableColumns: [
    { key: 'salespersonCode', header: 'Salesperson Code', fieldName: 'salespersonCode', sortable: true, renderType: 'text' },
    { key: 'salespersonName', header: 'Salesperson Name', fieldName: 'salespersonName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'email', header: 'Email', fieldName: 'email', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'status', header: 'Status', fieldName: 'status', sortable: true, renderType: 'status' }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'status', label: 'Status', type: 'status', options: salespersonStatusOptions }
  ]
};
