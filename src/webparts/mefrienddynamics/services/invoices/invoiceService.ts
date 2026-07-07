import type { ApiClient } from '../api/apiClient';
import type { QueryParams } from '../api/apiTypes';
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

interface IInvoiceApiModel {
  id?: string;
  invoiceNumber?: string;
  customerCode?: string;
  customerName?: string;
  salesOrderNumber?: string;
  salesOrderReference?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus?: PaymentStatus;
  invoiceStatus?: string;
  currencyCode?: string;
  lines?: readonly IInvoiceLineItemApiModel[];
  payments?: readonly IInvoicePaymentRecordApiModel[];
}

interface IInvoiceLineItemApiModel {
  lineNumber?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
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

export class InvoiceService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getInvoices(
    filters: IInvoiceFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IInvoiceListItem>> {
    const response = await this.apiClient.get<IPagedResult<IInvoiceApiModel>>(
      '/api/invoices',
      this.buildQueryParams(filters, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
  }

  public async getInvoiceById(id: string): Promise<IInvoiceDetail> {
    const response = await this.apiClient.get<IInvoiceApiModel>(`/api/invoices/${encodeURIComponent(id)}`);
    return this.mapInvoiceApiToUiModel(response.data);
  }

  public async getOutstandingInvoices(
    filters: IInvoiceFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<IInvoiceListItem>> {
    const response = await this.apiClient.get<IPagedResult<IInvoiceApiModel>>(
      '/api/invoices/outstanding',
      this.buildQueryParams({ ...filters, outstandingOnly: true }, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
  }

  public async getInvoicesBySalesOrderId(salesOrderId: string): Promise<IPagedResult<IInvoiceListItem>> {
    const response = await this.apiClient.get<IPagedResult<IInvoiceApiModel>>(
      `/api/invoices/by-sales-order/${encodeURIComponent(salesOrderId)}`
    );

    return this.mapPagedResult(response.data);
  }

  public mapInvoiceApiToUiModel(api?: IInvoiceApiModel): IInvoiceDetail {
    const totalAmount = this.toAmount(api?.totalAmount, 0);
    const paidAmount = this.toOptionalAmount(api?.paidAmount);
    const outstandingAmount = this.calculateOutstandingAmount(totalAmount, paidAmount, api?.outstandingAmount);
    const paymentStatus = this.calculatePaymentStatus(totalAmount, paidAmount, outstandingAmount, api?.paymentStatus);

    return {
      id: api?.id || api?.invoiceNumber || '',
      invoiceNumber: api?.invoiceNumber || '',
      customerCode: api?.customerCode || '',
      customerName: api?.customerName || '',
      salesOrderNumber: api?.salesOrderNumber || api?.salesOrderReference || '',
      invoiceDate: api?.invoiceDate,
      dueDate: api?.dueDate,
      totalAmount,
      paidAmount,
      outstandingAmount,
      paymentStatus,
      invoiceStatus: api?.invoiceStatus || '',
      currencyCode: api?.currencyCode || '',
      lines: (api?.lines || []).map(line => this.mapInvoiceLineApiToUiModel(line, api?.currencyCode)),
      payments: (api?.payments || []).map(payment => this.mapInvoicePaymentApiToUiModel(payment, api?.currencyCode))
    };
  }

  public calculateOutstandingAmount(
    totalAmount: number,
    paidAmount: number | undefined,
    backendOutstanding?: number
  ): number | undefined {
    if (this.isValidNumber(backendOutstanding)) {
      return backendOutstanding;
    }

    return this.isValidNumber(paidAmount) ? totalAmount - paidAmount : undefined;
  }

  public calculatePaymentStatus(
    totalAmount: number,
    paidAmount: number | undefined,
    outstandingAmount: number | undefined,
    backendStatus?: PaymentStatus
  ): PaymentStatus {
    if (backendStatus && backendStatus.trim()) {
      return backendStatus;
    }

    if (!this.isValidNumber(outstandingAmount)) {
      return 'Unknown';
    }

    if (outstandingAmount <= 0) {
      return 'Paid';
    }

    if (this.isValidNumber(paidAmount) && paidAmount > 0 && outstandingAmount > 0) {
      return 'Partially Paid';
    }

    if ((!this.isValidNumber(paidAmount) || paidAmount <= 0) && outstandingAmount > 0) {
      return 'Unpaid';
    }

    return totalAmount === 0 ? 'Unknown' : 'Unknown';
  }

  private buildQueryParams(
    filters: IInvoiceFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): QueryParams {
    return {
      searchText: filters.searchText,
      customerCode: filters.customerCode,
      salesOrderReference: filters.salesOrderNumber,
      invoiceStatus: filters.invoiceStatus,
      paymentStatus: filters.paymentStatus,
      invoiceDateFrom: filters.invoiceDateFrom,
      invoiceDateTo: filters.invoiceDateTo,
      dueDateFrom: filters.dueDateFrom,
      dueDateTo: filters.dueDateTo,
      outstandingOnly: filters.outstandingOnly,
      pageNumber: pagination?.pageNumber,
      pageSize: pagination?.pageSize,
      sortField: sorting?.fieldName,
      sortDirection: sorting?.direction
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
    return {
      lineNumber: api.lineNumber || '',
      itemCode: api.itemCode || '',
      description: api.description || '',
      quantity: this.toAmount(api.quantity, 0),
      unitPrice: this.toAmount(api.unitPrice, 0),
      lineAmount: this.toAmount(api.lineAmount, 0),
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

  private toOptionalAmount(value: number | undefined): number | undefined {
    return this.isValidNumber(value) ? value : undefined;
  }

  private isValidNumber(value: number | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }
}
