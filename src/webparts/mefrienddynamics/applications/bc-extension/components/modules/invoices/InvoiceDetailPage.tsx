import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { IFormFieldConfig } from '../../../../../shared/models/IFormFieldConfig';
import type { ITableColumn } from '../../../../../shared/models/ITableColumn';
import type { IInvoiceDetail, IInvoiceLineItem, IInvoicePaymentRecord } from '../../../models/invoices';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import type { IItemMasterLookupItem, ItemMasterService } from '../../../services/itemMasters';
import type { ISalespersonLookupItem, SalespersonService } from '../../../services/salespersons/salespersonService';
import type { EntityFormValues } from '../../../../../shared/utilities/validationUtils';
import { EntityDetailPage, EntityDetailSection } from '../../../../../shared/components/detailPage/EntityDetailPage';
import { FinancialSummaryCards } from '../../../../../shared/components/financialSummary/FinancialSummaryCards';
import { ReadOnlyEntityForm } from '../../../../../shared/components/forms/ReadOnlyEntityForm';
import { RelatedRecordsSection } from '../../../../../shared/components/relatedRecords/RelatedRecordsSection';

export interface IInvoiceDetailPageProps {
  currentUser?: IAppUser;
  invoiceId: string;
  itemMasterService: ItemMasterService;
  invoiceService: InvoiceService;
  salespersonService: SalespersonService;
  onNavigate: (path: string) => void;
}

const normalizeLookupKey = (value?: string): string => (value || '').trim().toLowerCase();

const findSalespersonName = (
  salespersons: readonly ISalespersonLookupItem[],
  salespersonValue?: string
): string | undefined => {
  const normalizedValue = normalizeLookupKey(salespersonValue);

  if (!normalizedValue) {
    return undefined;
  }

  const matchingSalesperson = salespersons.find(item => normalizeLookupKey(item.code) === normalizedValue);

  return matchingSalesperson?.name || undefined;
};

const findItemDescription = (
  itemMasters: readonly IItemMasterLookupItem[],
  itemCode?: string
): string | undefined => {
  const normalizedCode = normalizeLookupKey(itemCode);

  if (!normalizedCode) {
    return undefined;
  }

  const matchingItem = itemMasters.find(item => normalizeLookupKey(item.number) === normalizedCode);

  return matchingItem?.description || undefined;
};

const enrichInvoiceItemDescriptions = (
  invoice: IInvoiceDetail,
  itemMasters: readonly IItemMasterLookupItem[]
): IInvoiceDetail => ({
  ...invoice,
  lines: invoice.lines.map(line => ({
    ...line,
    description: line.description || findItemDescription(itemMasters, line.itemCode) || line.itemCode || ''
  }))
});

