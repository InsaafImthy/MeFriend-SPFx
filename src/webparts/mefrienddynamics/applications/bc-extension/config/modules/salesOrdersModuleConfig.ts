import type { IModuleConfig } from '../../../../shared/models/IModuleConfig';
import type { ILookupOption } from '../../../../shared/models/ILookupOption';
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
  description: 'Sales order listing, detail, creation, and lines.',
  createEnabled: true,
  detailEnabled: true,
  order: 5,
  visible: true,
  tableColumns: [
    { key: 'salesOrderNumber', header: 'Sales Order Number', fieldName: 'salesOrderNumber', sortable: true, renderType: 'text' },
    { key: 'customerCode', header: 'Sell-to Customer No.', fieldName: 'customerCode', sortable: false, renderType: 'text', minWidth: 160 },
    { key: 'clientCode', header: 'Bill-to Customer No.', fieldName: 'clientCode', sortable: false, renderType: 'text', minWidth: 160 },
    { key: 'orderDate', header: 'RO Date', fieldName: 'orderDate', sortable: false, renderType: 'date' },
    { key: 'postingDate', header: 'Posting Date', fieldName: 'postingDate', sortable: false, renderType: 'date' },
    { key: 'status', header: 'Status', fieldName: 'status', sortable: true, renderType: 'status' },
    { key: 'invoiceDiscountAmountExclVat', header: 'Invoice Discount', fieldName: 'invoiceDiscountAmountExclVat', sortable: false, renderType: 'amount' }
  ],
  filters: [
    { key: 'searchText', label: 'Search by sales order number', type: 'text' },
    { key: 'customerCode', label: 'Customer', type: 'text' },
    { key: 'status', label: 'Status', type: 'status', options: salesOrderStatusOptions },
    { key: 'salespersonCode', label: 'Salesperson', type: 'dropdown', searchable: true }
  ],
  formFields: [
    { key: 'postingDate', label: 'Posting Date', type: 'date', required: true, section: 'Sales Order Header' },
    { key: 'customerCode', label: 'Sell-to Customer No.', type: 'lookup', required: true, section: 'Sales Order Header' },
    { key: 'billToCustomerCode', label: 'Bill-to Customer No.', type: 'lookup', required: true, section: 'Sales Order Header' },
    {
      key: 'externalDocumentNumber',
      label: 'RO No.',
      type: 'text',
      required: true,
      section: 'Sales Order Header'
    },
    { key: 'orderDate', label: 'RO Date', type: 'date', required: true, section: 'Sales Order Header' },
    { key: 'salespersonCode', label: 'Salesperson', type: 'lookup', required: true, section: 'Sales Order Header' },
    { key: 'stateCode', label: 'Location Code', type: 'lookup', required: true, section: 'Sales Order Header' },
    { key: 'eventCode', label: 'Product Dimension', type: 'lookup', required: true, section: 'Sales Order Header' }
  ]
};

export const salesOrderLineItemFields = [
  { key: 'itemCode', label: 'Item', type: 'lookup', required: true, searchable: true },
  {
    key: 'quantity',
    label: 'Quantity',
    type: 'number',
    required: true,
    validationRules: [{ type: 'min', value: 0.00001, message: 'Quantity must be greater than zero.' }]
  },
  {
    key: 'unitPrice',
    label: 'Rate',
    type: 'amount',
    required: true,
    validationRules: [{ type: 'min', value: 0, message: 'Unit price/rate cannot be negative.' }]
  },
  {
    key: 'lineDiscountPercentage',
    label: 'Line Discount %',
    type: 'number',
    required: false,
    validationRules: [
      { type: 'min', value: 0, message: 'Line discount cannot be negative.' },
      { type: 'max', value: 100, message: 'Line discount cannot exceed 100%.' }
    ]
  },
  {
    key: 'remarks',
    label: 'Remarks',
    type: 'textarea',
    required: false,
    validationRules: [{ type: 'maxLength', value: 2000, message: 'Remarks cannot exceed 2,000 characters.' }]
  }
] as const;
