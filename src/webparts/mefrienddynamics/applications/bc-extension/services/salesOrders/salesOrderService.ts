import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ISalesOrderCreateFormState,
  ISalesOrderCreateRequest,
  ISalesOrderDetail,
  ISalesOrderFilters,
  ISalesOrderLineItem,
  ISalesOrderListItem
} from '../../models/salesOrders';
import type { IBcPagedResult, ICursorPaginationState } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import type { IAppUser } from '../../models/settings/IAppAccessModels';
import { normalizeBusinessDate } from '../../../../shared/utilities/formatUtils';
import { getCurrentSalespersonCode, normalizeSalespersonCode } from '../../utils/salespersonDataScope';
import { buildBcPageQuery } from '../../../../shared/utilities/serverPagination';

interface ISalesOrderLineItemApiModel {
  '@odata.etag': string;
  id: string;
  documentNo: string;
  sequence: number;
  type: string;
  no: string;
  quantity: number;
  rate: number;
  lineDiscountPercentage: number;
  lineAmountExclVat: number;
  invoiceDiscountAmountExclVat: number;
}

interface ISalesOrderApiModel {
  '@odata.etag': string;
  id: string;
  number: string;
  postingDate: string;
  sellToCustomerNo: string;
  billToCustomerNo: string;
  roNo: string;
  rodate: string;
  salesperson: string;
  locationcode: string;
  invoiceDiscountAmountExclVat: number;
  invoiceDiscountPercent: number;
  status: string;
  createdDateTime: string;
  modifiedDateTime: string;
  salesLines: readonly ISalesOrderLineItemApiModel[];
}

type SalesOrderListApiResponse = IBcPagedResult<ISalesOrderApiModel>;

export class SalesOrderService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalesOrders(
    filters: ISalesOrderFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState,
    currentUser?: IAppUser
  ): Promise<IBcPagedResult<ISalesOrderListItem>> {
    const mandatorySalespersonCode = getCurrentSalespersonCode(currentUser);
    const selectedSalespersonCode = normalizeSalespersonCode(filters.salespersonCode) || undefined;
    const salespersonCode = mandatorySalespersonCode || selectedSalespersonCode;
    const response = await this.apiClient.get<SalesOrderListApiResponse>('/api/SalesOrders', buildBcPageQuery({
      search: filters.searchText,
      filters: {
        customerCode: filters.customerCode,
        salespersonCode,
        status: filters.status
      }
    }, pagination, sorting));
    const result = response.data;

    return {
      items: (result?.items || []).map(item => this.mapSalesOrderApiToUiModel(item)),
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getSalesOrderById(id: string, currentUser?: IAppUser): Promise<ISalesOrderDetail> {
    const salespersonCode = getCurrentSalespersonCode(currentUser);
    const response = await this.apiClient.get<ISalesOrderApiModel>(`/api/SalesOrders/${encodeURIComponent(id)}`, {
      salespersonCode
    });

    if (!response.data || (salespersonCode && normalizeSalespersonCode(response.data.salesperson) !== salespersonCode)) {
      const notFoundError = new Error(`Sales order ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapSalesOrderApiToUiModel(response.data);
  }

  public async postSalesOrderToBusinessCentral(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    const request = this.mapSalesOrderFormToApiRequest(payload);
    const response = await this.apiClient.post<ISalesOrderCreateRequest, ISalesOrderApiModel>(
      '/api/SalesOrders',
      request
    );

    if (!response.data) {
      throw new Error('Business Central did not return the sales order contract.');
    }

    return this.mapSalesOrderApiToUiModel(response.data);
  }

  public async createSalesOrder(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    return this.postSalesOrderToBusinessCentral(payload);
  }

  public mapSalesOrderApiToUiModel(api: ISalesOrderApiModel): ISalesOrderDetail {
    return {
      id: api.id,
      salesOrderNumber: api.number,
      postingDate: normalizeBusinessDate(api.postingDate),
      customerCode: api.sellToCustomerNo,
      clientCode: api.billToCustomerNo,
      externalDocumentNumber: api.roNo,
      orderDate: normalizeBusinessDate(api.rodate),
      salespersonCode: api.salesperson,
      locationCode: api.locationcode,
      invoiceDiscountAmountExclVat: api.invoiceDiscountAmountExclVat,
      invoiceDiscountPercent: api.invoiceDiscountPercent,
      status: api.status,
      createdDateTime: api.createdDateTime,
      modifiedDateTime: api.modifiedDateTime,
      lines: api.salesLines.map(line => this.mapSalesOrderLineApiToUiModel(line))
    };
  }

  public mapSalesOrderFormToApiRequest(form: ISalesOrderCreateFormState): ISalesOrderCreateRequest {
    const customerNo = form.customerCode.trim();
    const productDimensionValue = form.eventCode?.trim();

    return {
      postingDate: normalizeBusinessDate(form.postingDate),
      sellToCustomerNo: customerNo,
      billToCustomerNo: form.billToCustomerCode?.trim() || customerNo,
      roNo: form.externalDocumentNumber?.trim() || undefined,
      rodate: normalizeBusinessDate(form.orderDate),
      salesperson: form.salespersonCode.trim() || undefined,
      locationcode: form.stateCode?.trim() || undefined,
      invoiceDiscountAmountExclVat: this.toPositiveOptionalNumber(form.invoiceDiscountAmountExclVat),
      invoiceDiscountPercent: this.toPositiveOptionalNumber(form.invoiceDiscountPercent),
      salesLines: form.lines.map(line => ({
        type: 'Item',
        no: line.itemCode.trim(),
        quantity: line.quantity,
        rate: line.unitPrice,
        lineDiscountPercentage: this.toPositiveOptionalNumber(line.lineDiscountPercentage),
        dimension: productDimensionValue
          ? [{ dimensionCode: 'PRODUCT', dimensionValueCode: productDimensionValue }]
          : undefined
      }))
    };
  }

  private mapSalesOrderLineApiToUiModel(api: ISalesOrderLineItemApiModel): ISalesOrderLineItem {
    return {
      lineNumber: String(api.sequence),
      documentNumber: api.documentNo,
      lineType: api.type,
      itemCode: api.no,
      description: '',
      quantity: api.quantity,
      unitPrice: api.rate,
      lineDiscountPercentage: api.lineDiscountPercentage,
      lineAmount: api.lineAmountExclVat,
      invoiceDiscountAmountExclVat: api.invoiceDiscountAmountExclVat
    };
  }

  private toPositiveOptionalNumber(value: number | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  }
}
