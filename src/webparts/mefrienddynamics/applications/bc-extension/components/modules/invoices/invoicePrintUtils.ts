import type { IInvoiceLineItem } from '../../../models/invoices';

export interface IRequestLineRemarksSource {
  itemCode?: string;
  remarks?: string;
}

export interface IItemMasterDescriptionSource {
  number?: string;
  description?: string;
}

interface IIndexedRequestLine {
  index: number;
  line: IRequestLineRemarksSource;
}

const normalizeItemCode = (value?: string): string => (value || '').trim().toLowerCase();

const findItemDescription = (
  itemMasters: readonly IItemMasterDescriptionSource[],
  itemCode?: string
): string | undefined => {
  const normalizedCode = normalizeItemCode(itemCode);
  if (!normalizedCode) {
    return undefined;
  }

  return itemMasters.find(item => normalizeItemCode(item.number) === normalizedCode)?.description?.trim() || undefined;
};

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

export const enrichInvoiceLinesForPrint = (
  invoiceLines: readonly IInvoiceLineItem[],
  requestLines: readonly IRequestLineRemarksSource[],
  itemMasters: readonly IItemMasterDescriptionSource[]
): readonly IInvoiceLineItem[] => enrichInvoiceLinesWithRequestRemarks(invoiceLines, requestLines).map(line => ({
  ...line,
  itemDescription: findItemDescription(itemMasters, line.itemCode)
}));

export const getPrintableLineDescription = (line: IInvoiceLineItem): string => {
  const parts = [line.itemCode, line.itemDescription, line.remarks || line.description];
  const seen = new Set<string>();

  return parts.reduce<string[]>((result, value) => {
    const part = (value || '').trim();
    const normalizedPart = part.toLowerCase();

    if (part && !seen.has(normalizedPart)) {
      seen.add(normalizedPart);
      result.push(part);
    }

    return result;
  }, []).join(' - ');
};
