export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue' | 'Unknown' | string;

export interface IInvoiceLineItem {
  lineNumber: string;
  itemCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  currencyCode?: string;
}

export interface IInvoicePaymentRecord {
  id: string;
  paymentDate?: string;
  referenceNumber?: string;
  paymentMode?: string;
  amount?: number;
  currencyCode?: string;
}

export interface IInvoiceListItem {
  id: string;
  invoiceNumber: string;
  customerCode: string;
  customerName: string;
  salesOrderNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus: PaymentStatus;
  invoiceStatus: string;
  currencyCode: string;
}

export interface IInvoiceDetail extends IInvoiceListItem {
  lines: readonly IInvoiceLineItem[];
  payments: readonly IInvoicePaymentRecord[];
}

export interface IInvoiceFilters {
  searchText?: string;
  customerCode?: string;
  salesOrderNumber?: string;
  invoiceStatus?: string;
  paymentStatus?: PaymentStatus;
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  outstandingOnly?: boolean;
}

export interface IOutstandingInvoiceSummary {
  invoiceCount: number;
  outstandingInvoiceCount: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  currencyCode?: string;
}
