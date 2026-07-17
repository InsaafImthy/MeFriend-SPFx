import type { ApiClient } from '../api/apiClient';
import type {
  ISalesOrderCreateFormState,
  ISalesOrderCreateRequest,
  ISalesOrderDetail,
  ISalesOrderFilters,
  ISalesOrderInvoiceSummary,
  ISalesOrderLineItem,
  ISalesOrderListItem,
  ISalesOrderRelatedInvoice
} from '../../models/salesOrders';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';
import {
  calculateOutstandingAmount,
  calculatePaymentStatus,
  summarizeRelatedInvoices
} from '../../utils/financialUtils';

interface ISalesOrderApiModel {
  '@odata.etag'?: string;
  id?: string;
  Id?: string;
  no?: string;
  salesOrderNumber?: string;
  sellToCustomerNo?: string;
  sellToCustomerName?: string;
  customerNo?: string;
  customerName?: string;
  clientNo?: string;
  clientName?: string;
  customerCode?: string;
  salespersonCode?: string;
  salespersonName?: string;
  eventCode?: string;
  eventName?: string;
  postingDate?: string;
  orderDate?: string;
  documentDate?: string;
  status?: string;
  amount?: number;
  amountIncludingVAT?: number;
  totalAmount?: number;
  currencyCode?: string;
  SalesOrderLines?: readonly ISalesOrderLineItemApiModel[];
  lines?: readonly ISalesOrderLineItemApiModel[];
  relatedInvoices?: readonly ISalesOrderRelatedInvoiceApiModel[];
  invoiceSummary?: ISalesOrderInvoiceSummaryApiModel;
}

interface ISalesOrderLineItemApiModel {
  '@odata.etag'?: string;
  Id?: string;
  documentNo?: string;
  lineNo?: number;
  type?: string;
  no?: string;
  itemNo?: string;
  lineNumber?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  unitpriceexclTax?: number;
  lineAmount?: number;
  amountIncludingVAT?: number;
  amountIncludingVATLCY?: number;
  taxAmount?: number;
  tax?: number;
  lineStatus?: string;
}

interface ISalesOrderRelatedInvoiceApiModel {
  no?: string;
  invoiceNo?: string;
  id?: string;
  invoiceNumber?: string;
  postingDate?: string;
  invoiceDate?: string;
  salesOrderNo?: string;
  salesOrderNumber?: string;
  salesOrderReference?: string;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus?: string;
  status?: string;
  invoiceStatus?: string;
  currencyCode?: string;
}

interface ISalesOrderInvoiceSummaryApiModel {
  invoiceCount?: number;
  outstandingInvoiceCount?: number;
  totalInvoicedAmount?: number;
  totalPaidAmount?: number;
  totalOutstandingAmount?: number;
}

type SalesOrderListApiResponse = IPagedResult<ISalesOrderApiModel> | readonly ISalesOrderApiModel[];
type SalesInvoiceListApiResponse =
  | IPagedResult<ISalesOrderRelatedInvoiceApiModel>
  | readonly ISalesOrderRelatedInvoiceApiModel[];

