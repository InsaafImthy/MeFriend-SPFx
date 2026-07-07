import type { PaymentStatus } from '../invoices/IInvoiceModels';

export type SalesOrderStatus = 'Draft' | 'Open' | 'Released' | 'Posted' | 'Cancelled' | 'Unknown' | string;

export interface ISalesOrderLineItem {
  lineNumber: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
}

export interface ISalesOrderRelatedInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate?: string;
  totalAmount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus: PaymentStatus;
  invoiceStatus: string;
  currencyCode: string;
}

export interface ISalesOrderInvoiceSummary {
  invoiceCount: number;
  outstandingInvoiceCount: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
}

export interface ISalesOrderListItem {
  id: string;
  salesOrderNumber: string;
  customerCode: string;
  customerName: string;
  salespersonCode: string;
  salespersonName: string;
  eventCode: string;
  eventName: string;
  orderDate?: string;
  status: SalesOrderStatus;
  totalAmount: number;
  currencyCode: string;
}

export interface ISalesOrderDetail extends ISalesOrderListItem {
  lines: readonly ISalesOrderLineItem[];
  relatedInvoices: readonly ISalesOrderRelatedInvoice[];
  invoiceSummary: ISalesOrderInvoiceSummary;
}

export interface ISalesOrderCreateFormState {
  customerCode: string;
  salespersonCode: string;
  eventCode?: string;
  orderDate?: string;
  currencyCode?: string;
  lines: readonly ISalesOrderLineItem[];
}

export interface ISalesOrderCreateRequest {
  customerCode: string;
  salespersonCode: string;
  orderDate?: string;
  lines: readonly ISalesOrderLineItem[];
}

export interface ISalesOrderFilters {
  searchText?: string;
  customerCode?: string;
  salespersonCode?: string;
  eventCode?: string;
  status?: SalesOrderStatus;
  orderDateFrom?: string;
  orderDateTo?: string;
}
