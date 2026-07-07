import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type { IInvoiceDetail, IInvoiceLineItem, IInvoicePaymentRecord } from '../../../models/invoices';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { InvoiceService } from '../../../services/invoices/invoiceService';
import { Button } from '../../common/buttons/Button';
import { DetailViewLayout, IDetailViewSection } from '../../common/detailView/DetailViewLayout';
import { FinancialSummaryCards } from '../../common/financialSummary/FinancialSummaryCards';
import { RelatedRecordsSection } from '../../common/relatedRecords/RelatedRecordsSection';

export interface IInvoiceDetailPageProps {
  invoiceId: string;
  invoiceService: InvoiceService;
  onNavigate: (path: string) => void;
}

const lineColumns: readonly ITableColumn<IInvoiceLineItem>[] = [
  { key: 'lineNumber', header: 'Line', fieldName: 'lineNumber', sortable: false, renderType: 'text' },
  { key: 'itemCode', header: 'Item', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Description', fieldName: 'description', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineAmount', header: 'Line Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' }
];

const paymentColumns: readonly ITableColumn<IInvoicePaymentRecord>[] = [
  { key: 'paymentDate', header: 'Payment Date', fieldName: 'paymentDate', sortable: false, renderType: 'date' },
  { key: 'referenceNumber', header: 'Reference', fieldName: 'referenceNumber', sortable: false, renderType: 'text' },
  { key: 'paymentMode', header: 'Mode', fieldName: 'paymentMode', sortable: false, renderType: 'text' },
  { key: 'amount', header: 'Amount', fieldName: 'amount', sortable: false, renderType: 'amount' }
];

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Invoice detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const InvoiceDetailPage: React.FC<IInvoiceDetailPageProps> = ({ invoiceId, invoiceService, onNavigate }) => {
  const [invoice, setInvoice] = React.useState<IInvoiceDetail | undefined>();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    const loadInvoice = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        setInvoice(await invoiceService.getInvoiceById(invoiceId));
      } catch (loadError) {
        setInvoice(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadInvoice().catch(() => undefined);
  }, [invoiceId, invoiceService]);

  const salesOrderReference = invoice?.salesOrderNumber || '';
  const sections: IDetailViewSection[] = [
    {
      title: 'Invoice Header',
      fields: [
        { key: 'invoiceNumber', label: 'Invoice Number', value: invoice?.invoiceNumber },
        { key: 'invoiceDate', label: 'Invoice Date', value: invoice?.invoiceDate, renderType: 'date' },
        { key: 'dueDate', label: 'Due Date', value: invoice?.dueDate, renderType: 'date' },
        { key: 'invoiceStatus', label: 'Status', value: invoice?.invoiceStatus, renderType: 'status' },
        { key: 'paymentStatus', label: 'Payment Status', value: invoice?.paymentStatus, renderType: 'status' }
      ]
    },
    {
      title: 'Customer',
      fields: [
        { key: 'customerCode', label: 'Customer Code', value: invoice?.customerCode },
        { key: 'customerName', label: 'Customer Name', value: invoice?.customerName }
      ]
    },
    {
      title: 'Sales Order Reference',
      fields: [
        {
          key: 'salesOrderNumber',
          label: 'Sales Order Number',
          value: salesOrderReference ? (
            <Button
              label={salesOrderReference}
              variant="ghost"
              size="small"
              onClick={() => onNavigate(`${salesOrdersModuleConfig.route}/detail/${encodeURIComponent(salesOrderReference)}`)}
            />
          ) : undefined,
          renderType: 'custom'
        }
      ]
    },
    {
      title: 'Financial Summary',
      customContent: (
        <FinancialSummaryCards
          cards={[
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
      )
    },
    {
      title: 'Lines',
      customContent: (
        <RelatedRecordsSection<IInvoiceLineItem>
          title="Invoice Line Items"
          items={invoice?.lines || []}
          columns={lineColumns}
          emptyTitle="No invoice lines found"
          emptyMessage="No invoice line items are available for this invoice."
          getRowKey={(item, index) => item.lineNumber || String(index)}
        />
      )
    }
  ];

  if (invoice && invoice.payments.length > 0) {
    sections.push({
      title: 'Payments',
      customContent: (
        <RelatedRecordsSection<IInvoicePaymentRecord>
          title="Payment Received Records"
          items={invoice.payments}
          columns={paymentColumns}
          emptyTitle="No payments found"
          emptyMessage="No payment received records are available for this invoice."
          getRowKey={(item, index) => item.id || item.referenceNumber || String(index)}
        />
      )
    });
  }

  return (
    <DetailViewLayout
      title="Invoice Detail"
      subtitle={invoice ? invoice.invoiceNumber : invoiceId ? `Invoice reference: ${invoiceId}` : undefined}
      backLabel="Back to Invoices"
      onBack={() => onNavigate(invoicesModuleConfig.route)}
      loading={loading}
      error={error}
      sections={sections}
    />
  );
};