export class SalesOrderService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalesOrders(
    filters: ISalesOrderFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ISalesOrderListItem>> {
    const response = await this.apiClient.get<SalesOrderListApiResponse>('/api/SalesOrders');

    return this.mapSalesOrderListApiToPagedResult(response.data, filters, pagination, sorting);
  }

  public async getSalesOrderById(id: string): Promise<ISalesOrderDetail> {
    const response = await this.apiClient.get<SalesOrderListApiResponse>('/api/SalesOrders');
    const salesOrder = this.findSalesOrderApiById(response.data, id);

    if (!salesOrder) {
      throw new Error(`Sales order ${id} was not found.`);
    }

    return this.mapSalesOrderApiToUiModel(salesOrder);
  }

  public async createSalesOrder(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    const response = await this.apiClient.post<ISalesOrderCreateRequest, ISalesOrderApiModel>(
      '/api/sales-orders',
      this.mapSalesOrderFormToApiRequest(payload)
    );

    return this.mapSalesOrderApiToUiModel(response.data);
  }

  public async getInvoicesForSalesOrder(salesOrderId: string): Promise<readonly ISalesOrderRelatedInvoice[]> {
    const response = await this.apiClient.get<SalesInvoiceListApiResponse>('/api/SalesInvoices');
    const invoices = this.getInvoiceItems(response.data).filter(invoice =>
      this.relatedInvoiceMatchesSalesOrder(invoice, salesOrderId)
    );

    return this.mapRelatedInvoicesApiToUiModel(invoices);
  }

  public mapSalesOrderApiToUiModel(api?: ISalesOrderApiModel): ISalesOrderDetail {
    const relatedInvoices = this.mapRelatedInvoicesApiToUiModel(api?.relatedInvoices || []);
    const salesOrderNumber = api?.salesOrderNumber || api?.no || '';
    const customerCode = api?.customerCode || api?.sellToCustomerNo || api?.customerNo || '';
    const customerName = api?.customerName || api?.sellToCustomerName || '';
    const lines = api?.SalesOrderLines || api?.lines || [];

    return {
      id: api?.id || api?.Id || salesOrderNumber,
      salesOrderNumber,
      customerCode,
      customerName,
      clientCode: api?.clientNo || '',
      clientName: api?.clientName || '',
      salespersonCode: api?.salespersonCode || '',
      salespersonName: api?.salespersonName || '',
      eventCode: api?.eventCode || '',
      eventName: api?.eventName || '',
      postingDate: api?.postingDate || undefined,
      orderDate: api?.orderDate || api?.documentDate || undefined,
      status: api?.status || 'Unknown',
      totalAmount: this.toNumber(api?.amount, this.toNumber(api?.totalAmount, this.sumLineAmount(lines, 'lineAmount'))),
      amountIncludingVAT: this.toNumber(api?.amountIncludingVAT, this.sumLineAmount(lines, 'amountIncludingVAT')),
      currencyCode: api?.currencyCode || '',
      lines: lines.map(line => this.mapSalesOrderLineApiToUiModel(line)),
      relatedInvoices,
      invoiceSummary: this.mapInvoiceSummaryApiToUiModel(api?.invoiceSummary, relatedInvoices)
    };
  }

  public mapSalesOrderFormToApiRequest(form: ISalesOrderCreateFormState): ISalesOrderCreateRequest {
    return {
      customerCode: form.customerCode.trim(),
      salespersonCode: form.salespersonCode.trim(),
      eventCode: form.eventCode?.trim() || undefined,
      countryCode: form.countryCode?.trim() || undefined,
      stateCode: form.stateCode?.trim() || undefined,
      orderDate: form.orderDate,
      postingDate: form.postingDate,
      externalDocumentNumber: form.externalDocumentNumber?.trim() || undefined,
      remarks: form.remarks?.trim() || undefined,
      currencyCode: form.currencyCode?.trim() || undefined,
      lines: form.lines.map(line => ({
        lineNumber: line.lineNumber.trim(),
        itemCode: line.itemCode.trim(),
        description: line.description.trim(),
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineAmount: line.lineAmount
      }))
    };
  }

  public mapRelatedInvoicesApiToUiModel(
    api: readonly ISalesOrderRelatedInvoiceApiModel[]
  ): readonly ISalesOrderRelatedInvoice[] {
    return api.map(invoice => {
      const totalAmount = invoice.totalAmount || 0;
      const paidAmount = invoice.paidAmount || 0;
      const outstandingAmount = calculateOutstandingAmount(totalAmount, paidAmount, invoice.outstandingAmount);
      const invoiceNumber = invoice.invoiceNumber || invoice.invoiceNo || invoice.no || '';

      return {
        id: invoice.id || invoiceNumber,
        invoiceNumber,
        invoiceDate: invoice.invoiceDate || invoice.postingDate,
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentStatus: calculatePaymentStatus(paidAmount, outstandingAmount, invoice.paymentStatus),
        invoiceStatus: invoice.invoiceStatus || invoice.status || '',
        currencyCode: invoice.currencyCode || ''
      };
    });
  }

  public getInvoiceSummaryFromRelatedInvoices(
    relatedInvoices: readonly ISalesOrderRelatedInvoice[]
  ): ISalesOrderInvoiceSummary {
    return this.mapInvoiceSummaryApiToUiModel(undefined, relatedInvoices);
  }

  private mapSalesOrderListApiToPagedResult(
    api: SalesOrderListApiResponse | undefined,
    filters: ISalesOrderFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ISalesOrderListItem> {
    if (!this.isSalesOrderArray(api)) {
      return this.mapPagedResult(api);
    }

    const mappedItems = api.map(item => this.mapSalesOrderApiToUiModel(item));
    const filteredItems = this.filterSalesOrders(mappedItems, filters);
    const sortedItems = this.sortSalesOrders(filteredItems, sorting);
    const pageSize = Math.max(1, pagination?.pageSize || sortedItems.length || 1);
    const totalCount = sortedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pageNumber = Math.min(Math.max(1, pagination?.pageNumber || 1), totalPages);
    const startIndex = (pageNumber - 1) * pageSize;

    return {
      items: sortedItems.slice(startIndex, startIndex + pageSize),
      pageNumber,
      pageSize,
      totalCount,
      totalPages
    };
  }

  private mapPagedResult(api?: IPagedResult<ISalesOrderApiModel>): IPagedResult<ISalesOrderListItem> {
    return {
      items: (api?.items || []).map(item => this.mapSalesOrderApiToUiModel(item)),
      pageNumber: api?.pageNumber || 1,
      pageSize: api?.pageSize || 0,
      totalCount: api?.totalCount || 0,
      totalPages: api?.totalPages || 0
    };
  }

  private mapSalesOrderLineApiToUiModel(api: ISalesOrderLineItemApiModel): ISalesOrderLineItem {
    const lineNumber = api.lineNumber || (typeof api.lineNo === 'number' ? String(api.lineNo) : '');

    return {
      lineNumber,
      documentNumber: api.documentNo || undefined,
      lineType: api.type || undefined,
      itemCode: api.itemCode || api.no || api.itemNo || '',
      description: api.description || '',
      quantity: this.toNumber(api.quantity, 0),
      unitPrice: this.toNumber(api.unitPrice, 0),
      unitPriceExcludingTax: this.toOptionalNumber(api.unitpriceexclTax),
      lineAmount: this.toNumber(api.lineAmount, 0),
      amountIncludingVAT: this.toOptionalNumber(api.amountIncludingVAT, this.toOptionalNumber(api.amountIncludingVATLCY)),
      taxAmount: typeof api.taxAmount === 'number' ? api.taxAmount : this.toOptionalNumber(api.tax),
      lineStatus: api.lineStatus || ''
    };
  }

  private mapInvoiceSummaryApiToUiModel(
    api: ISalesOrderInvoiceSummaryApiModel | undefined,
    relatedInvoices: readonly ISalesOrderRelatedInvoice[]
  ): ISalesOrderInvoiceSummary {
    if (api) {
      return {
        invoiceCount: api.invoiceCount || 0,
        outstandingInvoiceCount: api.outstandingInvoiceCount || 0,
        totalInvoicedAmount: api.totalInvoicedAmount || 0,
        totalPaidAmount: api.totalPaidAmount || 0,
        totalOutstandingAmount: api.totalOutstandingAmount || 0
      };
    }

    return summarizeRelatedInvoices(relatedInvoices);
  }

  private filterSalesOrders(
    items: readonly ISalesOrderListItem[],
    filters: ISalesOrderFilters
  ): readonly ISalesOrderListItem[] {
    const searchText = (filters.searchText || '').trim().toLowerCase();
    const customerCode = (filters.customerCode || '').trim().toLowerCase();
    const salespersonCode = (filters.salespersonCode || '').trim().toLowerCase();
    const eventCode = (filters.eventCode || '').trim().toLowerCase();
    const status = (filters.status || '').trim().toLowerCase();

    return items.filter(item => {
      const searchableText = [
        item.salesOrderNumber,
        item.customerCode,
        item.customerName,
        item.clientCode,
        item.clientName,
        item.salespersonCode,
        item.salespersonName,
        item.eventCode,
        item.eventName,
        item.status
      ].join(' ').toLowerCase();

      if (searchText && searchableText.indexOf(searchText) === -1) {
        return false;
      }

      if (customerCode && `${item.customerCode} ${item.customerName}`.toLowerCase().indexOf(customerCode) === -1) {
        return false;
      }

      if (salespersonCode && `${item.salespersonCode} ${item.salespersonName}`.toLowerCase().indexOf(salespersonCode) === -1) {
        return false;
      }

      if (eventCode && `${item.eventCode} ${item.eventName}`.toLowerCase().indexOf(eventCode) === -1) {
        return false;
      }

      if (status && String(item.status || '').toLowerCase() !== status) {
        return false;
      }

      if (filters.orderDateFrom && (!item.orderDate || item.orderDate < filters.orderDateFrom)) {
        return false;
      }

      if (filters.orderDateTo && (!item.orderDate || item.orderDate > filters.orderDateTo)) {
        return false;
      }

      return true;
    });
  }

  private sortSalesOrders(
    items: readonly ISalesOrderListItem[],
    sorting?: ISortState
  ): readonly ISalesOrderListItem[] {
    if (!sorting) {
      return items;
    }

    return items.slice().sort((left, right) => {
      const leftValue = this.getSortableValue(left, sorting.fieldName);
      const rightValue = this.getSortableValue(right, sorting.fieldName);
      const comparison = this.compareValues(leftValue, rightValue);

      return sorting.direction === 'desc' ? comparison * -1 : comparison;
    });
  }

  private findSalesOrderApiById(
    api: SalesOrderListApiResponse | undefined,
    id: string
  ): ISalesOrderApiModel | undefined {
    const normalizedId = id.trim().toLowerCase();
    const items = this.isSalesOrderArray(api) ? api : api?.items || [];

    return items.filter(item => this.salesOrderMatchesId(item, normalizedId))[0];
  }

  private salesOrderMatchesId(api: ISalesOrderApiModel, normalizedId: string): boolean {
    const identifiers = [
      api.id,
      api.Id,
      api.salesOrderNumber,
      api.no
    ];

    return identifiers
      .filter((value): value is string => Boolean(value))
      .map(value => value.toLowerCase())
      .indexOf(normalizedId) !== -1;
  }

  private getSortableValue(item: ISalesOrderListItem, fieldName: string): string | number | undefined {
    switch (fieldName) {
      case 'salesOrderNumber':
        return item.salesOrderNumber;
      case 'customerCode':
        return item.customerCode;
      case 'customerName':
        return item.customerName;
      case 'clientCode':
        return item.clientCode;
      case 'clientName':
        return item.clientName;
      case 'salespersonCode':
        return item.salespersonCode;
      case 'salespersonName':
        return item.salespersonName;
      case 'eventCode':
        return item.eventCode;
      case 'eventName':
        return item.eventName;
      case 'postingDate':
        return item.postingDate;
      case 'orderDate':
        return item.orderDate;
      case 'status':
        return item.status;
      case 'totalAmount':
        return item.totalAmount;
      case 'amountIncludingVAT':
        return item.amountIncludingVAT;
      case 'currencyCode':
        return item.currencyCode;
      default:
        return undefined;
    }
  }

  private compareValues(leftValue: string | number | undefined, rightValue: string | number | undefined): number {
    if (leftValue === rightValue) {
      return 0;
    }

    if (leftValue === undefined || leftValue === '') {
      return 1;
    }

    if (rightValue === undefined || rightValue === '') {
      return -1;
    }

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      return leftValue - rightValue;
    }

    return String(leftValue).localeCompare(String(rightValue), undefined, { sensitivity: 'base' });
  }

  private isSalesOrderArray(api: SalesOrderListApiResponse | undefined): api is readonly ISalesOrderApiModel[] {
    return Array.isArray(api);
  }

  private getInvoiceItems(
    api: SalesInvoiceListApiResponse | undefined
  ): readonly ISalesOrderRelatedInvoiceApiModel[] {
    if (this.isSalesInvoiceArray(api)) {
      return api;
    }

    return api?.items || [];
  }

  private isSalesInvoiceArray(
    api: SalesInvoiceListApiResponse | undefined
  ): api is readonly ISalesOrderRelatedInvoiceApiModel[] {
    return Array.isArray(api);
  }

  private relatedInvoiceMatchesSalesOrder(
    invoice: ISalesOrderRelatedInvoiceApiModel,
    salesOrderId: string
  ): boolean {
    const normalizedSalesOrderId = salesOrderId.trim().toLowerCase();

    return [
      invoice.salesOrderNo,
      invoice.salesOrderNumber,
      invoice.salesOrderReference
    ]
      .filter((value): value is string => Boolean(value))
      .map(value => value.trim().toLowerCase())
      .indexOf(normalizedSalesOrderId) !== -1;
  }

  private sumLineAmount(
    lines: readonly ISalesOrderLineItemApiModel[],
    fieldName: 'lineAmount' | 'amountIncludingVAT'
  ): number {
    return lines.reduce((total, line) => {
      const amount = fieldName === 'amountIncludingVAT'
        ? this.toNumber(line.amountIncludingVAT, this.toNumber(line.amountIncludingVATLCY, 0))
        : this.toNumber(line.lineAmount, 0);

      return total + amount;
    }, 0);
  }

  private toOptionalNumber(value: number | undefined, fallback?: number): number | undefined {
    return typeof value === 'number' ? value : fallback;
  }

  private toNumber(value: number | undefined, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
  }
}
