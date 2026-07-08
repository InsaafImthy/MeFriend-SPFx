import * as React from 'react';
import { invoicesModuleConfig } from '../../../config/modules/invoicesModuleConfig';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { ITableColumn } from '../../../models/common/ITableColumn';
import type {
  ISalesOrderDetail,
  ISalesOrderLineItem,
  ISalesOrderRelatedInvoice
} from '../../../models/salesOrders';
import { getUserFriendlyError, normalizeError } from '../../../services/api/apiErrorHandler';
import type { SalesOrderService } from '../../../services/salesOrders/salesOrderService';
import { DetailViewLayout, IDetailViewSection } from '../../common/detailView/DetailViewLayout';
import { FinancialSummaryCards } from '../../common/financialSummary/FinancialSummaryCards';
import { RelatedRecordsSection } from '../../common/relatedRecords/RelatedRecordsSection';

export interface ISalesOrderDetailPageProps {
  salesOrderId: string;
  salesOrderService: SalesOrderService;
  onNavigate: (path: string) => void;
}

const lineColumns: readonly ITableColumn<ISalesOrderLineItem>[] = [
  { key: 'itemCode', header: 'Item/Service Code', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'description', header: 'Description', fieldName: 'description', sortable: false, renderType: 'text', minWidth: 220 },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price/Rate', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineAmount', header: 'Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'taxAmount', header: 'Tax', fieldName: 'taxAmount', sortable: false, renderType: 'amount' },
  { key: 'lineStatus', header: 'Line Status', fieldName: 'lineStatus', sortable: false, renderType: 'status' }
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

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);

  if (normalizedError.status === 404 || normalizedError.status === 405 || normalizedError.status === 501) {
    return 'Sales order detail API is not configured yet.';
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
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    const loadSalesOrder = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);

      try {
        const detail = await salesOrderService.getSalesOrderById(salesOrderId);
        const invoices = await salesOrderService.getInvoicesForSalesOrder(salesOrderId);
        setSalesOrder(detail);
        setRelatedInvoices(invoices);
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

  const invoiceSummary = salesOrderService.getInvoiceSummaryFromRelatedInvoices(relatedInvoices);
  const currencyCode = salesOrder?.currencyCode || relatedInvoices[0]?.currencyCode;

  const sections: IDetailViewSection[] = [
    {
      title: 'Header',
      fields: [
        { key: 'salesOrderNumber', label: 'Sales Order Number', value: salesOrder?.salesOrderNumber },
        { key: 'customerCode', label: 'Customer Code', value: salesOrder?.customerCode },
        { key: 'customerName', label: 'Customer Name', value: salesOrder?.customerName },
        { key: 'salespersonCode', label: 'Salesperson Code', value: salesOrder?.salespersonCode },
        { key: 'salespersonName', label: 'Salesperson Name', value: salesOrder?.salespersonName },
        { key: 'eventCode', label: 'Event Code', value: salesOrder?.eventCode },
        { key: 'eventName', label: 'Event Name', value: salesOrder?.eventName },
        { key: 'orderDate', label: 'Order Date', value: salesOrder?.orderDate, renderType: 'date' },
        { key: 'status', label: 'Status', value: salesOrder?.status, renderType: 'status' },
        { key: 'totalAmount', label: 'Total Amount', value: salesOrder?.totalAmount, renderType: 'amount' },
        { key: 'currencyCode', label: 'Currency Code', value: salesOrder?.currencyCode }
      ]
    },
    {
      title: 'Line Items',
      customContent: (
        <RelatedRecordsSection<ISalesOrderLineItem>
          title="Sales Order Line Items"
          items={salesOrder?.lines || []}
          columns={lineColumns}
          emptyTitle="No line items found"
          emptyMessage="No line items are available for this sales order."
          getRowKey={(item, index) => item.lineNumber || item.itemCode || String(index)}
        />
      )
    },
    {
      title: 'Invoice Summary',
      customContent: (
        <FinancialSummaryCards
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
      )
    },
    {
      title: 'Related Invoices',
      customContent: (
        <RelatedRecordsSection<ISalesOrderRelatedInvoice>
          title="Related Invoices"
          items={relatedInvoices}
          columns={invoiceColumns}
          emptyTitle="No invoices found for this sales order."
          emptyMessage="No invoices found for this sales order."
          onRowClick={invoice => onNavigate(`${invoicesModuleConfig.route}/detail/${encodeURIComponent(invoice.id || invoice.invoiceNumber)}`)}
          getRowKey={(item, index) => item.id || item.invoiceNumber || String(index)}
        />
      )
    }
  ];

  return (
    <DetailViewLayout
      title="Sales Order Detail"
      subtitle={salesOrder ? salesOrder.salesOrderNumber : salesOrderId ? `Sales order reference: ${salesOrderId}` : undefined}
      backLabel="Back to Sales Orders"
      onBack={() => onNavigate(salesOrdersModuleConfig.route)}
      loading={loading}
      error={error}
      sections={sections}
    />
  );
};
