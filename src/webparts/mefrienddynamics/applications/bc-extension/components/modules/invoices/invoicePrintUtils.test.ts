import type { IInvoiceLineItem } from '../../../models/invoices';
import { enrichInvoiceLinesWithRequestRemarks, getPrintableLineDescription } from './invoicePrintUtils';

const createInvoiceLine = (itemCode?: string): IInvoiceLineItem => ({
  lineNumber: itemCode || '',
  itemCode,
  description: 'BC description must not be printed',
  quantity: 1,
  unitPrice: 100,
  lineAmount: 100
});

describe('invoice print line descriptions', () => {
  it('builds descriptions from item code and SharePoint remarks only', () => {
    expect(getPrintableLineDescription({
      ...createInvoiceLine(' IM001 '),
      remarks: ' Annual conference stage setup '
    })).toBe('IM001 - Annual conference stage setup');
    expect(getPrintableLineDescription(createInvoiceLine('IM001'))).toBe('IM001');
    expect(getPrintableLineDescription({ ...createInvoiceLine(), remarks: 'Remarks only' })).toBe('Remarks only');
    expect(getPrintableLineDescription(createInvoiceLine())).toBe('');
  });

  it('matches duplicate item codes in occurrence order', () => {
    const enriched = enrichInvoiceLinesWithRequestRemarks(
      [createInvoiceLine('IM001'), createInvoiceLine('IM002'), createInvoiceLine('IM001')],
      [
        { itemCode: 'IM001', remarks: 'First remark' },
        { itemCode: 'IM002', remarks: 'Second remark' },
        { itemCode: 'IM001', remarks: 'Third remark' }
      ]
    );

    expect(enriched.map(getPrintableLineDescription)).toEqual([
      'IM001 - First remark',
      'IM002 - Second remark',
      'IM001 - Third remark'
    ]);
  });

  it('uses a request line at the same index only when an item code is missing', () => {
    const enriched = enrichInvoiceLinesWithRequestRemarks(
      [createInvoiceLine(), createInvoiceLine('IM002'), createInvoiceLine('DIFFERENT')],
      [
        { itemCode: 'IM001', remarks: 'Index fallback' },
        { itemCode: 'IM002', remarks: 'Item match' },
        { itemCode: 'IM003', remarks: 'Must not be assigned' }
      ]
    );

    expect(enriched.map(line => line.remarks)).toEqual(['Index fallback', 'Item match', undefined]);
  });

  it('falls back to item codes when no SharePoint request lines are available', () => {
    const enriched = enrichInvoiceLinesWithRequestRemarks([createInvoiceLine('IM001')], []);

    expect(enriched[0].remarks).toBeUndefined();
    expect(getPrintableLineDescription(enriched[0])).toBe('IM001');
  });
});