const lineColumns: readonly ITableColumn<IInvoiceLineItem>[] = [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text' },
  { key: 'lineType', header: 'Type', fieldName: 'lineType', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Item', fieldName: 'description', sortable: false, renderType: 'custom', minWidth: 240, customRender: item => item.description || item.itemCode || '-' },
  { key: 'hsnCode', header: 'HSN Code', fieldName: 'hsnCode', sortable: false, renderType: 'text' },
  { key: 'gstRate', header: 'GST Rate', fieldName: 'gstRate', sortable: false, renderType: 'text' },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineDiscountPercentage', header: 'Line Discount %', fieldName: 'lineDiscountPercentage', sortable: false, renderType: 'text' },
  { key: 'lineAmount', header: 'Line Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'amountIncludingVAT', header: 'Amount Including VAT', fieldName: 'amountIncludingVAT', sortable: false, renderType: 'amount' }
];

const paymentColumns: readonly ITableColumn<IInvoicePaymentRecord>[] = [
  { key: 'paymentDate', header: 'Payment Date', fieldName: 'paymentDate', sortable: false, renderType: 'date' },
  { key: 'referenceNumber', header: 'Reference', fieldName: 'referenceNumber', sortable: false, renderType: 'text' },
  { key: 'paymentMode', header: 'Mode', fieldName: 'paymentMode', sortable: false, renderType: 'text' },
  { key: 'amount', header: 'Amount', fieldName: 'amount', sortable: false, renderType: 'amount' }
];

const invoiceHeaderFields: readonly IFormFieldConfig[] = [
  { key: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false, section: 'Invoice Header' },
  { key: 'invoiceDate', label: 'Invoice Date', type: 'date', required: false, section: 'Invoice Header' },
  { key: 'dueDate', label: 'Due Date', type: 'date', required: false, section: 'Invoice Header' },
  { key: 'invoiceStatus', label: 'Status', type: 'text', required: false, section: 'Invoice Header' },
  { key: 'paymentStatus', label: 'Payment Status', type: 'text', required: false, section: 'Invoice Header' }
];

const invoiceCustomerFields: readonly IFormFieldConfig[] = [
  { key: 'customerCode', label: 'Customer Code', type: 'text', required: false, section: 'Customer' },
  { key: 'customerName', label: 'Customer Name', type: 'text', required: false, section: 'Customer' },
  { key: 'customerAddress', label: 'Customer Address', type: 'text', required: false, section: 'Customer' },
  { key: 'customerGSTNo', label: 'Customer GST No.', type: 'text', required: false, section: 'Customer' },
  { key: 'clientCode', label: 'Client Code', type: 'text', required: false, section: 'Customer' },
  { key: 'clientName', label: 'Client Name', type: 'text', required: false, section: 'Customer' },
  { key: 'clientAddress', label: 'Client Address', type: 'text', required: false, section: 'Customer' },
  { key: 'clientGSTNo', label: 'Client GST No.', type: 'text', required: false, section: 'Customer' },
  { key: 'salesPerson', label: 'Salesperson', type: 'text', required: false, section: 'Customer' }
];

const invoiceReferenceFields: readonly IFormFieldConfig[] = [
  { key: 'salesOrderNumber', label: 'Sales Order Number', type: 'text', required: false, section: 'Sales Order Reference' }
];

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const InvoiceDetailPage: React.FC<IInvoiceDetailPageProps> = ({ currentUser, invoiceId, itemMasterService, invoiceService, salespersonService, onNavigate }) => {
  const [invoice, setInvoice] = React.useState<IInvoiceDetail | undefined>();
  const [salespersonDisplayName, setSalespersonDisplayName] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const handleBack = React.useCallback((): void => {
    onNavigate(invoicesModuleConfig.route);
  }, [onNavigate]);

  React.useEffect(() => {
    const loadInvoice = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        const detail = await invoiceService.getInvoiceById(invoiceId, currentUser);
        const [salespersons, itemMasters] = await Promise.all([
          salespersonService.getSalespersonLookup().catch(() => []),
          itemMasterService.getItemMasterLookup().catch(() => [])
        ]);

        setInvoice(enrichInvoiceItemDescriptions(detail, itemMasters));
        setSalespersonDisplayName(findSalespersonName(salespersons, detail.salesPerson) || detail.salesPerson || '');
      } catch (loadError) {
        setInvoice(undefined);
        setSalespersonDisplayName('');
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadInvoice().catch(() => undefined);
  }, [currentUser, invoiceId, itemMasterService, invoiceService, salespersonService]);

  const invoiceHeaderValues = React.useMemo<EntityFormValues>(
    () => ({
      invoiceNumber: invoice?.invoiceNumber || '',
      invoiceDate: invoice?.invoiceDate || '',
      dueDate: invoice?.dueDate || '',
      invoiceStatus: invoice?.invoiceStatus || '',
      paymentStatus: invoice?.paymentStatus || ''
    }),
    [invoice]
  );

  const invoiceCustomerValues = React.useMemo<EntityFormValues>(
    () => ({
      customerCode: invoice?.customerCode || '',
      customerName: invoice?.customerName || '',
      customerAddress: invoice?.customerAddress || '',
      customerGSTNo: invoice?.customerGSTNo || '',
      clientCode: invoice?.clientCode || '',
      clientName: invoice?.clientName || '',
      clientAddress: invoice?.clientAddress || '',
      clientGSTNo: invoice?.clientGSTNo || '',
      salesPerson: salespersonDisplayName || invoice?.salesPerson || ''
    }),
    [invoice, salespersonDisplayName]
  );

  const invoiceReferenceValues = React.useMemo<EntityFormValues>(
    () => ({
      salesOrderNumber: invoice?.salesOrderNumber || ''
    }),
    [invoice?.salesOrderNumber]
  );

  return (
    <EntityDetailPage
      title="Invoice Detail"
      description={invoice ? invoice.invoiceNumber : invoiceId ? `Invoice reference: ${invoiceId}` : undefined}
      backLabel="Back to Invoices"
      onBack={handleBack}
      loading={loading}
      error={error}
    >
      <ReadOnlyEntityForm fields={invoiceHeaderFields} values={invoiceHeaderValues} />
      <ReadOnlyEntityForm fields={invoiceCustomerFields} values={invoiceCustomerValues} />
      <ReadOnlyEntityForm fields={invoiceReferenceFields} values={invoiceReferenceValues} />
      <EntityDetailSection ariaLabel="Financial summary">
        <FinancialSummaryCards
          cards={[
            {
              key: 'netAmount',
              label: 'Net Amount',
              amount: invoice?.netAmount,
              currencyCode: invoice?.currencyCode,
              type: 'total'
            },
            {
              key: 'invoiceDiscountAmountExclVat',
              label: 'Invoice Discount Excl. VAT',
              amount: invoice?.invoiceDiscountAmountExclVat ?? invoice?.tradeDiscount,
              currencyCode: invoice?.currencyCode,
              type: 'outstanding'
            },
            {
              key: 'invoiceDiscountPercent',
              label: 'Invoice Discount %',
              value: invoice?.invoiceDiscountPercent !== undefined ? invoice.invoiceDiscountPercent : '-'
            },
            {
              key: 'sgst',
              label: 'SGST',
              amount: invoice?.sgst,
              currencyCode: invoice?.currencyCode,
              type: 'total'
            },
            {
              key: 'cgst',
              label: 'CGST',
              amount: invoice?.cgst,
              currencyCode: invoice?.currencyCode,
              type: 'total'
            },
            {
              key: 'igst',
              label: 'IGST',
              amount: invoice?.igst,
              currencyCode: invoice?.currencyCode,
              type: 'total'
            },
            {
              key: 'totalAmount',
              label: 'Total Amount',
              amount: invoice?.totalAmount,
              currencyCode: invoice?.currencyCode,
              type: 'total'
            },
            {
              key: 'paidAmount',
              label: 'Paid Amount',
              amount: invoice?.paidAmount,
              currencyCode: invoice?.currencyCode,
              type: 'paid'
            },
            {
              key: 'outstandingAmount',
              label: 'Outstanding Amount',
              amount: invoice?.outstandingAmount,
              currencyCode: invoice?.currencyCode,
              type: 'outstanding'
            }
          ]}
        />
      </EntityDetailSection>
      <EntityDetailSection>
        <RelatedRecordsSection<IInvoiceLineItem>
          title="Invoice Line Items"
          items={invoice?.lines || []}
          columns={lineColumns}
          emptyTitle="No invoice lines found"
          emptyMessage="No invoice line items are available for this invoice."
          getRowKey={(item, index) => item.lineNumber || String(index)}
        />
      </EntityDetailSection>
      {invoice && invoice.payments.length > 0 ? (
        <EntityDetailSection>
          <RelatedRecordsSection<IInvoicePaymentRecord>
            title="Payment Received Records"
            items={invoice.payments}
            columns={paymentColumns}
            emptyTitle="No payments found"
            emptyMessage="No payment received records are available for this invoice."
            getRowKey={(item, index) => item.id || item.referenceNumber || String(index)}
          />
        </EntityDetailSection>
      ) : null}
    </EntityDetailPage>
  );
};
