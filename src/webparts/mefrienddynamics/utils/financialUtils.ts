import type { PaymentStatus } from '../models/invoices/IInvoiceModels';
import type { ISalesOrderInvoiceSummary, ISalesOrderRelatedInvoice } from '../models/salesOrders/ISalesOrderModels';

const isValidNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const calculateOutstandingAmount = (
  totalAmount: number | undefined,
  paidAmount?: number,
  backendOutstandingAmount?: number
): number | undefined => {
  if (isValidNumber(backendOutstandingAmount)) {
    return backendOutstandingAmount;
  }

  if (!isValidNumber(totalAmount) || !isValidNumber(paidAmount)) {
    return undefined;
  }

  return totalAmount - paidAmount;
};

export const calculatePaymentStatus = (
  paidAmount?: number,
  outstandingAmount?: number,
  backendStatus?: PaymentStatus
): PaymentStatus => {
  if (backendStatus && backendStatus.trim()) {
    return backendStatus;
  }

  if (!isValidNumber(outstandingAmount)) {
    return 'Unknown';
  }

  if (outstandingAmount <= 0) {
    return 'Paid';
  }

  if (isValidNumber(paidAmount) && paidAmount > 0 && outstandingAmount > 0) {
    return 'Partially Paid';
  }

  if ((!isValidNumber(paidAmount) || paidAmount <= 0) && outstandingAmount > 0) {
    return 'Unpaid';
  }

  return 'Unknown';
};

export const summarizeRelatedInvoices = (
  relatedInvoices: readonly ISalesOrderRelatedInvoice[]
): ISalesOrderInvoiceSummary => ({
  invoiceCount: relatedInvoices.length,
  outstandingInvoiceCount: relatedInvoices.filter(invoice => (invoice.outstandingAmount || 0) > 0).length,
  totalInvoicedAmount: relatedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0),
  totalPaidAmount: relatedInvoices.reduce((total, invoice) => total + (invoice.paidAmount || 0), 0),
  totalOutstandingAmount: relatedInvoices.reduce((total, invoice) => total + (invoice.outstandingAmount || 0), 0)
});
