export type SalesOrderStatus = 'Draft' | 'Open' | 'Released' | 'Posted' | 'Cancelled' | 'Unknown' | string;

export interface ISalesOrderLineItem {
  lineNumber: string;
  documentNumber?: string;
  lineType?: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  lineDiscountPercentage?: number;
  lineAmount: number;
  invoiceDiscountAmountExclVat?: number;
  taxAmount?: number;
  unitOfMeasureCode?: string;
  remarks?: string;
}

export interface ISalesOrderListItem {
  id: string;
  salesOrderNumber: string;
  postingDate?: string;
  customerCode: string;
  clientCode: string;
  externalDocumentNumber: string;
  orderDate?: string;
  salespersonCode: string;
  locationCode: string;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountPercent?: number;
  status: SalesOrderStatus;
  createdDateTime?: string;
  modifiedDateTime?: string;
}

export interface ISalesOrderDetail extends ISalesOrderListItem {
  lines: readonly ISalesOrderLineItem[];
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
  status?: SalesOrderStatus;
}
