import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { mefriendFields, mefriendListTitles } from '../../config/sharePointConfig';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';
import type { ISalesOrderCreateFormState, ISalesOrderLineItem } from '../../models/salesOrders';
import type {
  IRequestListFilter,
  ISalesOrderRequest,
  ISalesOrderRequestLine,
  RequestStatus
} from '../../models/requests';
import { SharePointRestClient } from './sharePointRestClient';

interface ISalesOrderRequestListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  RequestNumber?: string;
  ApprovalStatus?: string;
  WorkflowId?: number;
  Workflow?: { Title?: string };
  CurrentLevel?: number;
  ApprovalCycle?: number;
  SubmittedById?: number;
  SubmittedBy?: { Title?: string; Email?: string; EMail?: string };
  SubmittedOn?: string;
  LastActionById?: number;
  LastActionBy?: { Title?: string; Email?: string; EMail?: string };
  LastActionOn?: string;
  RejectionReason?: string;
  BCPostingStatus?: string;
  BCSalesOrderNumber?: string;
  BCSystemId?: string;
  BCPostedOn?: string;
  BCErrorMessage?: string;
  SellToCustomerCode?: string;
  SellToCustomerName?: string;
  BillToCustomerCode?: string;
  BillToCustomerName?: string;
  SalespersonCode?: string;
  SalespersonName?: string;
  EventCode?: string;
  EventName?: string;
  CountryCode?: string;
  StateCode?: string;
  OrderDate?: string;
  PostingDate?: string;
  ExternalDocumentNumber?: string;
  Remarks?: string;
  CurrencyCode?: string;
  InvoiceDiscountAmountExclVat?: number;
  InvoiceDiscountPercent?: number;
  GrossAmount?: number;
  TotalLineDiscount?: number;
  NetAmount?: number;
  LineCount?: number;
}

interface ISalesOrderRequestLineListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  SalesOrderRequestId?: number;
  RequestNumber?: string;
  LineNumber?: number;
  ItemCode?: string;
  Description?: string;
  Quantity?: number;
  Rate?: number;
  LineDiscountPercentage?: number;
  LineAmount?: number;
  NetLineAmount?: number;
  ProductDimensionCode?: string;
  UnitOfMeasureCode?: string;
  IsActive?: boolean;
}

export interface ISalesOrderRequestServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}

export interface ISalesOrderRequestHeaderSnapshot {
  form: ISalesOrderCreateFormState;
  sellToCustomerName: string;
  billToCustomerName: string;
  salespersonName: string;
  eventName: string;
  grossAmount: number;
  totalLineDiscount: number;
  netAmount: number;
  lineCount: number;
}

export interface ICreateSalesOrderRequestInput {
  snapshot: ISalesOrderRequestHeaderSnapshot;
  workflowId: number;
  submittedById: number;
}

export interface ISalesOrderRequestLineSnapshot {
  item: ISalesOrderLineItem;
  lineNumber: number;
  requestNumber: string;
  requestHeaderId: number;
  description: string;
  productDimensionCode: string;
  unitOfMeasureCode: string;
}

const salesOrderRequestSelect = [
  'Id',
  'ID',
  'Title',
  'RequestNumber',
  'ApprovalStatus',
  'WorkflowId',
  'Workflow/Title',
  'CurrentLevel',
  'ApprovalCycle',
  'SubmittedById',
  'SubmittedBy/Title',
  'SubmittedBy/EMail',
  'SubmittedOn',
  'LastActionById',
  'LastActionBy/Title',
  'LastActionBy/EMail',
  'LastActionOn',
  'RejectionReason',
  'BCPostingStatus',
  'BCSalesOrderNumber',
  'BCSystemId',
  'BCPostedOn',
  'BCErrorMessage',
  'SellToCustomerCode',
  'SellToCustomerName',
  'BillToCustomerCode',
  'BillToCustomerName',
  'SalespersonCode',
  'SalespersonName',
  'EventCode',
  'EventName',
  'CountryCode',
  'StateCode',
  'OrderDate',
  'PostingDate',
  'ExternalDocumentNumber',
  'Remarks',
  'CurrencyCode',
  'InvoiceDiscountAmountExclVat',
  'InvoiceDiscountPercent',
  'GrossAmount',
  'TotalLineDiscount',
  'NetAmount',
  'LineCount'
];

