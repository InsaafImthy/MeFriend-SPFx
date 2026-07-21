import type { IModuleConfig } from '../../models/common/IModuleConfig';
import type { ILookupOption } from '../../models/common/ILookupOption';
import type { IInvoiceListItem } from '../../models/invoices/IInvoiceModels';

const paymentStatusOptions: readonly ILookupOption[] = [
  { key: 'paid', text: 'Paid', value: 'Paid' },
  { key: 'partiallyPaid', text: 'Partially Paid', value: 'Partially Paid' },
  { key: 'unpaid', text: 'Unpaid', value: 'Unpaid' },
  { key: 'overdue', text: 'Overdue', value: 'Overdue' }
];

const invoiceStatusOptions: readonly ILookupOption[] = [
  { key: 'open', text: 'Open', value: 'Open' },
  { key: 'posted', text: 'Posted', value: 'Posted' },
  { key: 'cancelled', text: 'Cancelled', value: 'Cancelled' }
];

export const invoicesModuleConfig: IModuleConfig<IInvoiceListItem> = {
  key: 'invoices',
  title: 'Invoices',
  route: 'invoices',
  icon: 'Invoice',
  description: 'Invoice listing, details, outstanding, and payment visibility.',
  createEnabled: false,
  detailEnabled: true,
  order: 4,
  visible: true,
  tableColumns: [
    { key: 'invoiceNumber', header: 'Invoice Number', fieldName: 'invoiceNumber', sortable: true, renderType: 'text' },
    { key: 'customerName', header: 'Customer', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'salesOrderNumber', header: 'Sales Order', fieldName: 'salesOrderNumber', sortable: true, renderType: 'text' },
    { key: 'invoiceDate', header: 'Invoice Date', fieldName: 'invoiceDate', sortable: true, renderType: 'date' },
    { key: 'dueDate', header: 'Due Date', fieldName: 'dueDate', sortable: true, renderType: 'date' },
    { key: 'totalAmount', header: 'Total Amount', fieldName: 'totalAmount', sortable: true, renderType: 'amount' },
    { key: 'paidAmount', header: 'Paid Amount', fieldName: 'paidAmount', sortable: true, renderType: 'amount' },
    { key: 'outstandingAmount', header: 'Outstanding Amount', fieldName: 'outstandingAmount', sortable: true, renderType: 'amount', minWidth: 150 },
    { key: 'paymentStatus', header: 'Payment Status', fieldName: 'paymentStatus', sortable: true, renderType: 'status', minWidth: 142 },
    { key: 'invoiceStatus', header: 'Invoice Status', fieldName: 'invoiceStatus', sortable: true, renderType: 'status', minWidth: 142 }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'invoiceDate', label: 'Invoice Date', type: 'dateRange' },
    { key: 'invoiceStatus', label: 'Invoice Status', type: 'status', options: invoiceStatusOptions },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'salesOrderNumber', label: 'Sales Order', type: 'text' },
    { key: 'paymentStatus', label: 'Payment Status', type: 'status', options: paymentStatusOptions },
    { key: 'outstandingOnly', label: 'Outstanding only', type: 'outstandingOnly' }
  ]
};
