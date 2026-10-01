import type { IInvoiceLineItem } from '../../../models/invoices';
import {
  enrichInvoiceLinesForPrint,
  enrichInvoiceLinesWithRequestRemarks,
  getPrintableLineDescription
} from './invoicePrintUtils';

const createInvoiceLine = (itemCode?: string): IInvoiceLineItem => ({
  lineNumber: itemCode || '',
  documentNumber: '',
  itemCode: itemCode || '',
  hsnCode: '',
  gstRate: '',
  description: 'BC description must not be printed',
  quantity: 1,
  unitPrice: 100,
  lineAmount: 100
});

describe('invoice print line descriptions', () => {
  it('builds descriptions from item code, Item Master description, and remarks', () => {
    expect(getPrintableLineDescription({
      ...createInvoiceLine(' IM001 '),
      itemDescription: ' Education Package ',
      remarks: ' Annual conference stage setup '
    })).toBe('IM001 - Education Package - Annual conference stage setup');
    expect(getPrintableLineDescription({
      ...createInvoiceLine('IM001'),
      description: '',
      itemDescription: 'Education Package'
    })).toBe('IM001 - Education Package');
    expect(getPrintableLineDescription({ ...createInvoiceLine(), remarks: 'Remarks only' })).toBe('Remarks only');
    expect(getPrintableLineDescription({ ...createInvoiceLine(), description: '' })).toBe('');
  });

  it('skips blank and duplicate description parts', () => {
    expect(getPrintableLineDescription({
      ...createInvoiceLine('IM001'),
      itemDescription: ' Education Package ',
      remarks: 'education package'
    })).toBe('IM001 - Education Package');
    expect(getPrintableLineDescription({
      ...createInvoiceLine('IM001'),
      description: '',
      itemDescription: '',
      remarks: '  '
    })).toBe('IM001');
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
    const enriched = enrichInvoiceLinesWithRequestRemarks([
      { ...createInvoiceLine('IM001'), description: '' }
    ], []);

    expect(enriched[0].remarks).toBeUndefined();
    expect(getPrintableLineDescription(enriched[0])).toBe('IM001');
  });

  it('retains Item Master descriptions separately from request remarks', () => {
    const enriched = enrichInvoiceLinesForPrint(
      [{ ...createInvoiceLine('IM001'), description: 'BC line description' }],
      [{ itemCode: 'IM001', remarks: 'September service charge' }],
      [{ number: ' im001 ', description: ' Education Package ' }]
    );

    expect(enriched[0]).toMatchObject({
      itemDescription: 'Education Package',
      remarks: 'September service charge',
      description: 'BC line description'
    });
    expect(getPrintableLineDescription(enriched[0]))
      .toBe('IM001 - Education Package - September service charge');
  });
});
