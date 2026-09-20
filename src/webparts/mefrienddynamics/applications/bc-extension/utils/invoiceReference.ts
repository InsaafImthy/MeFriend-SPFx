import { invoicesModuleConfig } from '../config/modules/invoicesModuleConfig';

export const requireInvoiceNumber = (invoiceNumber?: string): string => {
  const normalizedInvoiceNumber = (invoiceNumber || '').trim();

  if (!normalizedInvoiceNumber) {
    throw new Error('Invoice number is missing. This invoice cannot be opened or retrieved.');
  }

  return normalizedInvoiceNumber;
};

export const buildInvoiceDetailPath = (invoiceNumber?: string): string =>
  `${invoicesModuleConfig.route}/detail/${encodeURIComponent(requireInvoiceNumber(invoiceNumber))}`;
