import type { IModuleConfig } from '../../models/common/IModuleConfig';
import type { ILookupOption } from '../../models/common/ILookupOption';
import type { ISalesOrderListItem } from '../../models/salesOrders/ISalesOrderModels';

const salesOrderStatusOptions: readonly ILookupOption[] = [
  { key: 'draft', text: 'Draft', value: 'Draft' },
  { key: 'open', text: 'Open', value: 'Open' },
  { key: 'released', text: 'Released', value: 'Released' },
  { key: 'posted', text: 'Posted', value: 'Posted' },
  { key: 'cancelled', text: 'Cancelled', value: 'Cancelled' }
];

export const salesOrdersModuleConfig: IModuleConfig<ISalesOrderListItem> = {
  key: 'salesOrders',
  title: 'Sales Orders',
  route: 'sales-orders',
  icon: 'SalesOrder',
  description: 'Sales order listing, detail, creation, lines, and related invoices.',
  createEnabled: true,
  detailEnabled: true,
  order: 5,
  visible: true,
  tableColumns: [
    { key: 'salesOrderNumber', header: 'Sales Order Number', fieldName: 'salesOrderNumber', sortable: true, renderType: 'text' },
    { key: 'customerName', header: 'Customer', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'salespersonName', header: 'Salesperson', fieldName: 'salespersonName', sortable: true, renderType: 'text', minWidth: 160 },
    { key: 'eventName', header: 'Event', fieldName: 'eventName', sortable: true, renderType: 'text', minWidth: 160 },
    { key: 'orderDate', header: 'Order Date', fieldName: 'orderDate', sortable: true, renderType: 'date' },
    { key: 'status', header: 'Status', fieldName: 'status', sortable: true, renderType: 'status' },
    { key: 'totalAmount', header: 'Total Amount', fieldName: 'totalAmount', sortable: true, renderType: 'amount' }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'orderDate', label: 'Order Date', type: 'dateRange' },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'salespersonCode', label: 'Salesperson', type: 'text' },
    { key: 'eventCode', label: 'Event', type: 'text' },
    { key: 'status', label: 'Status', type: 'status', options: salesOrderStatusOptions }
  ],
  formFields: [
    { key: 'customerCode', label: 'Customer', type: 'lookup', required: true, section: 'Order Header' },
    { key: 'salespersonCode', label: 'Salesperson', type: 'lookup', required: true, section: 'Order Header' },
    { key: 'eventCode', label: 'Event', type: 'lookup', required: false, section: 'Order Header' },
    { key: 'orderDate', label: 'Order Date', type: 'date', required: true, section: 'Order Header' }
  ]
};
