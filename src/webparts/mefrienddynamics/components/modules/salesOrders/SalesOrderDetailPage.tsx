import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type {
  ISalesOrderDetail,
  ISalesOrderLineItem,
  ISalesOrderRelatedInvoice
} from '../../../models/salesOrders';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { SalesOrderService } from '../../../services/salesOrders/salesOrderService';
import type { EntityFormValues } from '../../../utils/validationUtils';
import { EntityDetailPage, EntityDetailSection } from '../../common/detailPage/EntityDetailPage';
import { FinancialSummaryCards } from '../../common/financialSummary/FinancialSummaryCards';
import { ReadOnlyEntityForm } from '../../common/forms/ReadOnlyEntityForm';
import { RelatedRecordsSection } from '../../common/relatedRecords/RelatedRecordsSection';

export interface ISalesOrderDetailPageProps {
  salesOrderId: string;
  salesOrderService: SalesOrderService;
  onNavigate: (path: string) => void;
}

const lineColumns: readonly ITableColumn<ISalesOrderLineItem>[] = [
  { key: 'lineNumber', header: 'Line No.', fieldName: 'lineNumber', sortable: false, renderType: 'text' },
  { key: 'lineType', header: 'Type', fieldName: 'lineType', sortable: false, renderType: 'text' },
  { key: 'itemCode', header: 'Item/Service Code', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Description', fieldName: 'description', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price/Rate', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineAmount', header: 'Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'amountIncludingVAT', header: 'Amount Including VAT', fieldName: 'amountIncludingVAT', sortable: false, renderType: 'amount' }
];

const invoiceColumns: readonly ITableColumn<ISalesOrderRelatedInvoice>[] = [
  { key: 'invoiceNumber', header: 'Invoice Number', fieldName: 'invoiceNumber', sortable: false, renderType: 'text' },
  { key: 'invoiceDate', header: 'Invoice Date', fieldName: 'invoiceDate', sortable: false, renderType: 'date' },
  { key: 'totalAmount', header: 'Total Amount', fieldName: 'totalAmount', sortable: false, renderType: 'amount' },
  { key: 'paidAmount', header: 'Paid Amount', fieldName: 'paidAmount', sortable: false, renderType: 'amount' },
  { key: 'outstandingAmount', header: 'Outstanding Amount', fieldName: 'outstandingAmount', sortable: false, renderType: 'amount' },
  { key: 'paymentStatus', header: 'Payment Status', fieldName: 'paymentStatus', sortable: false, renderType: 'status' },
  { key: 'invoiceStatus', header: 'Invoice Status', fieldName: 'invoiceStatus', sortable: false, renderType: 'status' }
];

const salesOrderDetailFields: readonly IFormFieldConfig[] = [
  { key: 'salesOrderNumber', label: 'Sales Order Number', type: 'text', required: false, section: 'Order Header' },
  { key: 'status', label: 'Status', type: 'text', required: false, section: 'Order Header' },
  { key: 'orderDate', label: 'Order Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'postingDate', label: 'Posting Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'customerCode', label: 'Customer Code', type: 'text', required: false, section: 'Customer' },
  { key: 'customerName', label: 'Customer Name', type: 'text', required: false, section: 'Customer' },
  { key: 'clientCode', label: 'Client Code', type: 'text', required: false, section: 'Customer' },
  { key: 'clientName', label: 'Client Name', type: 'text', required: false, section: 'Customer' },
  { key: 'amount', label: 'Amount', type: 'amount', required: false, section: 'Amounts' },
  { key: 'amountIncludingVAT', label: 'Amount Including VAT', type: 'amount', required: false, section: 'Amounts' },
  { key: 'currencyCode', label: 'Currency Code', type: 'text', required: false, section: 'Amounts' },
  { key: 'salespersonCode', label: 'Salesperson Code', type: 'text', required: false, section: 'References' },
  { key: 'salespersonName', label: 'Salesperson Name', type: 'text', required: false, section: 'References' },
  { key: 'eventCode', label: 'Event Code', type: 'text', required: false, section: 'References' },
  { key: 'eventName', label: 'Event Name', type: 'text', required: false, section: 'References' }
];

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Sales order detail API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

const getRelatedInvoicesErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Related invoices API is not configured yet.';
  }

  return getUserFriendlyError(normalizedError);
};

