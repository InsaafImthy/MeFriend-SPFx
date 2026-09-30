import type { IInvoiceLineItem } from '../../../models/invoices';

export interface IRequestLineRemarksSource {
  itemCode?: string;
  remarks?: string;
}

interface IIndexedRequestLine {
  index: number;
  line: IRequestLineRemarksSource;
}

const normalizeItemCode = (value?: string): string => (value || '').trim().toLowerCase();

const canUseIndexFallback = (
  invoiceLine: IInvoiceLineItem,
  requestLine: IRequestLineRemarksSource
): boolean => {
  const invoiceItemCode = normalizeItemCode(invoiceLine.itemCode);
  const requestItemCode = normalizeItemCode(requestLine.itemCode);

  return !invoiceItemCode || !requestItemCode;
};

export const enrichInvoiceLinesWithRequestRemarks = (
  invoiceLines: readonly IInvoiceLineItem[],
  requestLines: readonly IRequestLineRemarksSource[]
): readonly IInvoiceLineItem[] => {
  const requestLineQueues = new Map<string, IIndexedRequestLine[]>();
  const matches: Array<IIndexedRequestLine | undefined> = new Array(invoiceLines.length);
  const usedRequestLineIndexes = new Set<number>();

  requestLines.forEach((line, index) => {
    const itemCode = normalizeItemCode(line.itemCode);
    if (!itemCode) {
      return;
    }

    const queue = requestLineQueues.get(itemCode) || [];
    queue.push({ index, line });
    requestLineQueues.set(itemCode, queue);
  });

  invoiceLines.forEach((line, index) => {
    const itemCode = normalizeItemCode(line.itemCode);
    if (!itemCode) {
      return;
    }

    const match = requestLineQueues.get(itemCode)?.shift();
    if (match) {
      matches[index] = match;
      usedRequestLineIndexes.add(match.index);
    }
  });

  invoiceLines.forEach((line, index) => {
    if (matches[index]) {
      return;
    }

    const requestLine = requestLines[index];
    if (
      requestLine &&
      !usedRequestLineIndexes.has(index) &&
      canUseIndexFallback(line, requestLine)
    ) {
      matches[index] = { index, line: requestLine };
      usedRequestLineIndexes.add(index);
    }
  });

  return invoiceLines.map((line, index) => ({
    ...line,
    remarks: matches[index]?.line.remarks
  }));
};

export const getPrintableLineDescription = (line: IInvoiceLineItem): string => {
  const itemCode = (line.itemCode || '').trim();
  const remarks = (line.remarks || '').trim();

  if (itemCode && remarks) {
    return `${itemCode} - ${remarks}`;
  }

  return itemCode || remarks;
};
