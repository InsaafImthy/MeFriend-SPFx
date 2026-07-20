import type { ApiClient } from '../api/apiClient';
import type {
  IInvoiceDetail,
  IInvoiceFilters,
  IInvoiceLineItem,
  IInvoiceListItem,
  IInvoicePaymentRecord,
  PaymentStatus
} from '../../models/invoices';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';
import { calculateOutstandingAmount, calculatePaymentStatus } from '../../utils/financialUtils';

interface IInvoiceApiModel {
  '@odata.etag'?: string;
  id?: string;
  no?: string;
  invoiceNo?: string;
  invoiceNumber?: string;
  sellToCustomerNo?: string;
  sellToCustomerName?: string;
  customerCode?: string;
  customerName?: string;
  customerAddress?: string;
  customerGSTNo?: string;
  clientCode?: string;
  clientName?: string;
  clientAddress?: string;
  clientGSTNo?: string;
  salesPerson?: string;
  salesOrderNo?: string;
  salesOrderNumber?: string;
  salesOrderReference?: string;
  postingDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  netAmount?: number;
  tradeDiscount?: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus?: PaymentStatus;
  status?: string;
  invoiceStatus?: string;
  currencyCode?: string;
  SalesInvoiceLines?: readonly IInvoiceLineItemApiModel[];
  lines?: readonly IInvoiceLineItemApiModel[];
  payments?: readonly IInvoicePaymentRecordApiModel[];
}

interface IInvoiceLineItemApiModel {
  '@odata.etag'?: string;
  documentNo?: string;
  lineNo?: number;
  type?: string;
  no?: string;
  itemNo?: string;
  HSNCode?: string;
  GSTRate?: string;
  Amount?: number;
  lineNumber?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
  amountIncludingVAT?: number;
  currencyCode?: string;
}

interface IInvoicePaymentRecordApiModel {
  id?: string;
  paymentDate?: string;
  referenceNumber?: string;
  paymentMode?: string;
  amount?: number;
  currencyCode?: string;
}

type InvoiceListApiResponse = IPagedResult<IInvoiceApiModel> | readonly IInvoiceApiModel[];

