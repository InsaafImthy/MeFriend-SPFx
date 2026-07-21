export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue' | 'Unknown' | string;

export interface IInvoiceLineItem {
  lineNumber: string;
  lineType?: string;
  documentNumber?: string;
  itemCode?: string;
  hsnCode?: string;
  gstRate?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineDiscountPercentage?: number;
  lineAmount: number;
  amountIncludingVAT?: number;
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
  customerAddress?: string;
  customerGSTNo?: string;
  clientCode?: string;
  clientName?: string;
  clientAddress?: string;
  clientGSTNo?: string;
  customerGSTState?: string;
  clientGSTState?: string;
  salesPerson?: string;
  salesOrderNumber: string;
  salesOrderDate?: string;
  roundOffAmount?: number;
  amountInWords?: string;
  irn?: string;
  acknowledgementNumber?: string;
  acknowledgementDate?: string;
  qrCodeData?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount: number;
  netAmount?: number;
  tradeDiscount?: number;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountPercent?: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
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
