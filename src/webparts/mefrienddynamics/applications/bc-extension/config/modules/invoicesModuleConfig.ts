import type { IModuleConfig } from '../../../../shared/models/IModuleConfig';
import type { IInvoiceListItem } from '../../models/invoices/IInvoiceModels';

export const invoicesModuleConfig: IModuleConfig<IInvoiceListItem> = {
  key: 'invoices',
  title: 'Invoices',
  route: 'invoices',
  icon: 'Invoice',
  description: 'Invoice listing and details from Business Central.',
  createEnabled: false,
  detailEnabled: true,
  order: 4,
  visible: true,
  tableColumns: [
    { key: 'invoiceNumber', header: 'Invoice Number', fieldName: 'invoiceNumber', sortable: true, renderType: 'text' },
    { key: 'customerName', header: 'Customer', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'invoiceDate', header: 'Invoice Date', fieldName: 'invoiceDate', sortable: true, renderType: 'date' },
    { key: 'salespersonCode', header: 'Salesperson', fieldName: 'salespersonCode', sortable: false, renderType: 'text' },
    { key: 'netAmount', header: 'Net Amount', fieldName: 'netAmount', sortable: false, renderType: 'amount' }
  ],
  filters: [
    { key: 'searchText', label: 'Search by invoice number', type: 'text' },
    { key: 'invoiceDate', label: 'Invoice Date', type: 'dateRange' },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'salespersonCode', label: 'Salesperson', type: 'dropdown', searchable: true }
  ]
};