export class InvoiceService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getInvoices(
    filters: IInvoiceFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IInvoiceListItem>> {
    const response = await this.apiClient.get<InvoiceListApiResponse>('/api/SalesInvoices');

    return this.mapInvoiceListApiToPagedResult(response.data, filters, pagination, sorting);
  }

  public async getInvoiceById(id: string): Promise<IInvoiceDetail> {
    const response = await this.apiClient.get<InvoiceListApiResponse>('/api/SalesInvoices');
    const invoice = this.findInvoiceApiById(response.data, id);

    if (!invoice) {
      const notFoundError = new Error(`Invoice ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapInvoiceApiToUiModel(invoice);
  }

  public async getOutstandingInvoices(
    filters: IInvoiceFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IInvoiceListItem>> {
    return this.getInvoices({ ...filters, outstandingOnly: true }, pagination, sorting);
  }

  public async getInvoicesBySalesOrderId(salesOrderId: string): Promise<IPagedResult<IInvoiceListItem>> {
    return this.getInvoices({ salesOrderNumber: salesOrderId });
  }

  public mapInvoiceApiToUiModel(api?: IInvoiceApiModel): IInvoiceDetail {
    const netAmount = this.toOptionalAmount(api?.netAmount);
    const tradeDiscount = this.toOptionalAmount(api?.tradeDiscount);
    const sgst = this.toOptionalAmount(api?.sgst);
    const cgst = this.toOptionalAmount(api?.cgst);
    const igst = this.toOptionalAmount(api?.igst);
    const derivedTotalAmount = this.calculateInvoiceTotal(netAmount, tradeDiscount, sgst, cgst, igst);
    const totalAmount = this.toAmount(api?.totalAmount, this.toAmount(derivedTotalAmount, 0));
    const paidAmount = this.toOptionalAmount(api?.paidAmount, 0);
    const outstandingAmount = calculateOutstandingAmount(totalAmount, paidAmount, api?.outstandingAmount);
    const paymentStatus = calculatePaymentStatus(paidAmount, outstandingAmount, api?.paymentStatus);
    const invoiceNumber = api?.invoiceNumber || api?.invoiceNo || api?.no || '';
    const lines = api?.SalesInvoiceLines || api?.lines || [];

    return {
      id: api?.id || invoiceNumber,
      invoiceNumber,
      customerCode: api?.customerCode || api?.sellToCustomerNo || '',
      customerName: api?.customerName || api?.sellToCustomerName || '',
      customerAddress: api?.customerAddress || '',
      customerGSTNo: api?.customerGSTNo || '',
      clientCode: api?.clientCode || '',
      clientName: api?.clientName || '',
      clientAddress: api?.clientAddress || '',
      clientGSTNo: api?.clientGSTNo || '',
      salesPerson: api?.salesPerson || '',
      salesOrderNumber: api?.salesOrderNumber || api?.salesOrderNo || api?.salesOrderReference || '',
      invoiceDate: api?.invoiceDate || api?.postingDate,
      dueDate: api?.dueDate,
      totalAmount,
      netAmount,
      tradeDiscount,
      sgst,
      cgst,
      igst,
      paidAmount,
      outstandingAmount,
      paymentStatus,
      invoiceStatus: api?.invoiceStatus || api?.status || '',
      currencyCode: api?.currencyCode || '',
      lines: lines.map(line => this.mapInvoiceLineApiToUiModel(line, api?.currencyCode)),
      payments: (api?.payments || []).map(payment => this.mapInvoicePaymentApiToUiModel(payment, api?.currencyCode))
    };
  }

  public calculateOutstandingAmount(
    totalAmount: number,
    paidAmount: number | undefined,
    backendOutstanding?: number
  ): number | undefined {
    return calculateOutstandingAmount(totalAmount, paidAmount, backendOutstanding);
  }

  public calculatePaymentStatus(
    totalAmount: number,
    paidAmount: number | undefined,
    outstandingAmount: number | undefined,
    backendStatus?: PaymentStatus
  ): PaymentStatus {
    return calculatePaymentStatus(paidAmount, outstandingAmount, backendStatus);
  }

  private mapInvoiceListApiToPagedResult(
    api: InvoiceListApiResponse | undefined,
    filters: IInvoiceFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<IInvoiceListItem> {
    if (!this.isInvoiceArray(api)) {
      return this.mapPagedResult(api);
    }

    const mappedItems = api.map(item => this.mapInvoiceApiToUiModel(item));
    const filteredItems = this.filterInvoices(mappedItems, filters);
    const sortedItems = this.sortInvoices(filteredItems, sorting);
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

  private mapPagedResult(api?: IPagedResult<IInvoiceApiModel>): IPagedResult<IInvoiceListItem> {
    return {
      items: (api?.items || []).map(item => this.mapInvoiceApiToUiModel(item)),
      pageNumber: api?.pageNumber || 1,
      pageSize: api?.pageSize || 0,
      totalCount: api?.totalCount || 0,
      totalPages: api?.totalPages || 0
    };
  }

  private mapInvoiceLineApiToUiModel(api: IInvoiceLineItemApiModel, currencyCode?: string): IInvoiceLineItem {
    const lineNumber = api.lineNumber || (typeof api.lineNo === 'number' ? String(api.lineNo) : '');
    const quantity = this.toAmount(api.quantity, 0);
    const lineAmount = this.toAmount(api.lineAmount, this.toAmount(api.Amount, 0));

    return {
      lineNumber,
      lineType: api.type || undefined,
      documentNumber: api.documentNo || undefined,
      itemCode: api.itemCode || api.no || api.itemNo || '',
      hsnCode: api.HSNCode || undefined,
      gstRate: api.GSTRate || undefined,
      description: api.description || '',
      quantity,
      unitPrice: this.toAmount(api.unitPrice, quantity > 0 ? lineAmount / quantity : 0),
      lineAmount,
      amountIncludingVAT: this.toOptionalAmount(api.amountIncludingVAT),
      currencyCode: api.currencyCode || currencyCode || ''
    };
  }

  private mapInvoicePaymentApiToUiModel(api: IInvoicePaymentRecordApiModel, currencyCode?: string): IInvoicePaymentRecord {
    return {
      id: api.id || api.referenceNumber || '',
      paymentDate: api.paymentDate,
      referenceNumber: api.referenceNumber || '',
      paymentMode: api.paymentMode || '',
      amount: this.toOptionalAmount(api.amount),
      currencyCode: api.currencyCode || currencyCode || ''
    };
  }

  private toAmount(value: number | undefined, fallback: number): number {
    return this.isValidNumber(value) ? value : fallback;
  }

  private toOptionalAmount(value: number | undefined, fallback?: number): number | undefined {
    if (this.isValidNumber(value)) {
      return value;
    }

    return this.isValidNumber(fallback) ? fallback : undefined;
  }

  private isValidNumber(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private calculateInvoiceTotal(
    netAmount: number | undefined,
    tradeDiscount: number | undefined,
    sgst: number | undefined,
    cgst: number | undefined,
    igst: number | undefined
  ): number | undefined {
    if (
      netAmount === undefined &&
      tradeDiscount === undefined &&
      sgst === undefined &&
      cgst === undefined &&
      igst === undefined
    ) {
      return undefined;
    }

    return (
      this.toAmount(netAmount, 0) -
      this.toAmount(tradeDiscount, 0) +
      this.toAmount(sgst, 0) +
      this.toAmount(cgst, 0) +
      this.toAmount(igst, 0)
    );
  }

  private filterInvoices(
    items: readonly IInvoiceListItem[],
    filters: IInvoiceFilters
  ): readonly IInvoiceListItem[] {
    const searchText = this.normalizeFilterText(filters.searchText);
    const customerCode = this.normalizeFilterText(filters.customerCode);
    const salesOrderNumber = this.normalizeFilterText(filters.salesOrderNumber);
    const invoiceStatus = this.normalizeFilterText(filters.invoiceStatus);
    const paymentStatus = this.normalizeFilterText(filters.paymentStatus);

    return items.filter(item => {
      const searchableText = [
        item.invoiceNumber,
        item.customerCode,
        item.customerName,
        item.salesOrderNumber,
        item.invoiceStatus,
        item.paymentStatus
      ].map(value => this.normalizeFilterText(value)).join(' ');

      if (searchText && searchableText.indexOf(searchText) === -1) {
        return false;
      }

      if (customerCode && `${item.customerCode} ${item.customerName}`.toLowerCase().indexOf(customerCode) === -1) {
        return false;
      }

      if (salesOrderNumber && this.normalizeFilterText(item.salesOrderNumber).indexOf(salesOrderNumber) === -1) {
        return false;
      }

      if (invoiceStatus && this.normalizeFilterText(item.invoiceStatus) !== invoiceStatus) {
        return false;
      }

      if (paymentStatus && this.normalizeFilterText(item.paymentStatus) !== paymentStatus) {
        return false;
      }

      if (filters.invoiceDateFrom && (!item.invoiceDate || item.invoiceDate < filters.invoiceDateFrom)) {
        return false;
      }

      if (filters.invoiceDateTo && (!item.invoiceDate || item.invoiceDate > filters.invoiceDateTo)) {
        return false;
      }

      if (filters.dueDateFrom && (!item.dueDate || item.dueDate < filters.dueDateFrom)) {
        return false;
      }

      if (filters.dueDateTo && (!item.dueDate || item.dueDate > filters.dueDateTo)) {
        return false;
      }

      if (filters.outstandingOnly && !this.isOutstandingInvoice(item)) {
        return false;
      }

      return true;
    });
  }

  private sortInvoices(items: readonly IInvoiceListItem[], sorting?: ISortState): readonly IInvoiceListItem[] {
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

  private findInvoiceApiById(
    api: InvoiceListApiResponse | undefined,
    id: string
  ): IInvoiceApiModel | undefined {
    const normalizedId = this.normalizeFilterText(id);
    const items = this.isInvoiceArray(api) ? api : api?.items || [];

    return items.filter(item => this.invoiceMatchesId(item, normalizedId))[0];
  }

  private invoiceMatchesId(api: IInvoiceApiModel, normalizedId: string): boolean {
    return [
      api.id,
      api.invoiceNumber,
      api.invoiceNo,
      api.no
    ].some(value => this.normalizeFilterText(value) === normalizedId);
  }

  private isInvoiceArray(api: InvoiceListApiResponse | undefined): api is readonly IInvoiceApiModel[] {
    return Array.isArray(api);
  }

  private isOutstandingInvoice(invoice: IInvoiceListItem): boolean {
    const status = this.normalizeFilterText(invoice.paymentStatus);

    return (
      (typeof invoice.outstandingAmount === 'number' && invoice.outstandingAmount > 0) ||
      status === 'unpaid' ||
      status === 'partially paid' ||
      status === 'overdue'
    );
  }

  private getSortableValue(item: IInvoiceListItem, fieldName: string): string | number | undefined {
    switch (fieldName) {
      case 'invoiceNumber':
        return item.invoiceNumber;
      case 'customerCode':
        return item.customerCode;
      case 'customerName':
        return item.customerName;
      case 'salesOrderNumber':
        return item.salesOrderNumber;
      case 'invoiceDate':
        return item.invoiceDate;
      case 'dueDate':
        return item.dueDate;
      case 'totalAmount':
        return item.totalAmount;
      case 'paidAmount':
        return item.paidAmount;
      case 'outstandingAmount':
        return item.outstandingAmount;
      case 'paymentStatus':
        return item.paymentStatus;
      case 'invoiceStatus':
        return item.invoiceStatus;
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

  private normalizeFilterText(value: string | undefined): string {
    return (value || '').trim().toLowerCase();
  }
}
