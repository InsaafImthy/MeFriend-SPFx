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
  { key: 'unitOfMeasureCode', header: 'UOM', fieldName: 'unitOfMeasureCode', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Unit Price/Rate', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineAmount', header: 'Amount', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'amountIncludingVAT', header: 'Amount Including VAT', fieldName: 'amountIncludingVAT', sortable: false, renderType: 'amount' },
  { key: 'outstandingQuantity', header: 'Outstanding Qty.', fieldName: 'outstandingQuantity', sortable: false, renderType: 'text' },
  { key: 'outstandingAmountLCY', header: 'Outstanding Amount LCY', fieldName: 'outstandingAmountLCY', sortable: false, renderType: 'amount' },
  { key: 'quantityShipped', header: 'Qty. Shipped', fieldName: 'quantityShipped', sortable: false, renderType: 'text' },
  { key: 'quantityInvoiced', header: 'Qty. Invoiced', fieldName: 'quantityInvoiced', sortable: false, renderType: 'text' },
  { key: 'shipmentDate', header: 'Shipment Date', fieldName: 'shipmentDate', sortable: false, renderType: 'date' }
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
  { key: 'documentType', label: 'Document Type', type: 'text', required: false, section: 'Order Header' },
  { key: 'status', label: 'Status', type: 'text', required: false, section: 'Order Header' },
  { key: 'orderDate', label: 'Order Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'documentDate', label: 'Document Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'postingDate', label: 'Posting Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'dueDate', label: 'Due Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'shipmentDate', label: 'Shipment Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'requestedDeliveryDate', label: 'Requested Delivery Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'promisedDeliveryDate', label: 'Promised Delivery Date', type: 'date', required: false, section: 'Order Header' },
  { key: 'customerCode', label: 'Customer Code', type: 'text', required: false, section: 'Customer' },
  { key: 'customerName', label: 'Customer Name', type: 'text', required: false, section: 'Customer' },
  { key: 'customerName2', label: 'Customer Name 2', type: 'text', required: false, section: 'Customer' },
  { key: 'clientCode', label: 'Client Code', type: 'text', required: false, section: 'Customer' },
  { key: 'clientName', label: 'Client Name', type: 'text', required: false, section: 'Customer' },
  { key: 'amount', label: 'Amount', type: 'amount', required: false, section: 'Amounts' },
  { key: 'amountIncludingVAT', label: 'Amount Including VAT', type: 'amount', required: false, section: 'Amounts' },
  { key: 'amountLCY', label: 'Amount LCY', type: 'amount', required: false, section: 'Amounts' },
  { key: 'amountIncludingVATLCY', label: 'Amount Including VAT LCY', type: 'amount', required: false, section: 'Amounts' },
  { key: 'outstandingAmountLCY', label: 'Outstanding Amount LCY', type: 'amount', required: false, section: 'Amounts' },
  { key: 'currencyCode', label: 'Currency Code', type: 'text', required: false, section: 'Amounts' },
  { key: 'pricesIncludingVAT', label: 'Prices Including VAT', type: 'text', required: false, section: 'Amounts' },
  { key: 'outstandingQuantity', label: 'Outstanding Quantity', type: 'number', required: false, section: 'Fulfillment' },
  { key: 'quantityToShip', label: 'Quantity to Ship', type: 'number', required: false, section: 'Fulfillment' },
  { key: 'quantityShipped', label: 'Quantity Shipped', type: 'number', required: false, section: 'Fulfillment' },
  { key: 'quantityToInvoice', label: 'Quantity to Invoice', type: 'number', required: false, section: 'Fulfillment' },
  { key: 'quantityInvoiced', label: 'Quantity Invoiced', type: 'number', required: false, section: 'Fulfillment' },
  { key: 'shippingAdvice', label: 'Shipping Advice', type: 'text', required: false, section: 'Fulfillment' },
  { key: 'completelyShipped', label: 'Completely Shipped', type: 'text', required: false, section: 'Fulfillment' },
  { key: 'salespersonCode', label: 'Salesperson Code', type: 'text', required: false, section: 'References' },
  { key: 'salespersonName', label: 'Salesperson Name', type: 'text', required: false, section: 'References' },
  { key: 'eventCode', label: 'Event Code', type: 'text', required: false, section: 'References' },
  { key: 'eventName', label: 'Event Name', type: 'text', required: false, section: 'References' },
  { key: 'externalDocumentNumber', label: 'External Document No.', type: 'text', required: false, section: 'References' },
  { key: 'yourReference', label: 'Your Reference', type: 'text', required: false, section: 'References' },
  { key: 'postingDescription', label: 'Posting Description', type: 'text', required: false, section: 'References' },
  { key: 'responsibilityCenter', label: 'Responsibility Center', type: 'text', required: false, section: 'References' },
  { key: 'assignedUserID', label: 'Assigned User ID', type: 'text', required: false, section: 'References' },
  { key: 'shortcutDimension1Code', label: 'Shortcut Dimension 1', type: 'text', required: false, section: 'References' },
  { key: 'shortcutDimension2Code', label: 'Shortcut Dimension 2', type: 'text', required: false, section: 'References' },
  { key: 'locationCode', label: 'Location Code', type: 'text', required: false, section: 'References' },
  { key: 'paymentTermsCode', label: 'Payment Terms Code', type: 'text', required: false, section: 'Payment' },
  { key: 'paymentMethodCode', label: 'Payment Method Code', type: 'text', required: false, section: 'Payment' },
  { key: 'paymentDiscountPercent', label: 'Payment Discount %', type: 'number', required: false, section: 'Payment' },
  { key: 'prepaymentPercent', label: 'Prepayment %', type: 'number', required: false, section: 'Payment' },
  { key: 'sellToAddress', label: 'Sell-to Address', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToAddress2', label: 'Sell-to Address 2', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToCity', label: 'Sell-to City', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToCounty', label: 'Sell-to County', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToPostCode', label: 'Sell-to Post Code', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToCountryRegionCode', label: 'Sell-to Country/Region', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToPhoneNo', label: 'Sell-to Phone No.', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToEmail', label: 'Sell-to Email', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'sellToContact', label: 'Sell-to Contact', type: 'text', required: false, section: 'Sell-to Details' },
  { key: 'shipToName', label: 'Ship-to Name', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToAddress', label: 'Ship-to Address', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToAddress2', label: 'Ship-to Address 2', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToCity', label: 'Ship-to City', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToCounty', label: 'Ship-to County', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToPostCode', label: 'Ship-to Post Code', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToCountryRegionCode', label: 'Ship-to Country/Region', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'shipToContact', label: 'Ship-to Contact', type: 'text', required: false, section: 'Ship-to Details' },
  { key: 'billToName', label: 'Bill-to Name', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToAddress', label: 'Bill-to Address', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToAddress2', label: 'Bill-to Address 2', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToCity', label: 'Bill-to City', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToCounty', label: 'Bill-to County', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToPostCode', label: 'Bill-to Post Code', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToCountryRegionCode', label: 'Bill-to Country/Region', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToContactNo', label: 'Bill-to Contact No.', type: 'text', required: false, section: 'Bill-to Details' },
  { key: 'billToContact', label: 'Bill-to Contact', type: 'text', required: false, section: 'Bill-to Details' }
];

const yesNo = (value: boolean | undefined): string => {
  if (value === undefined) {
    return '';
  }

  return value ? 'Yes' : 'No';
};

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
      documentType: salesOrder?.documentType || '',
      documentDate: salesOrder?.documentDate || '',
      postingDescription: salesOrder?.postingDescription || '',
      status: salesOrder?.status || '',
      orderDate: salesOrder?.orderDate || '',
      postingDate: salesOrder?.postingDate || '',
      dueDate: salesOrder?.dueDate || '',
      shipmentDate: salesOrder?.shipmentDate || '',
      requestedDeliveryDate: salesOrder?.requestedDeliveryDate || '',
      promisedDeliveryDate: salesOrder?.promisedDeliveryDate || '',
      customerCode: salesOrder?.customerCode || '',
      customerName: salesOrder?.customerName || '',
      customerName2: salesOrder?.customerName2 || '',
      clientCode: salesOrder?.clientCode || '',
      clientName: salesOrder?.clientName || '',
      amount: salesOrder?.totalAmount !== undefined ? String(salesOrder.totalAmount) : '',
      amountIncludingVAT: salesOrder?.amountIncludingVAT !== undefined ? String(salesOrder.amountIncludingVAT) : '',
      amountLCY: salesOrder?.amountLCY !== undefined ? String(salesOrder.amountLCY) : '',
      amountIncludingVATLCY: salesOrder?.amountIncludingVATLCY !== undefined ? String(salesOrder.amountIncludingVATLCY) : '',
      outstandingAmountLCY: salesOrder?.outstandingAmountLCY !== undefined ? String(salesOrder.outstandingAmountLCY) : '',
      currencyCode: salesOrder?.currencyCode || '',
      pricesIncludingVAT: yesNo(salesOrder?.pricesIncludingVAT),
      outstandingQuantity: salesOrder?.outstandingQuantity !== undefined ? salesOrder.outstandingQuantity : undefined,
      quantityToShip: salesOrder?.quantityToShip !== undefined ? salesOrder.quantityToShip : undefined,
      quantityShipped: salesOrder?.quantityShipped !== undefined ? salesOrder.quantityShipped : undefined,
      quantityToInvoice: salesOrder?.quantityToInvoice !== undefined ? salesOrder.quantityToInvoice : undefined,
      quantityInvoiced: salesOrder?.quantityInvoiced !== undefined ? salesOrder.quantityInvoiced : undefined,
      shippingAdvice: salesOrder?.shippingAdvice || '',
      completelyShipped: yesNo(salesOrder?.completelyShipped),
      salespersonCode: salesOrder?.salespersonCode || '',
      salespersonName: salesOrder?.salespersonName || '',
      eventCode: salesOrder?.eventCode || '',
      eventName: salesOrder?.eventName || '',
      externalDocumentNumber: salesOrder?.externalDocumentNumber || '',
      yourReference: salesOrder?.yourReference || '',
      responsibilityCenter: salesOrder?.responsibilityCenter || '',
      assignedUserID: salesOrder?.assignedUserID || '',
      shortcutDimension1Code: salesOrder?.shortcutDimension1Code || '',
      shortcutDimension2Code: salesOrder?.shortcutDimension2Code || '',
      locationCode: salesOrder?.locationCode || '',
      paymentTermsCode: salesOrder?.paymentTermsCode || '',
      paymentMethodCode: salesOrder?.paymentMethodCode || '',
      paymentDiscountPercent: salesOrder?.paymentDiscountPercent !== undefined ? salesOrder.paymentDiscountPercent : undefined,
      prepaymentPercent: salesOrder?.prepaymentPercent !== undefined ? salesOrder.prepaymentPercent : undefined,
      sellToAddress: salesOrder?.sellToAddress || '',
      sellToAddress2: salesOrder?.sellToAddress2 || '',
      sellToCity: salesOrder?.sellToCity || '',
      sellToCounty: salesOrder?.sellToCounty || '',
      sellToPostCode: salesOrder?.sellToPostCode || '',
      sellToCountryRegionCode: salesOrder?.sellToCountryRegionCode || '',
      sellToPhoneNo: salesOrder?.sellToPhoneNo || '',
      sellToEmail: salesOrder?.sellToEmail || '',
      sellToContact: salesOrder?.sellToContact || '',
      shipToName: salesOrder?.shipToName || '',
      shipToAddress: salesOrder?.shipToAddress || '',
      shipToAddress2: salesOrder?.shipToAddress2 || '',
      shipToCity: salesOrder?.shipToCity || '',
      shipToCounty: salesOrder?.shipToCounty || '',
      shipToPostCode: salesOrder?.shipToPostCode || '',
      shipToCountryRegionCode: salesOrder?.shipToCountryRegionCode || '',
      shipToContact: salesOrder?.shipToContact || '',
      billToName: salesOrder?.billToName || '',
      billToAddress: salesOrder?.billToAddress || '',
      billToAddress2: salesOrder?.billToAddress2 || '',
      billToCity: salesOrder?.billToCity || '',
      billToCounty: salesOrder?.billToCounty || '',
      billToPostCode: salesOrder?.billToPostCode || '',
      billToCountryRegionCode: salesOrder?.billToCountryRegionCode || '',
      billToContactNo: salesOrder?.billToContactNo || '',
      billToContact: salesOrder?.billToContact || ''
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
      <EntityDetailSection ariaLabel="Sales order summary">
        <FinancialSummaryCards
          accented={false}
          cards={[
            {
              key: 'orderAmount',
              label: 'Order Amount',
              amount: salesOrder?.totalAmount,
              currencyCode,
              type: 'total'
            },
            {
              key: 'orderAmountIncludingVat',
              label: 'Amount Including VAT',
              amount: salesOrder?.amountIncludingVAT,
              currencyCode,
              type: 'total'
            },
            {
              key: 'outstandingAmountLCY',
              label: 'Outstanding Amount LCY',
              amount: salesOrder?.outstandingAmountLCY,
              currencyCode,
              type: 'outstanding'
            },
            {
              key: 'outstandingQuantity',
              label: 'Outstanding Quantity',
              value: salesOrder?.outstandingQuantity !== undefined ? salesOrder.outstandingQuantity : '-'
            },
            {
              key: 'quantityInvoiced',
              label: 'Quantity Invoiced',
              value: salesOrder?.quantityInvoiced !== undefined ? salesOrder.quantityInvoiced : '-'
            }
          ]}
        />
      </EntityDetailSection>
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
