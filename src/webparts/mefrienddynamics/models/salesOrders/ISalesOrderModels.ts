import type { PaymentStatus } from '../invoices/IInvoiceModels';

export type SalesOrderStatus = 'Draft' | 'Open' | 'Released' | 'Posted' | 'Cancelled' | 'Unknown' | string;

export interface ISalesOrderLineItem {
  lineNumber: string;
  documentNumber?: string;
  lineType?: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitPriceExcludingTax?: number;
  lineDiscountPercentage?: number;
  lineAmount: number;
  amountIncludingVAT?: number;
  amountLCY?: number;
  amountIncludingVATLCY?: number;
  outstandingQuantity?: number;
  outstandingAmountLCY?: number;
  quantityShipped?: number;
  quantityInvoiced?: number;
  quantityToShip?: number;
  quantityToInvoice?: number;
  unitOfMeasureCode?: string;
  remarks?: string;
  shipmentDate?: string;
  plannedShipmentDate?: string;
  plannedDeliveryDate?: string;
  requestedDeliveryDate?: string;
  promisedDeliveryDate?: string;
  taxAmount?: number;
  lineStatus?: string;
}

export interface ISalesOrderRelatedInvoice {
  id: string;
  invoiceNumber: string;
  salespersonCode: string;
  invoiceDate?: string;
  totalAmount: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus: PaymentStatus;
  invoiceStatus: string;
  currencyCode: string;
}

export interface ISalesOrderInvoiceSummary {
  invoiceCount: number;
  outstandingInvoiceCount: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
}

export interface ISalesOrderListItem {
  id: string;
  salesOrderNumber: string;
  documentType?: string;
  documentDate?: string;
  postingDescription?: string;
  customerCode: string;
  customerName: string;
  customerName2?: string;
  clientCode?: string;
  clientName?: string;
  salespersonCode: string;
  salespersonName: string;
  eventCode: string;
  eventName: string;
  postingDate?: string;
  orderDate?: string;
  dueDate?: string;
  shipmentDate?: string;
  requestedDeliveryDate?: string;
  promisedDeliveryDate?: string;
  externalDocumentNumber?: string;
  yourReference?: string;
  status: SalesOrderStatus;
  totalAmount: number;
  amountIncludingVAT?: number;
  amountLCY?: number;
  amountIncludingVATLCY?: number;
  outstandingQuantity?: number;
  outstandingAmountLCY?: number;
  quantityToShip?: number;
  quantityShipped?: number;
  quantityToInvoice?: number;
  quantityInvoiced?: number;
  currencyCode: string;
  pricesIncludingVAT?: boolean;
  paymentTermsCode?: string;
  paymentMethodCode?: string;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountPercent?: number;
  paymentDiscountPercent?: number;
  prepaymentPercent?: number;
  responsibilityCenter?: string;
  assignedUserID?: string;
  shortcutDimension1Code?: string;
  shortcutDimension2Code?: string;
  locationCode?: string;
  shippingAdvice?: string;
  completelyShipped?: boolean;
  shipToName?: string;
  shipToAddress?: string;
  shipToAddress2?: string;
  shipToCity?: string;
  shipToCounty?: string;
  shipToPostCode?: string;
  shipToCountryRegionCode?: string;
  shipToContact?: string;
  billToName?: string;
  billToAddress?: string;
  billToAddress2?: string;
  billToCity?: string;
  billToCounty?: string;
  billToPostCode?: string;
  billToCountryRegionCode?: string;
  billToContactNo?: string;
  billToContact?: string;
  sellToAddress?: string;
  sellToAddress2?: string;
  sellToCity?: string;
  sellToCounty?: string;
  sellToPostCode?: string;
  sellToCountryRegionCode?: string;
  sellToPhoneNo?: string;
  sellToEmail?: string;
  sellToContact?: string;
}

export interface ISalesOrderDetail extends ISalesOrderListItem {
  lines: readonly ISalesOrderLineItem[];
  relatedInvoices: readonly ISalesOrderRelatedInvoice[];
  invoiceSummary: ISalesOrderInvoiceSummary;
}

export interface ISalesOrderCreateFormState {
  customerCode: string;
  billToCustomerCode?: string;
  salespersonCode: string;
  eventCode?: string;
  countryCode?: string;
  stateCode?: string;
  orderDate?: string;
  postingDate?: string;
  externalDocumentNumber?: string;
  remarks?: string;
  currencyCode?: string;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountPercent?: number;
  lines: readonly ISalesOrderLineItem[];
}

export interface ISalesOrderCreateRequest {
  postingDate?: string;
  sellToCustomerNo: string;
  billToCustomerNo: string;
  roNo?: string;
  rodate?: string;
  salesperson?: string;
  locationcode?: string;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountPercent?: number;
  salesLines: readonly ISalesOrderCreateLineRequest[];
}

export interface ISalesOrderCreateLineRequest {
  type: 'Item';
  no: string;
  quantity: number;
  rate: number;
  lineDiscountPercentage?: number;
  dimension?: readonly ISalesOrderLineDimensionRequest[];
}

export interface ISalesOrderLineDimensionRequest {
  dimensionCode: 'PRODUCT';
  dimensionValueCode: string;
}

export interface ISalesOrderFilters {
  searchText?: string;
  customerCode?: string;
  salespersonCode?: string;
  eventCode?: string;
  status?: SalesOrderStatus;
  orderDateFrom?: string;
  orderDateTo?: string;
}
