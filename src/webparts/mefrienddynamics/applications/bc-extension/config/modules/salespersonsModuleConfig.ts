import type { IModuleConfig } from '../../../../shared/models/IModuleConfig';
import type { ISalespersonListItem } from '../../models/salespersons/ISalespersonModels';

export const salespersonsModuleConfig: IModuleConfig<ISalespersonListItem> = {
  key: 'salespersons',
  title: 'Salespersons',
  route: 'salespersons',
  icon: 'People',
  description: 'Read-only salesperson listing from Business Central.',
  createEnabled: false,
  detailEnabled: false,
  order: 3,
  visible: true,
  tableColumns: [
    { key: 'salespersonCode', header: 'Code', fieldName: 'salespersonCode', sortable: true, renderType: 'text' },
    { key: 'salespersonName', header: 'Salesperson', fieldName: 'salespersonName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'phoneNumber', header: 'Phone No.', fieldName: 'phoneNumber', sortable: false, renderType: 'text', minWidth: 140 },
    { key: 'email', header: 'Email', fieldName: 'email', sortable: true, renderType: 'text', minWidth: 220 }
  ],
  filters: [
    { key: 'searchText', label: 'Search by code', type: 'text' }
  ]
};