export const SalesOrderDetailPage: React.FC<ISalesOrderDetailPageProps> = ({
  salesOrderId,
  salesOrderService,
  onNavigate
}) => {
  const [salesOrder, setSalesOrder] = React.useState<ISalesOrderDetail | undefined>();
  const [relatedInvoices, setRelatedInvoices] = React.useState<readonly ISalesOrderRelatedInvoice[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [relatedInvoicesLoading, setRelatedInvoicesLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | undefined>();
  const [relatedInvoicesError, setRelatedInvoicesError] = React.useState<string | undefined>();
  const handleBack = React.useCallback((): void => {
    onNavigate(salesOrdersModuleConfig.route);
  }, [onNavigate]);

  React.useEffect(() => {
    const loadSalesOrder = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        const detail = await salesOrderService.getSalesOrderById(salesOrderId);
        setSalesOrder(detail);
        setRelatedInvoices(detail.relatedInvoices || []);
      } catch (loadError) {
        setSalesOrder(undefined);
        setRelatedInvoices([]);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadSalesOrder().catch(() => undefined);
  }, [salesOrderId, salesOrderService]);

  React.useEffect(() => {
    if (!salesOrder || !salesOrderId) {
      return;
    }

    const loadRelatedInvoices = async (): Promise<void> => {
      setRelatedInvoicesLoading(true);
      setRelatedInvoicesError(undefined);

      try {
        const invoices = await salesOrderService.getInvoicesForSalesOrder(salesOrderId);
        setRelatedInvoices(invoices);
      } catch (loadError) {
        setRelatedInvoicesError(getRelatedInvoicesErrorMessage(loadError));
      } finally {
        setRelatedInvoicesLoading(false);
      }
    };

    loadRelatedInvoices().catch(() => undefined);
  }, [salesOrder, salesOrderId, salesOrderService]);

  const invoiceSummary = salesOrderService.getInvoiceSummaryFromRelatedInvoices(relatedInvoices);
  const currencyCode = salesOrder?.currencyCode || relatedInvoices[0]?.currencyCode;

  const formValues = React.useMemo<EntityFormValues>(
    () => ({
      salesOrderNumber: salesOrder?.salesOrderNumber || '',
      status: salesOrder?.status || '',
      orderDate: salesOrder?.orderDate || '',
      postingDate: salesOrder?.postingDate || '',
      customerCode: salesOrder?.customerCode || '',
      customerName: salesOrder?.customerName || '',
      clientCode: salesOrder?.clientCode || '',
      clientName: salesOrder?.clientName || '',
      amount: salesOrder?.totalAmount !== undefined ? String(salesOrder.totalAmount) : '',
      amountIncludingVAT: salesOrder?.amountIncludingVAT !== undefined ? String(salesOrder.amountIncludingVAT) : '',
      currencyCode: salesOrder?.currencyCode || '',
      salespersonCode: salesOrder?.salespersonCode || '',
      salespersonName: salesOrder?.salespersonName || '',
      eventCode: salesOrder?.eventCode || '',
      eventName: salesOrder?.eventName || ''
    }),
    [salesOrder]
  );

  return (
    <EntityDetailPage
      title="Sales Order Detail"
      description={
        salesOrder
          ? salesOrder.salesOrderNumber || salesOrder.customerName || salesOrder.customerCode
          : salesOrderId
            ? `Sales order reference: ${salesOrderId}`
            : undefined
      }
      backLabel="Back to Sales Orders"
      onBack={handleBack}
      loading={loading}
      error={error}
    >
      <ReadOnlyEntityForm
        fields={salesOrderDetailFields}
        values={formValues}
      />
      <EntityDetailSection>
        <RelatedRecordsSection<ISalesOrderLineItem>
          title="Sales Order Line Items"
          items={salesOrder?.lines || []}
          columns={lineColumns}
          emptyTitle="No line items found"
          emptyMessage="No line items are available for this sales order."
          getRowKey={(item, index) => item.lineNumber || item.itemCode || String(index)}
        />
      </EntityDetailSection>
      <EntityDetailSection ariaLabel="Invoice summary">
        <FinancialSummaryCards
          accented={false}
          cards={[
            { key: 'invoiceCount', label: 'Invoice Count', value: invoiceSummary.invoiceCount },
            { key: 'outstandingInvoiceCount', label: 'Outstanding Invoice Count', value: invoiceSummary.outstandingInvoiceCount },
            {
              key: 'totalInvoicedAmount',
              label: 'Total Invoiced Amount',
              amount: invoiceSummary.totalInvoicedAmount,
              currencyCode,
              type: 'total'
            },
            {
              key: 'totalPaidAmount',
              label: 'Total Paid Amount',
              amount: invoiceSummary.totalPaidAmount,
              currencyCode,
              type: 'paid'
            },
            {
              key: 'totalOutstandingAmount',
              label: 'Total Outstanding Amount',
              amount: invoiceSummary.totalOutstandingAmount,
              currencyCode,
              type: 'outstanding'
            }
          ]}
        />
      </EntityDetailSection>
      <EntityDetailSection>
        <RelatedRecordsSection<ISalesOrderRelatedInvoice>
          title="Related Invoices"
          items={relatedInvoices}
          columns={invoiceColumns}
          loading={relatedInvoicesLoading}
          error={relatedInvoicesError}
          emptyTitle="No invoices found for this sales order."
          emptyMessage="No invoices found for this sales order."
          onRowClick={invoice => onNavigate(`${invoicesModuleConfig.route}/detail/${encodeURIComponent(invoice.id || invoice.invoiceNumber)}`)}
          getRowKey={(item, index) => item.id || item.invoiceNumber || String(index)}
        />
      </EntityDetailSection>
    </EntityDetailPage>
  );
};
