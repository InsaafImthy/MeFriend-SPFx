import type { ApiClient } from '../../../../shared/api/apiClient';
import type { IInvoiceDetail, IInvoiceFilters, IInvoiceLineItem, IInvoiceListItem } from '../../models/invoices';
import type { IBcPagedResult, ICursorPaginationState } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import type { IAppUser } from '../../models/settings/IAppAccessModels';
import { normalizeBusinessDate } from '../../../../shared/utilities/formatUtils';
import { getCurrentSalespersonCode, normalizeSalespersonCode } from '../../utils/salespersonDataScope';
import { buildBcPageQuery } from '../../../../shared/utilities/serverPagination';
import { requireInvoiceNumber } from '../../utils/invoiceReference';

interface IInvoiceLineItemApiModel {
  '@odata.etag': string;
  documentNo: string;
  lineNo: number;
  itemNo: string;
  quantity: number;
  HSNCode: string;
  GSTRate: string;
  Amount: number;
}

interface IInvoiceApiModel {
  '@odata.etag': string;
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  customerCode: string;
  customerName: string;
  customerAddress: string;
  customerGSTNo: string;
  clientCode: string;
  clientName: string;
  clientAddress: string;
  clientGSTNo: string;
  salesPerson: string;
  tradeDiscount: number;
  sgst: number;
  cgst: number;
  igst: number;
  netAmount: number;
  salesInvoiceLines: readonly IInvoiceLineItemApiModel[];
}

type InvoiceListApiResponse = IBcPagedResult<IInvoiceApiModel>;

export class InvoiceService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getInvoices(
    filters: IInvoiceFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState,
    currentUser?: IAppUser
  ): Promise<IBcPagedResult<IInvoiceListItem>> {
    const mandatorySalespersonCode = getCurrentSalespersonCode(currentUser);
    const selectedSalespersonCode = normalizeSalespersonCode(filters.salespersonCode) || undefined;
    const salespersonCode = mandatorySalespersonCode || selectedSalespersonCode;
    const response = await this.apiClient.get<InvoiceListApiResponse>('/api/SalesInvoices', buildBcPageQuery({
      search: filters.searchText,
      filters: {
        customerCode: filters.customerCode,
        salespersonCode,
        invoiceDateFrom: normalizeBusinessDate(filters.invoiceDateFrom),
        invoiceDateTo: normalizeBusinessDate(filters.invoiceDateTo)
      }
    }, pagination, sorting));
    const result = response.data;

    return {
      items: (result?.items || []).map(item => this.mapInvoiceApiToUiModel(item)),
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getInvoiceByNumber(invoiceNumber: string, currentUser?: IAppUser): Promise<IInvoiceDetail> {
    const invoiceReference = requireInvoiceNumber(invoiceNumber);
    const salespersonCode = getCurrentSalespersonCode(currentUser);
    const response = await this.apiClient.get<IInvoiceApiModel>(
      `/api/SalesInvoices/${encodeURIComponent(invoiceReference)}`,
      { salespersonCode }
    );

    if (!response.data || (salespersonCode && normalizeSalespersonCode(response.data.salesPerson) !== salespersonCode)) {
      const notFoundError = new Error(`Invoice ${invoiceReference} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapInvoiceApiToUiModel(response.data);
  }

  public mapInvoiceApiToUiModel(api: IInvoiceApiModel): IInvoiceDetail {
    return {
      id: api.id,
      invoiceNumber: api.invoiceNo,
      invoiceDate: normalizeBusinessDate(api.invoiceDate),
      customerCode: api.customerCode,
      customerName: api.customerName,
      customerAddress: api.customerAddress,
      customerGSTNo: api.customerGSTNo,
      clientCode: api.clientCode,
      clientName: api.clientName,
      clientAddress: api.clientAddress,
      clientGSTNo: api.clientGSTNo,
      salespersonCode: api.salesPerson,
      tradeDiscount: api.tradeDiscount,
      sgst: api.sgst,
      cgst: api.cgst,
      igst: api.igst,
      netAmount: api.netAmount,
      lines: api.salesInvoiceLines.map(line => this.mapInvoiceLineApiToUiModel(line))
    };
  }

  private mapInvoiceLineApiToUiModel(api: IInvoiceLineItemApiModel): IInvoiceLineItem {
    const amount = Number.isFinite(api.Amount) ? api.Amount : 0;
    const quantity = Number.isFinite(api.quantity) ? api.quantity : 0;

    return {
      lineNumber: String(api.lineNo),
      documentNumber: api.documentNo,
      itemCode: api.itemNo,
      hsnCode: api.HSNCode,
      gstRate: api.GSTRate,
      description: '',
      quantity,
      unitPrice: quantity === 0 ? 0 : amount / quantity,
      lineAmount: amount
    };
  }
}