const salesOrderRequestLineSelect = [
  'Id',
  'ID',
  'Title',
  'SalesOrderRequestId',
  'RequestNumber',
  'LineNumber',
  'ItemCode',
  'Description',
  'Quantity',
  'Rate',
  'LineDiscountPercentage',
  'LineAmount',
  'NetLineAmount',
  'ProductDimensionCode',
  'UnitOfMeasureCode',
  'IsActive'
];

const padRequestId = (id: number): string => {
  const text = id.toString();
  return `${'000000'.substr(text.length)}${text}`;
};
const toNumber = (value: number | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

export class SalesOrderRequestService {
  private readonly restClient: SharePointRestClient;

  public constructor(options: ISalesOrderRequestServiceOptions) {
    this.restClient = new SharePointRestClient(options);
  }

  public getRequestNumber(id: number): string {
    return `SO-REQ-${padRequestId(id)}`;
  }

  public async createRequestHeader(input: ICreateSalesOrderRequestInput): Promise<ISalesOrderRequest> {
    const form = input.snapshot.form;
    const billToCustomerCode = form.billToCustomerCode || form.customerCode;
    const payload = {
      [mefriendFields.salesOrderRequests.title]: 'Sales order request',
      [mefriendFields.salesOrderRequests.requestNumber]: '',
      [mefriendFields.salesOrderRequests.approvalStatus]: 'Pending Approval',
      [mefriendFields.salesOrderRequests.workflowId]: input.workflowId,
      [mefriendFields.salesOrderRequests.currentLevel]: 1,
      [mefriendFields.salesOrderRequests.approvalCycle]: 1,
      [mefriendFields.salesOrderRequests.submittedById]: input.submittedById,
      [mefriendFields.salesOrderRequests.submittedOn]: new Date().toISOString(),
      [mefriendFields.salesOrderRequests.rejectionReason]: '',
      [mefriendFields.salesOrderRequests.bcPostingStatus]: 'Not Ready',
      [mefriendFields.salesOrderRequests.bcSalesOrderNumber]: '',
      [mefriendFields.salesOrderRequests.bcSystemId]: '',
      [mefriendFields.salesOrderRequests.bcErrorMessage]: '',
      [mefriendFields.salesOrderRequests.sellToCustomerCode]: form.customerCode,
      [mefriendFields.salesOrderRequests.sellToCustomerName]: input.snapshot.sellToCustomerName,
      [mefriendFields.salesOrderRequests.billToCustomerCode]: billToCustomerCode,
      [mefriendFields.salesOrderRequests.billToCustomerName]: input.snapshot.billToCustomerName,
      [mefriendFields.salesOrderRequests.salespersonCode]: form.salespersonCode,
      [mefriendFields.salesOrderRequests.salespersonName]: input.snapshot.salespersonName,
      [mefriendFields.salesOrderRequests.eventCode]: form.eventCode || '',
      [mefriendFields.salesOrderRequests.eventName]: input.snapshot.eventName,
      [mefriendFields.salesOrderRequests.countryCode]: form.countryCode || '',
      [mefriendFields.salesOrderRequests.stateCode]: form.stateCode || '',
      [mefriendFields.salesOrderRequests.orderDate]: form.orderDate || null,
      [mefriendFields.salesOrderRequests.postingDate]: form.postingDate || null,
      [mefriendFields.salesOrderRequests.externalDocumentNumber]: form.externalDocumentNumber || '',
      [mefriendFields.salesOrderRequests.remarks]: form.remarks || '',
      [mefriendFields.salesOrderRequests.currencyCode]: form.currencyCode || '',
      [mefriendFields.salesOrderRequests.invoiceDiscountAmountExclVat]: toNumber(form.invoiceDiscountAmountExclVat),
      [mefriendFields.salesOrderRequests.invoiceDiscountPercent]: toNumber(form.invoiceDiscountPercent),
      [mefriendFields.salesOrderRequests.grossAmount]: input.snapshot.grossAmount,
      [mefriendFields.salesOrderRequests.totalLineDiscount]: input.snapshot.totalLineDiscount,
      [mefriendFields.salesOrderRequests.netAmount]: input.snapshot.netAmount,
      [mefriendFields.salesOrderRequests.lineCount]: input.snapshot.lineCount
    };

    const created = await this.restClient.createItem<typeof payload, ISalesOrderRequestListItem>(
      mefriendListTitles.salesOrderRequests,
      payload
    );

    return this.mapRequest(created);
  }

  public async updateRequestNumber(id: number): Promise<ISalesOrderRequest> {
    const requestNumber = this.getRequestNumber(id);
    await this.restClient.updateItem(mefriendListTitles.salesOrderRequests, id, {
      [mefriendFields.salesOrderRequests.title]: requestNumber,
      [mefriendFields.salesOrderRequests.requestNumber]: requestNumber
    });

    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error(`Sales order request ${requestNumber} could not be loaded after creation.`);
    }

    return request;
  }

  public async createRequestLine(snapshot: ISalesOrderRequestLineSnapshot): Promise<ISalesOrderRequestLine> {
    const grossLineAmount = toNumber(snapshot.item.quantity) * toNumber(snapshot.item.unitPrice);
    const netLineAmount = toNumber(snapshot.item.lineAmount);
    const payload = {
      [mefriendFields.salesOrderRequestLines.title]: `${snapshot.requestNumber}-${snapshot.lineNumber}`,
      [mefriendFields.salesOrderRequestLines.salesOrderRequestId]: snapshot.requestHeaderId,
      [mefriendFields.salesOrderRequestLines.requestNumber]: snapshot.requestNumber,
      [mefriendFields.salesOrderRequestLines.lineNumber]: snapshot.lineNumber,
      [mefriendFields.salesOrderRequestLines.itemCode]: snapshot.item.itemCode,
      [mefriendFields.salesOrderRequestLines.description]: snapshot.description || snapshot.item.description || '',
      [mefriendFields.salesOrderRequestLines.quantity]: toNumber(snapshot.item.quantity),
      [mefriendFields.salesOrderRequestLines.rate]: toNumber(snapshot.item.unitPrice),
      [mefriendFields.salesOrderRequestLines.lineDiscountPercentage]: toNumber(snapshot.item.lineDiscountPercentage),
      [mefriendFields.salesOrderRequestLines.lineAmount]: grossLineAmount,
      [mefriendFields.salesOrderRequestLines.netLineAmount]: netLineAmount,
      [mefriendFields.salesOrderRequestLines.productDimensionCode]: snapshot.productDimensionCode,
      [mefriendFields.salesOrderRequestLines.unitOfMeasureCode]: snapshot.unitOfMeasureCode,
      [mefriendFields.salesOrderRequestLines.isActive]: true
    };

    const created = await this.restClient.createItem<typeof payload, ISalesOrderRequestLineListItem>(
      mefriendListTitles.salesOrderRequestLines,
      payload
    );

    return this.mapLine(created);
  }

  public async deleteRequestLine(id: number): Promise<void> {
    await this.restClient.deleteItem(mefriendListTitles.salesOrderRequestLines, id);
  }

  public async cancelRequest(id: number, reason: string): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.salesOrderRequests, id, {
      [mefriendFields.salesOrderRequests.approvalStatus]: 'Cancelled',
      [mefriendFields.salesOrderRequests.rejectionReason]: reason,
      [mefriendFields.salesOrderRequests.bcErrorMessage]: reason
    });
  }

  public async getRequests(
    filters: IRequestListFilter = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ISalesOrderRequest>> {
    const items = await this.restClient.readItems<ISalesOrderRequestListItem>(mefriendListTitles.salesOrderRequests, {
      select: salesOrderRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      orderBy: 'SubmittedOn desc'
    });
    return this.toPagedResult(items.map(this.mapRequest), filters, pagination, sorting);
  }

  public async getRequestById(id: number): Promise<ISalesOrderRequest | undefined> {
    const items = await this.restClient.readItems<ISalesOrderRequestListItem>(mefriendListTitles.salesOrderRequests, {
      select: salesOrderRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      filter: `Id eq ${id}`,
      top: 1
    });

    return items.length ? this.mapRequest(items[0]) : undefined;
  }

  public async getRequestByNumber(requestNumber: string): Promise<ISalesOrderRequest | undefined> {
    const escapedRequestNumber = this.restClient.escapeODataString(requestNumber);
    const items = await this.restClient.readItems<ISalesOrderRequestListItem>(mefriendListTitles.salesOrderRequests, {
      select: salesOrderRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      filter: `RequestNumber eq '${escapedRequestNumber}'`,
      top: 1
    });

    return items.length ? this.mapRequest(items[0]) : undefined;
  }

  public async getRequestLines(requestId: number): Promise<readonly ISalesOrderRequestLine[]> {
    const items = await this.restClient.readItems<ISalesOrderRequestLineListItem>(mefriendListTitles.salesOrderRequestLines, {
      select: salesOrderRequestLineSelect,
      filter: `SalesOrderRequestId eq ${requestId}`,
      orderBy: 'LineNumber asc'
    });

    return items.map(this.mapLine);
  }

  private toPagedResult(
    items: readonly ISalesOrderRequest[],
    filters: IRequestListFilter,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ISalesOrderRequest> {
    const filteredItems = this.filterRequests(items, filters);
    const sortedItems = this.sortRequests(filteredItems, sorting);
    const pageSize = Math.max(1, pagination?.pageSize || 10);
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
    const pageNumber = Math.min(Math.max(1, pagination?.pageNumber || 1), totalPages);
    const startIndex = (pageNumber - 1) * pageSize;

    return {
      items: sortedItems.slice(startIndex, startIndex + pageSize),
      pageNumber,
      pageSize,
      totalCount: sortedItems.length,
      totalPages
    };
  }

  private filterRequests(items: readonly ISalesOrderRequest[], filters: IRequestListFilter): readonly ISalesOrderRequest[] {
    const searchText = this.normalize(filters.searchText);
    return items.filter(item => {
      if (filters.approvalStatus && item.approvalStatus !== filters.approvalStatus) {
        return false;
      }
      if (filters.bcPostingStatus && item.bcPostingStatus !== filters.bcPostingStatus) {
        return false;
      }
      if (!searchText) {
        return true;
      }

      return [
        item.requestNumber,
        item.sellToCustomerCode,
        item.sellToCustomerName,
        item.salespersonName,
        item.eventName,
        item.externalDocumentNumber,
        item.submittedByTitle,
        item.bcSalesOrderNumber
      ].some(value => this.normalize(value).indexOf(searchText) !== -1);
    });
  }

  private sortRequests(items: readonly ISalesOrderRequest[], sorting?: ISortState): readonly ISalesOrderRequest[] {
    if (!sorting) {
      return items;
    }

    const multiplier = sorting.direction === 'desc' ? -1 : 1;
    return items.slice().sort((left, right) => {
      const leftValue = this.normalize((left as unknown as Record<string, unknown>)[sorting.fieldName]);
      const rightValue = this.normalize((right as unknown as Record<string, unknown>)[sorting.fieldName]);

      if (leftValue < rightValue) {
        return -1 * multiplier;
      }
      if (leftValue > rightValue) {
        return multiplier;
      }
      return 0;
    });
  }

  private normalize(value: unknown): string {
    return value === undefined || value === null ? '' : String(value).trim().toLowerCase();
  }

  private mapRequest(item: ISalesOrderRequestListItem): ISalesOrderRequest {
    return {
      id: item.Id || item.ID || 0,
      title: item.Title || '',
      requestNumber: item.RequestNumber || '',
      approvalStatus: (item.ApprovalStatus || 'Draft') as RequestStatus,
      workflowId: item.WorkflowId || 0,
      workflowTitle: item.Workflow ? item.Workflow.Title : undefined,
      currentLevel: item.CurrentLevel || 1,
      approvalCycle: item.ApprovalCycle || 1,
      submittedById: item.SubmittedById,
      submittedByTitle: item.SubmittedBy ? item.SubmittedBy.Title : undefined,
      submittedByEmail: item.SubmittedBy ? item.SubmittedBy.EMail || item.SubmittedBy.Email : undefined,
      submittedOn: item.SubmittedOn,
      lastActionById: item.LastActionById,
      lastActionByTitle: item.LastActionBy ? item.LastActionBy.Title : undefined,
      lastActionByEmail: item.LastActionBy ? item.LastActionBy.EMail || item.LastActionBy.Email : undefined,
      lastActionOn: item.LastActionOn,
      rejectionReason: item.RejectionReason || '',
      bcPostingStatus: (item.BCPostingStatus || 'Not Ready') as ISalesOrderRequest['bcPostingStatus'],
      bcSalesOrderNumber: item.BCSalesOrderNumber || '',
      bcSystemId: item.BCSystemId || '',
      bcPostedOn: item.BCPostedOn,
      bcErrorMessage: item.BCErrorMessage || '',
      sellToCustomerCode: item.SellToCustomerCode || '',
      sellToCustomerName: item.SellToCustomerName || '',
      billToCustomerCode: item.BillToCustomerCode || '',
      billToCustomerName: item.BillToCustomerName || '',
      salespersonCode: item.SalespersonCode || '',
      salespersonName: item.SalespersonName || '',
      eventCode: item.EventCode || '',
      eventName: item.EventName || '',
      countryCode: item.CountryCode || '',
      stateCode: item.StateCode || '',
      orderDate: item.OrderDate,
      postingDate: item.PostingDate,
      externalDocumentNumber: item.ExternalDocumentNumber || '',
      remarks: item.Remarks || '',
      currencyCode: item.CurrencyCode || '',
      invoiceDiscountAmountExclVat: toNumber(item.InvoiceDiscountAmountExclVat),
      invoiceDiscountPercent: toNumber(item.InvoiceDiscountPercent),
      grossAmount: toNumber(item.GrossAmount),
      totalLineDiscount: toNumber(item.TotalLineDiscount),
      netAmount: toNumber(item.NetAmount),
      lineCount: toNumber(item.LineCount)
    };
  }

  private mapLine(item: ISalesOrderRequestLineListItem): ISalesOrderRequestLine {
    return {
      id: item.Id || item.ID || 0,
      title: item.Title || '',
      salesOrderRequestId: item.SalesOrderRequestId || 0,
      requestNumber: item.RequestNumber || '',
      lineNumber: item.LineNumber || 0,
      itemCode: item.ItemCode || '',
      description: item.Description || '',
      quantity: toNumber(item.Quantity),
      rate: toNumber(item.Rate),
      lineDiscountPercentage: toNumber(item.LineDiscountPercentage),
      lineAmount: toNumber(item.LineAmount),
      netLineAmount: toNumber(item.NetLineAmount),
      productDimensionCode: item.ProductDimensionCode || '',
      unitOfMeasureCode: item.UnitOfMeasureCode || '',
      isActive: item.IsActive !== false
    };
  }
}
