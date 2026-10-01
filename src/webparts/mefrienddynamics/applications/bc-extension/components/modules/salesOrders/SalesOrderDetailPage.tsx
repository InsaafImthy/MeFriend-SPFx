import * as React from 'react';
import { salesOrdersModuleConfig } from '../../../config/modules/salesOrdersModuleConfig';
import type { IFormFieldConfig } from '../../../../../shared/models/IFormFieldConfig';
import type { ITableColumn } from '../../../../../shared/models/ITableColumn';
import type { ISalesOrderDetail, ISalesOrderLineItem } from '../../../models/salesOrders';
import type { IAppUser } from '../../../models/settings/IAppAccessModels';
import { getUserFriendlyError, normalizeError } from '../../../../../shared/api/apiErrorHandler';
import type { SalesOrderService } from '../../../services/salesOrders/salesOrderService';
import type { EntityFormValues } from '../../../../../shared/utilities/validationUtils';
import { EntityDetailPage, EntityDetailSection } from '../../../../../shared/components/detailPage/EntityDetailPage';
import { ReadOnlyEntityForm } from '../../../../../shared/components/forms/ReadOnlyEntityForm';
import { RelatedRecordsSection } from '../../../../../shared/components/relatedRecords/RelatedRecordsSection';

export interface ISalesOrderDetailPageProps {
  salesOrderId: string;
  currentUser?: IAppUser;
  salesOrderService: SalesOrderService;
  onNavigate: (path: string) => void;
}

const headerFields: readonly IFormFieldConfig[] = [
  { key: 'salesOrderNumber', label: 'Sales Order Number', type: 'text', required: false, section: 'Order' },
  { key: 'postingDate', label: 'Posting Date', type: 'date', required: false, section: 'Order' },
  { key: 'customerCode', label: 'Sell-to Customer No.', type: 'text', required: false, section: 'Order' },
  { key: 'clientCode', label: 'Bill-to Customer No.', type: 'text', required: false, section: 'Order' },
  { key: 'externalDocumentNumber', label: 'RO No.', type: 'text', required: false, section: 'Order' },
  { key: 'orderDate', label: 'RO Date', type: 'date', required: false, section: 'Order' },
  { key: 'salespersonCode', label: 'Salesperson', type: 'text', required: false, section: 'Order' },
  { key: 'locationCode', label: 'Location Code', type: 'text', required: false, section: 'Order' },
  { key: 'status', label: 'Status', type: 'text', required: false, section: 'Order' },
  { key: 'invoiceDiscountAmountExclVat', label: 'Invoice Discount Excl. VAT', type: 'amount', required: false, section: 'Order' },
  { key: 'invoiceDiscountPercent', label: 'Invoice Discount %', type: 'number', required: false, section: 'Order' },
  { key: 'createdDateTime', label: 'Created', type: 'text', required: false, section: 'Audit' },
  { key: 'modifiedDateTime', label: 'Modified', type: 'text', required: false, section: 'Audit' }
];

const lineColumns: readonly ITableColumn<ISalesOrderLineItem>[] = [
  { key: 'lineNumber', header: 'Sequence', fieldName: 'lineNumber', sortable: false, renderType: 'text' },
  { key: 'lineType', header: 'Type', fieldName: 'lineType', sortable: false, renderType: 'text' },
  { key: 'itemCode', header: 'Item Code', fieldName: 'itemCode', sortable: false, renderType: 'text' },
  { key: 'quantity', header: 'Quantity', fieldName: 'quantity', sortable: false, renderType: 'text' },
  { key: 'unitPrice', header: 'Rate', fieldName: 'unitPrice', sortable: false, renderType: 'amount' },
  { key: 'lineDiscountPercentage', header: 'Line Discount %', fieldName: 'lineDiscountPercentage', sortable: false, renderType: 'text' },
  { key: 'lineAmount', header: 'Line Amount Excl. VAT', fieldName: 'lineAmount', sortable: false, renderType: 'amount' },
  { key: 'invoiceDiscountAmountExclVat', header: 'Invoice Discount Excl. VAT', fieldName: 'invoiceDiscountAmountExclVat', sortable: false, renderType: 'amount' }
];

const getDetailErrorMessage = (error: unknown): string => {
  const normalizedError = normalizeError(error);
  return normalizedError.status === 404 ? 'Sales order was not found.' : getUserFriendlyError(normalizedError);
};

export const SalesOrderDetailPage: React.FC<ISalesOrderDetailPageProps> = ({
  salesOrderId,
  currentUser,
  salesOrderService,
  onNavigate
}) => {
  const [salesOrder, setSalesOrder] = React.useState<ISalesOrderDetail | undefined>();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    const loadSalesOrder = async (): Promise<void> => {
      setLoading(true);
      setError(undefined);
      try {
        setSalesOrder(await salesOrderService.getSalesOrderById(salesOrderId, currentUser));
      } catch (loadError) {
        setSalesOrder(undefined);
        setError(getDetailErrorMessage(loadError));
      } finally {
        setLoading(false);
      }
    };

    loadSalesOrder().catch(() => undefined);
  }, [currentUser, salesOrderId, salesOrderService]);

  const values = React.useMemo<EntityFormValues>(() => ({
    salesOrderNumber: salesOrder?.salesOrderNumber || '',
    postingDate: salesOrder?.postingDate || '',
    customerCode: salesOrder?.customerCode || '',
    clientCode: salesOrder?.clientCode || '',
    externalDocumentNumber: salesOrder?.externalDocumentNumber || '',
    orderDate: salesOrder?.orderDate || '',
    salespersonCode: salesOrder?.salespersonCode || '',
    locationCode: salesOrder?.locationCode || '',
    status: salesOrder?.status || '',
    invoiceDiscountAmountExclVat: salesOrder?.invoiceDiscountAmountExclVat,
    invoiceDiscountPercent: salesOrder?.invoiceDiscountPercent,
    createdDateTime: salesOrder?.createdDateTime || '',
    modifiedDateTime: salesOrder?.modifiedDateTime || ''
  }), [salesOrder]);

  return (
    <EntityDetailPage
      title="Sales Order Detail"
      description={salesOrder?.salesOrderNumber || salesOrderId}
      backLabel="Back to Sales Orders"
      onBack={() => onNavigate(salesOrdersModuleConfig.route)}
      loading={loading}
      error={error}
    >
      <ReadOnlyEntityForm fields={headerFields} values={values} />
      <EntityDetailSection>
        <RelatedRecordsSection<ISalesOrderLineItem>
          title="Sales Lines"
          items={salesOrder?.lines || []}
          columns={lineColumns}
          emptyTitle="No sales lines found"
          emptyMessage="No sales lines are available for this sales order."
          getRowKey={(item, index) => item.lineNumber || String(index)}
        />
      </EntityDetailSection>
    </EntityDetailPage>
  );
};
