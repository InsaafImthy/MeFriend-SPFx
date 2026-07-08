import type { ApiClient } from '../api/apiClient';
import type { QueryParams } from '../api/apiTypes';
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
import { InvoiceService } from '../invoices/invoiceService';

interface ISalesOrderApiModel {
  id?: string;
  salesOrderNumber?: string;
  customerCode?: string;
  customerName?: string;
  salespersonCode?: string;
  salespersonName?: string;
  eventCode?: string;
  eventName?: string;
  orderDate?: string;
  status?: string;
  totalAmount?: number;
  currencyCode?: string;
  lines?: readonly ISalesOrderLineItemApiModel[];
  relatedInvoices?: readonly ISalesOrderRelatedInvoiceApiModel[];
  invoiceSummary?: ISalesOrderInvoiceSummaryApiModel;
}

interface ISalesOrderLineItemApiModel {
  lineNumber?: string;
  itemCode?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  lineAmount?: number;
  taxAmount?: number;
  tax?: number;
  lineStatus?: string;
}

interface ISalesOrderRelatedInvoiceApiModel {
  id?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  paymentStatus?: string;
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

export class SalesOrderService {
  private readonly invoiceService: InvoiceService;

  public constructor(private readonly apiClient: ApiClient) {
    this.invoiceService = new InvoiceService(apiClient);
  }

  public async getSalesOrders(
    filters: ISalesOrderFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ISalesOrderListItem>> {
    const response = await this.apiClient.get<IPagedResult<ISalesOrderApiModel>>(
      '/api/sales-orders',
      this.buildQueryParams(filters, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
  }

  public async getSalesOrderById(id: string): Promise<ISalesOrderDetail> {
    const response = await this.apiClient.get<ISalesOrderApiModel>(`/api/sales-orders/${encodeURIComponent(id)}`);
    return this.mapSalesOrderApiToUiModel(response.data);
  }

  public async createSalesOrder(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    const response = await this.apiClient.post<ISalesOrderCreateRequest, ISalesOrderApiModel>(
      '/api/sales-orders',
      this.mapSalesOrderFormToApiRequest(payload)
    );

    return this.mapSalesOrderApiToUiModel(response.data);
  }

  public async getInvoicesForSalesOrder(salesOrderId: string): Promise<readonly ISalesOrderRelatedInvoice[]> {
    const response = await this.apiClient.get<readonly ISalesOrderRelatedInvoiceApiModel[]>(
      `/api/sales-orders/${encodeURIComponent(salesOrderId)}/invoices`
    );

    return this.mapRelatedInvoicesApiToUiModel(response.data || []);
  }

  public mapSalesOrderApiToUiModel(api?: ISalesOrderApiModel): ISalesOrderDetail {
    const relatedInvoices = this.mapRelatedInvoicesApiToUiModel(api?.relatedInvoices || []);

    return {
      id: api?.id || api?.salesOrderNumber || '',
      salesOrderNumber: api?.salesOrderNumber || '',
      customerCode: api?.customerCode || '',
      customerName: api?.customerName || '',
      salespersonCode: api?.salespersonCode || '',
      salespersonName: api?.salespersonName || '',
      eventCode: api?.eventCode || '',
      eventName: api?.eventName || '',
      orderDate: api?.orderDate,
      status: api?.status || 'Unknown',
      totalAmount: api?.totalAmount || 0,
      currencyCode: api?.currencyCode || '',
      lines: (api?.lines || []).map(line => this.mapSalesOrderLineApiToUiModel(line)),
      relatedInvoices,
      invoiceSummary: this.mapInvoiceSummaryApiToUiModel(api?.invoiceSummary, relatedInvoices)
    };
  }

  public mapSalesOrderFormToApiRequest(form: ISalesOrderCreateFormState): ISalesOrderCreateRequest {
    return {
      customerCode: form.customerCode.trim(),
      salespersonCode: form.salespersonCode.trim(),
      eventCode: form.eventCode?.trim() || undefined,
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
      const outstandingAmount = this.invoiceService.calculateOutstandingAmount(
        totalAmount,
        paidAmount,
        invoice.outstandingAmount
      );

      return {
        id: invoice.id || invoice.invoiceNumber || '',
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceDate: invoice.invoiceDate,
        totalAmount,
        paidAmount,
        outstandingAmount,
        paymentStatus: this.invoiceService.calculatePaymentStatus(
          totalAmount,
          paidAmount,
          outstandingAmount,
          invoice.paymentStatus
        ),
        invoiceStatus: invoice.invoiceStatus || '',
        currencyCode: invoice.currencyCode || ''
      };
    });
  }

  public getInvoiceSummaryFromRelatedInvoices(
    relatedInvoices: readonly ISalesOrderRelatedInvoice[]
  ): ISalesOrderInvoiceSummary {
    return this.mapInvoiceSummaryApiToUiModel(undefined, relatedInvoices);
  }

  private buildQueryParams(
    filters: ISalesOrderFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): QueryParams {
    return {
      searchText: filters.searchText,
      customerCode: filters.customerCode,
      salespersonCode: filters.salespersonCode,
      eventCode: filters.eventCode,
      status: filters.status,
      orderDateFrom: filters.orderDateFrom,
      orderDateTo: filters.orderDateTo,
      pageNumber: pagination?.pageNumber,
      pageSize: pagination?.pageSize,
      sortField: sorting?.fieldName,
      sortDirection: sorting?.direction
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
    return {
      lineNumber: api.lineNumber || '',
      itemCode: api.itemCode || '',
      description: api.description || '',
      quantity: api.quantity || 0,
      unitPrice: api.unitPrice || 0,
      lineAmount: api.lineAmount || 0,
      taxAmount: api.taxAmount !== undefined ? api.taxAmount : api.tax,
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

    return {
      invoiceCount: relatedInvoices.length,
      outstandingInvoiceCount: relatedInvoices.filter(invoice => (invoice.outstandingAmount || 0) > 0).length,
      totalInvoicedAmount: relatedInvoices.reduce((total, invoice) => total + invoice.totalAmount, 0),
      totalPaidAmount: relatedInvoices.reduce((total, invoice) => total + (invoice.paidAmount || 0), 0),
      totalOutstandingAmount: relatedInvoices.reduce((total, invoice) => total + (invoice.outstandingAmount || 0), 0)
    };
  }
}
