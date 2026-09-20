import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  IInvoiceDetail,
  IInvoiceFilters,
  IInvoiceLineItem,
  IInvoiceListItem,
  IInvoicePaymentRecord,
  PaymentStatus
} from '../../models/invoices';
import type { ICursorPaginationState, IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import type { IAppUser } from '../../models/settings/IAppAccessModels';
import { calculateOutstandingAmount, calculatePaymentStatus } from '../../utils/financialUtils';
import { normalizeBusinessDate } from '../../../../shared/utilities/formatUtils';
import {
  getCurrentSalespersonCode,
  normalizeSalespersonCode
} from '../../utils/salespersonDataScope';
import { buildServerPageQuery, createCursorPaginationState } from '../../../../shared/utilities/serverPagination';

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
  customerGstin?: string;
  customerGSTIN?: string;
  customerGSTState?: string;
  customerGstState?: string;
  customerState?: string;
  clientCode?: string;
  clientName?: string;
  clientAddress?: string;
  clientGSTNo?: string;
  clientGstin?: string;
  clientGSTIN?: string;
  clientGSTState?: string;
  clientGstState?: string;
  clientState?: string;
  salespersonCode?: string | number;
  salesPersonCode?: string | number;
  SalespersonCode?: string | number;
  salesPerson?: string | number;
  salesperson?: string | number;
  salesPersonName?: string;
  salespersonName?: string;
  salesOrderNo?: string;
  salesOrderNumber?: string;
  salesOrderReference?: string;
  bookingOrderNo?: string;
  bookingOrderNumber?: string;
  bookingOrderDate?: string;
  salesOrderDate?: string;
  postingDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  totalAmount?: number;
  netAmount?: number;
  tradeDiscount?: number;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountAmountExclVAT?: number;
  invoiceDiscountAmount?: number;
  invoiceDiscountPercent?: number;
  invoiceDiscountPercentage?: number;
  sgst?: number;
  cgst?: number;
  igst?: number;
  roundOffAmount?: number;
  roundOff?: number;
  amountInWords?: string;
  amountInWordsText?: string;
  irn?: string;
  IRN?: string;
  acknowledgementNumber?: string;
  ackNo?: string;
  AckNo?: string;
  acknowledgementDate?: string;
  ackDate?: string;
  AckDate?: string;
  qrCodeData?: string;
  qrCode?: string;
  qrCodeUrl?: string;
  signedQRCode?: string;
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
  hsnCode?: string;
  hsnSac?: string;
  hsnsac?: string;
  GSTRate?: string;
  gstRate?: string;
  gstPercent?: string | number;
  Amount?: number;
  lineNumber?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineDiscountPercentage?: number;
  lineDiscountPercent?: number;
  lineDiscountPct?: number;
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

type InvoiceListApiResponse = IServerPagedResult<IInvoiceApiModel>;

export class InvoiceService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getInvoices(
    filters: IInvoiceFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState,
    currentUser?: IAppUser
  ): Promise<IServerPagedResult<IInvoiceListItem>> {
    const mandatorySalespersonCode = getCurrentSalespersonCode(currentUser);
    const selectedSalespersonCode = normalizeSalespersonCode(filters.salespersonCode) || undefined;
    const salespersonCode = mandatorySalespersonCode || selectedSalespersonCode;
    const response = await this.apiClient.get<InvoiceListApiResponse>('/api/SalesInvoices', buildServerPageQuery({
      searchText: filters.searchText,
      customerCode: filters.customerCode,
      salesPerson: salespersonCode,
      salesOrderNumber: filters.salesOrderNumber,
      invoiceStatus: filters.invoiceStatus,
      paymentStatus: filters.paymentStatus,
      invoiceDateFrom: filters.invoiceDateFrom,
      invoiceDateTo: filters.invoiceDateTo,
      dueDateFrom: filters.dueDateFrom,
      dueDateTo: filters.dueDateTo,
      outstandingOnly: filters.outstandingOnly
    }, pagination, sorting));

    return this.mapPagedResult(response.data, pagination.pageSize);
  }

  public async getInvoiceById(id: string, currentUser?: IAppUser): Promise<IInvoiceDetail> {
    const salespersonCode = getCurrentSalespersonCode(currentUser);
    const response = await this.apiClient.get<IInvoiceApiModel>(`/api/SalesInvoices/${encodeURIComponent(id)}`, {
      salesPerson: salespersonCode
    });
    const scopedInvoice = response.data ? this.mapInvoiceApiToUiModel(response.data) : undefined;

    if (!scopedInvoice || (salespersonCode && normalizeSalespersonCode(scopedInvoice.salespersonCode) !== salespersonCode)) {
      const notFoundError = new Error(`Invoice ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return scopedInvoice;
  }

  public async getOutstandingInvoices(
    filters: IInvoiceFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState,
    currentUser?: IAppUser
  ): Promise<IServerPagedResult<IInvoiceListItem>> {
    return this.getInvoices({ ...filters, outstandingOnly: true }, pagination, sorting, currentUser);
  }

  public async getInvoicesBySalesOrderId(
    salesOrderId: string,
    currentUser?: IAppUser
  ): Promise<IServerPagedResult<IInvoiceListItem>> {
    return this.getInvoices({ salesOrderNumber: salesOrderId }, createCursorPaginationState(), undefined, currentUser);
  }

  public mapInvoiceApiToUiModel(api?: IInvoiceApiModel): IInvoiceDetail {
    const netAmount = this.toOptionalAmount(api?.netAmount);
    const invoiceDiscountAmountExclVat = this.toOptionalAmount(
      api?.invoiceDiscountAmountExclVat,
      this.toOptionalAmount(api?.invoiceDiscountAmountExclVAT, api?.invoiceDiscountAmount)
    );
    const tradeDiscount = this.toOptionalAmount(api?.tradeDiscount, invoiceDiscountAmountExclVat);
    const invoiceDiscountPercent = this.toOptionalAmount(api?.invoiceDiscountPercent, api?.invoiceDiscountPercentage);
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
    const rawSalespersonCode = api?.salespersonCode ?? api?.salesPersonCode ?? api?.SalespersonCode ??
      api?.salesPerson ?? api?.salesperson;
    const salespersonCode = rawSalespersonCode === undefined || rawSalespersonCode === null
      ? ''
      : String(rawSalespersonCode).trim();

    return {
      id: api?.id || invoiceNumber,
      invoiceNumber,
      customerCode: api?.customerCode || api?.sellToCustomerNo || '',
      customerName: api?.customerName || api?.sellToCustomerName || '',
      customerAddress: api?.customerAddress || '',
      customerGSTNo: api?.customerGSTNo || api?.customerGstin || api?.customerGSTIN || '',
      customerGSTState: api?.customerGSTState || api?.customerGstState || api?.customerState || '',
      clientCode: api?.clientCode || '',
      clientName: api?.clientName || '',
      clientAddress: api?.clientAddress || '',
      clientGSTNo: api?.clientGSTNo || api?.clientGstin || api?.clientGSTIN || '',
      clientGSTState: api?.clientGSTState || api?.clientGstState || api?.clientState || '',
      salespersonCode,
      salesPerson: api?.salesPersonName || api?.salespersonName || salespersonCode,
      salesOrderNumber: api?.bookingOrderNumber || api?.bookingOrderNo || api?.salesOrderNumber || api?.salesOrderNo || api?.salesOrderReference || '',
      salesOrderDate: normalizeBusinessDate(api?.bookingOrderDate || api?.salesOrderDate),
      invoiceDate: normalizeBusinessDate(api?.invoiceDate || api?.postingDate),
      dueDate: normalizeBusinessDate(api?.dueDate),
      totalAmount,
      netAmount,
      tradeDiscount,
      invoiceDiscountAmountExclVat,
      invoiceDiscountPercent,
      sgst,
      cgst,
      igst,
      roundOffAmount: this.toOptionalAmount(api?.roundOffAmount, api?.roundOff),
      amountInWords: api?.amountInWords || api?.amountInWordsText || '',
      irn: api?.irn || api?.IRN || '',
      acknowledgementNumber: api?.acknowledgementNumber || api?.ackNo || api?.AckNo || '',
      acknowledgementDate: normalizeBusinessDate(api?.acknowledgementDate || api?.ackDate || api?.AckDate),
      qrCodeData: api?.qrCodeData || api?.qrCode || api?.qrCodeUrl || api?.signedQRCode || '',
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

  private mapPagedResult(
    api: InvoiceListApiResponse | undefined,
    requestedPageSize: number
  ): IServerPagedResult<IInvoiceListItem> {
    return {
      items: (api?.items || []).map(item => this.mapInvoiceApiToUiModel(item)),
      pageSize: api?.pageSize || requestedPageSize,
      hasNext: Boolean(api?.hasNext),
      nextToken: api?.nextToken
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
      hsnCode: api.HSNCode || api.hsnCode || api.hsnSac || api.hsnsac || undefined,
      gstRate: this.toGstRate(api.GSTRate ?? api.gstRate ?? api.gstPercent),
      description: api.description || '',
      quantity,
      unitPrice: this.toAmount(api.unitPrice, quantity > 0 ? lineAmount / quantity : 0),
      lineDiscountPercentage: this.toOptionalAmount(
        api.lineDiscountPercentage,
        this.toOptionalAmount(api.lineDiscountPercent, api.lineDiscountPct)
      ),
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

  private toGstRate(value: string | number | undefined): string | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}%`;
    }

    return typeof value === 'string' && value ? value : undefined;
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

}
