import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import type { IFormFieldConfig } from '../../../../../shared/models/IFormFieldConfig';
import type { ITableColumn } from '../../../../../shared/models/ITableColumn';
import type { IInvoiceDetail, IInvoiceLineItem } from '../../../models/invoices';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import type { EntityFormValues } from '../../../../../shared/utilities/validationUtils';
import { EntityDetailPage, EntityDetailSection } from '../../../../../shared/components/detailPage/EntityDetailPage';
import { FinancialSummaryCards } from '../../../../../shared/components/financialSummary/FinancialSummaryCards';
import { ReadOnlyEntityForm } from '../../../../../shared/components/forms/ReadOnlyEntityForm';
import { RelatedRecordsSection } from '../../../../../shared/components/relatedRecords/RelatedRecordsSection';

export interface IInvoiceDetailPageProps {
  currentUser?: IAppUser;
  invoiceNumber: string;
  invoiceService: InvoiceService;
  onNavigate: (path: string) => void;
}

const lineColumns: readonly ITableColumn<IInvoiceLineItem>[] = [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text' },
  { key: 'itemCode', header: 'Item Code', fieldName: 'itemCode', sortable: false, renderType: 'text', minWidth: 160 },
  { key: 'hsnCode', header: 'HSN Code', fieldName: 'hsnCode', sortable: false, renderType: 'text' },
  { key: 'gstRate', header: 'GST Rate', fieldName: 'gstRate', sortable: false, renderType: 'text' },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineAmount', header: 'Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' }
];

const invoiceHeaderFields: readonly IFormFieldConfig[] = [
  { key: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: false, section: 'Invoice Header' },
  { key: 'invoiceDate', label: 'Invoice Date', type: 'date', required: false, section: 'Invoice Header' }
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
  { key: 'salespersonCode', label: 'Salesperson', type: 'text', required: false, section: 'Customer' }
];

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const InvoiceDetailPage: React.FC<IInvoiceDetailPageProps> = ({ currentUser, invoiceNumber, invoiceService, onNavigate }) => {
  const [invoice, setInvoice] = React.useState<IInvoiceDetail | undefined>();
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
        const detail = await invoiceService.getInvoiceByNumber(invoiceNumber, currentUser);
        setInvoice(detail);
      } catch (loadError) {
        setInvoice(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadInvoice().catch(() => undefined);
  }, [currentUser, invoiceNumber, invoiceService]);

  const invoiceHeaderValues = React.useMemo<EntityFormValues>(
    () => ({
      invoiceNumber: invoice?.invoiceNumber || '',
      invoiceDate: invoice?.invoiceDate || ''
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
      salespersonCode: invoice?.salespersonCode || ''
    }),
    [invoice]
  );

  return (
    <EntityDetailPage
      title="Invoice Detail"
      description={invoice ? invoice.invoiceNumber : invoiceNumber ? `Invoice reference: ${invoiceNumber}` : undefined}
      backLabel="Back to Invoices"
      onBack={handleBack}
      loading={loading}
      error={error}
    >
      <ReadOnlyEntityForm fields={invoiceHeaderFields} values={invoiceHeaderValues} />
      <ReadOnlyEntityForm fields={invoiceCustomerFields} values={invoiceCustomerValues} />
      <EntityDetailSection ariaLabel="Financial summary">
        <FinancialSummaryCards
          cards={[
            {
              key: 'netAmount',
              label: 'Net Amount',
              amount: invoice?.netAmount,
              type: 'total'
            },
            {
              key: 'tradeDiscount',
              label: 'Trade Discount',
              amount: invoice?.tradeDiscount,
              type: 'outstanding'
            },
            {
              key: 'sgst',
              label: 'SGST',
              amount: invoice?.sgst,
              type: 'total'
            },
            {
              key: 'cgst',
              label: 'CGST',
              amount: invoice?.cgst,
              type: 'total'
            },
            {
              key: 'igst',
              label: 'IGST',
              amount: invoice?.igst,
              type: 'total'
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
    </EntityDetailPage>
  );
};
