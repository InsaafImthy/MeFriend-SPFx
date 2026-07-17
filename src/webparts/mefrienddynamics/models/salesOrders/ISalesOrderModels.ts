import type { PaymentStatus } from '../invoices/IInvoiceModels';

export type SalesOrderStatus = 'Draft' | 'Open' | 'Released' | 'Posted' | 'Cancelled' | 'Unknown' | string;

export interface ISalesOrderLineItem {
  lineNumber: string;
  documentNumber?: string;
  lineType?: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitPriceExcludingTax?: number;
  lineAmount: number;
  amountIncludingVAT?: number;
  taxAmount?: number;
  lineStatus?: string;
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
  clientCode?: string;
  clientName?: string;
  salespersonCode: string;
  salespersonName: string;
  eventCode: string;
  eventName: string;
  postingDate?: string;
  orderDate?: string;
  status: SalesOrderStatus;
  totalAmount: number;
  amountIncludingVAT?: number;
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
  countryCode?: string;
  stateCode?: string;
  orderDate?: string;
  postingDate?: string;
  externalDocumentNumber?: string;
  remarks?: string;
  currencyCode?: string;
  lines: readonly ISalesOrderLineItem[];
}

export interface ISalesOrderCreateRequest {
  customerCode: string;
  salespersonCode: string;
  eventCode?: string;
  countryCode?: string;
  stateCode?: string;
  orderDate?: string;
  postingDate?: string;
  externalDocumentNumber?: string;
  remarks?: string;
  currencyCode?: string;
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
