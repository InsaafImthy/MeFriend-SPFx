import { buildInvoiceDetailPath, requireInvoiceNumber } from './invoiceReference';

describe('invoice business references', () => {
  it('builds invoice detail routes from the invoice number instead of the system GUID', () => {
    const invoice = {
      id: '42eadb99-be08-f111-8405-6045bde7abd0',
      invoiceNumber: 'INV/123'
    };

    const path = buildInvoiceDetailPath(invoice.invoiceNumber);

    expect(path).toBe('invoices/detail/INV%2F123');
    expect(path).not.toContain(invoice.id);
  });

  it('trims invoice numbers and rejects missing business references', () => {
    expect(requireInvoiceNumber(' INV-123 ')).toBe('INV-123');
    expect(() => requireInvoiceNumber('   ')).toThrow('Invoice number is missing');
  });
});
