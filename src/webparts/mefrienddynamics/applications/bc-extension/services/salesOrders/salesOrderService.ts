import type { ApiClient } from '../../../../shared/api/apiClient';
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
import { DEFAULT_SERVER_PAGE_SIZE, type ICursorPaginationState, type IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import type { IAppUser } from '../../models/settings/IAppAccessModels';
import {
  calculateOutstandingAmount,
  calculatePaymentStatus,
  summarizeRelatedInvoices
} from '../../utils/financialUtils';
import { normalizeBusinessDate } from '../../../../shared/utilities/formatUtils';
import {
  filterByCurrentSalesperson,
  getCurrentSalespersonCode,
  normalizeSalespersonCode
} from '../../utils/salespersonDataScope';
import { buildServerPageQuery } from '../../../../shared/utilities/serverPagination';

interface ISalesOrderApiModel {
  '@odata.etag'?: string;
  id?: string;
  Id?: string;
  no?: string;
  salesOrderNumber?: string;
  DocumentType?: string;
  documentType?: string;
  documentDate?: string;
  postingDescription?: string;
  sellToCustomerNo?: string;
  sellToCustomerName?: string;
  customerName2?: string;
  sellToAddress?: string;
  sellToAddress2?: string;
  sellToCity?: string;
  sellToCounty?: string;
  sellToPostCode?: string;
  sellToCountryRegionCode?: string;
  sellToPhoneNo?: string;
  sellToEMail?: string;
  sellToEmail?: string;
  sellToContact?: string;
  customerNo?: string;
  customerName?: string;
  clientNo?: string;
  clientName?: string;
  customerCode?: string;
  salesperson?: string | number;
  salesPerson?: string | number;
  salespersonCode?: string | number;
  salesPersonCode?: string | number;
  SalespersonCode?: string | number;
  salespersonName?: string;
  salesPersonName?: string;
  eventCode?: string;
  eventName?: string;
  postingDate?: string;
  orderDate?: string;
  dueDate?: string;
  requestedDeliveryDate?: string;
  promisedDeliveryDate?: string;
  externalDocumentNo?: string;
  externalDocumentNumber?: string;
  yourReference?: string;
  status?: string;
  amount?: number;
  amountIncludingVAT?: number;
  amountLCY?: number;
  amountIncludingVATLCY?: number;
  totalAmount?: number;
  currencyCode?: string;
  pricesIncludingVAT?: boolean;
  paymentTermsCode?: string;
  paymentMethodCode?: string;
  invoiceDiscountAmountExclVat?: number;
  invoiceDiscountAmountExclVAT?: number;
  invoiceDiscountAmount?: number;
  invoiceDiscountPercent?: number;
  invoiceDiscountPercentage?: number;
  paymentDiscountPercent?: number;
  prepaymentPercent?: number;
  responsibilityCenter?: string;
  assignedUserID?: string;
  shortcutDimension1Code?: string;
  shortcutDimension2Code?: string;
  locationCode?: string;
  shipmentDate?: string;
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
  lineDiscountPercentage?: number;
  lineDiscountPercent?: number;
  lineDiscountPct?: number;
  lineAmount?: number;
  amountLCY?: number;
  amountIncludingVAT?: number;
  amountIncludingVATLCY?: number;
  outstandingQuantity?: number;
  outstandingAmountLCY?: number;
  qtyToShip?: number;
  quantityShipped?: number;
  qtyToInvoice?: number;
  quantityInvoiced?: number;
  unitOfMeasureCode?: string;
  shipmentDate?: string;
  plannedShipmentDate?: string;
  plannedDeliveryDate?: string;
  requestedDeliveryDate?: string;
  promisedDeliveryDate?: string;
  taxAmount?: number;
  tax?: number;
  lineStatus?: string;
}

interface ISalesOrderRelatedInvoiceApiModel {
  no?: string;
  invoiceNo?: string;
  id?: string;
  invoiceNumber?: string;
  salespersonCode?: string | number;
  salesPersonCode?: string | number;
  SalespersonCode?: string | number;
  salesPerson?: string | number;
  salesperson?: string | number;
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

interface ISalesOrderPostResponseApiModel extends ISalesOrderApiModel {
  base64?: string;
}

type SalesOrderListApiResponse = IServerPagedResult<ISalesOrderApiModel>;
type SalesInvoiceListApiResponse = IServerPagedResult<ISalesOrderRelatedInvoiceApiModel>;

export class SalesOrderService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getSalesOrders(
    filters: ISalesOrderFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState,
    currentUser?: IAppUser
  ): Promise<IServerPagedResult<ISalesOrderListItem>> {
    const mandatorySalespersonCode = getCurrentSalespersonCode(currentUser);
    const selectedSalespersonCode = normalizeSalespersonCode(filters.salespersonCode) || undefined;
    const salespersonCode = mandatorySalespersonCode || selectedSalespersonCode;
    const effectiveFilters = mandatorySalespersonCode
      ? { ...filters, salespersonCode: mandatorySalespersonCode }
      : filters;
    const response = await this.apiClient.get<SalesOrderListApiResponse>('/api/SalesOrders', buildServerPageQuery({
      searchText: filters.searchText,
      customerCode: filters.customerCode,
      salesperson: salespersonCode,
      eventCode: filters.eventCode,
      status: filters.status,
      orderDateFrom: filters.orderDateFrom,
      orderDateTo: filters.orderDateTo
    }, pagination, sorting));

    return this.mapPagedResult(response.data, pagination.pageSize, effectiveFilters, sorting, currentUser);
  }

  public async getSalesOrderById(id: string, currentUser?: IAppUser): Promise<ISalesOrderDetail> {
    const salespersonCode = getCurrentSalespersonCode(currentUser);
    const response = await this.apiClient.get<ISalesOrderApiModel>(`/api/SalesOrders/${encodeURIComponent(id)}`, {
      salesperson: salespersonCode
    });
    const scopedSalesOrder = response.data
      ? filterByCurrentSalesperson([this.mapSalesOrderApiToUiModel(response.data)], currentUser)[0]
      : undefined;

    if (!scopedSalesOrder) {
      throw new Error(`Sales order ${id} was not found.`);
    }

    const scopedRelatedInvoices = filterByCurrentSalesperson(scopedSalesOrder.relatedInvoices, currentUser);

    return {
      ...scopedSalesOrder,
      relatedInvoices: scopedRelatedInvoices,
      invoiceSummary: this.getInvoiceSummaryFromRelatedInvoices(scopedRelatedInvoices)
    };
  }

  public async postSalesOrderToBusinessCentral(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    const request = this.mapSalesOrderFormToApiRequest(payload);
    const response = await this.apiClient.post<ISalesOrderCreateRequest, ISalesOrderPostResponseApiModel>(
      '/api/SalesOrders',
      request
    );

    return this.mapSalesOrderPostResponseToUiModel(response.data, request);
  }

  public async createSalesOrder(payload: ISalesOrderCreateFormState): Promise<ISalesOrderDetail> {
    return this.postSalesOrderToBusinessCentral(payload);
  }

  public async getInvoicesForSalesOrder(
    salesOrderId: string,
    currentUser?: IAppUser
  ): Promise<readonly ISalesOrderRelatedInvoice[]> {
    const salespersonCode = getCurrentSalespersonCode(currentUser);
    const response = await this.apiClient.get<SalesInvoiceListApiResponse>('/api/SalesInvoices', {
      salesOrderNumber: salesOrderId,
      salesPerson: salespersonCode,
      pageSize: DEFAULT_SERVER_PAGE_SIZE
    });
    const invoices = response.data?.items || [];

    return filterByCurrentSalesperson(this.mapRelatedInvoicesApiToUiModel(invoices), currentUser);
  }

  public mapSalesOrderApiToUiModel(api?: ISalesOrderApiModel): ISalesOrderDetail {
    const relatedInvoices = this.mapRelatedInvoicesApiToUiModel(api?.relatedInvoices || []);
    const salesOrderNumber = api?.salesOrderNumber || api?.no || '';
    const customerCode = api?.customerCode || api?.sellToCustomerNo || api?.customerNo || '';
    const customerName = api?.customerName || api?.sellToCustomerName || '';
    const lines = api?.SalesOrderLines || api?.lines || [];
    const rawSalespersonCode = api?.salespersonCode ?? api?.salesPersonCode ?? api?.SalespersonCode ??
      api?.salesperson ?? api?.salesPerson;
    const salespersonCode = rawSalespersonCode === undefined || rawSalespersonCode === null
      ? ''
      : String(rawSalespersonCode).trim();
    const invoiceDiscountAmountExclVat = this.toOptionalNumber(
      api?.invoiceDiscountAmountExclVat,
      this.toOptionalNumber(api?.invoiceDiscountAmountExclVAT, api?.invoiceDiscountAmount)
    );
    const invoiceDiscountPercent = this.toOptionalNumber(api?.invoiceDiscountPercent, api?.invoiceDiscountPercentage);
    const totalAmount = this.toNumber(api?.amount, this.toNumber(api?.totalAmount, this.sumLineAmount(lines, 'lineAmount') - this.toNumber(invoiceDiscountAmountExclVat, 0)));
    const amountIncludingVAT = this.toNumber(api?.amountIncludingVAT, this.sumLineAmount(lines, 'amountIncludingVAT'));

    return {
      id: api?.id || api?.Id || salesOrderNumber,
      salesOrderNumber,
      documentType: api?.documentType || api?.DocumentType || '',
      documentDate: normalizeBusinessDate(api?.documentDate),
      postingDescription: api?.postingDescription || '',
      customerCode,
      customerName,
      customerName2: api?.customerName2 || '',
      clientCode: api?.clientNo || '',
      clientName: api?.clientName || '',
      salespersonCode,
      salespersonName: api?.salespersonName || api?.salesPersonName || '',
      eventCode: api?.eventCode || '',
      eventName: api?.eventName || '',
      postingDate: normalizeBusinessDate(api?.postingDate),
      orderDate: normalizeBusinessDate(api?.orderDate || api?.documentDate),
      dueDate: normalizeBusinessDate(api?.dueDate),
      shipmentDate: normalizeBusinessDate(api?.shipmentDate),
      requestedDeliveryDate: this.toBusinessDate(api?.requestedDeliveryDate),
      promisedDeliveryDate: this.toBusinessDate(api?.promisedDeliveryDate),
      externalDocumentNumber: api?.externalDocumentNumber || api?.externalDocumentNo || '',
      yourReference: api?.yourReference || '',
      status: api?.status || 'Unknown',
      totalAmount,
      amountIncludingVAT,
      amountLCY: this.toOptionalNumber(api?.amountLCY, totalAmount),
      amountIncludingVATLCY: this.toOptionalNumber(api?.amountIncludingVATLCY, amountIncludingVAT),
      outstandingQuantity: this.sumLineAmount(lines, 'outstandingQuantity'),
      outstandingAmountLCY: this.sumLineAmount(lines, 'outstandingAmountLCY'),
      quantityToShip: this.sumLineAmount(lines, 'qtyToShip'),
      quantityShipped: this.sumLineAmount(lines, 'quantityShipped'),
      quantityToInvoice: this.sumLineAmount(lines, 'qtyToInvoice'),
      quantityInvoiced: this.sumLineAmount(lines, 'quantityInvoiced'),
      currencyCode: api?.currencyCode || '',
      pricesIncludingVAT: api?.pricesIncludingVAT,
      paymentTermsCode: api?.paymentTermsCode || '',
      paymentMethodCode: api?.paymentMethodCode || '',
      invoiceDiscountAmountExclVat,
      invoiceDiscountPercent,
      paymentDiscountPercent: this.toOptionalNumber(api?.paymentDiscountPercent),
      prepaymentPercent: this.toOptionalNumber(api?.prepaymentPercent),
      responsibilityCenter: api?.responsibilityCenter || '',
      assignedUserID: api?.assignedUserID || '',
      shortcutDimension1Code: api?.shortcutDimension1Code || '',
      shortcutDimension2Code: api?.shortcutDimension2Code || '',
      locationCode: api?.locationCode || '',
      shippingAdvice: api?.shippingAdvice || '',
      completelyShipped: api?.completelyShipped,
      shipToName: api?.shipToName || '',
      shipToAddress: api?.shipToAddress || '',
      shipToAddress2: api?.shipToAddress2 || '',
      shipToCity: api?.shipToCity || '',
      shipToCounty: api?.shipToCounty || '',
      shipToPostCode: api?.shipToPostCode || '',
      shipToCountryRegionCode: api?.shipToCountryRegionCode || '',
      shipToContact: api?.shipToContact || '',
      billToName: api?.billToName || '',
      billToAddress: api?.billToAddress || '',
      billToAddress2: api?.billToAddress2 || '',
      billToCity: api?.billToCity || '',
      billToCounty: api?.billToCounty || '',
      billToPostCode: api?.billToPostCode || '',
      billToCountryRegionCode: api?.billToCountryRegionCode || '',
      billToContactNo: api?.billToContactNo || '',
      billToContact: api?.billToContact || '',
      sellToAddress: api?.sellToAddress || '',
      sellToAddress2: api?.sellToAddress2 || '',
      sellToCity: api?.sellToCity || '',
      sellToCounty: api?.sellToCounty || '',
      sellToPostCode: api?.sellToPostCode || '',
      sellToCountryRegionCode: api?.sellToCountryRegionCode || '',
      sellToPhoneNo: api?.sellToPhoneNo || '',
      sellToEmail: api?.sellToEmail || api?.sellToEMail || '',
      sellToContact: api?.sellToContact || '',
      lines: lines.map(line => this.mapSalesOrderLineApiToUiModel(line)),
      relatedInvoices,
      invoiceSummary: this.mapInvoiceSummaryApiToUiModel(api?.invoiceSummary, relatedInvoices)
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
          ? [
              {
                dimensionCode: 'PRODUCT',
                dimensionValueCode: productDimensionValue
              }
            ]
          : undefined
      }))
    };
  }

  public mapSalesOrderPostResponseToUiModel(
    api: ISalesOrderPostResponseApiModel | undefined,
    request: ISalesOrderCreateRequest
  ): ISalesOrderDetail {
    const decodedSalesOrder = this.tryDecodeSalesOrderPostResponse(api?.base64 || undefined);
    const mappedSalesOrder = this.mapSalesOrderApiToUiModel(decodedSalesOrder || api);

    if (
      mappedSalesOrder.id ||
      mappedSalesOrder.salesOrderNumber ||
      mappedSalesOrder.customerCode ||
      mappedSalesOrder.lines.length > 0
    ) {
      return mappedSalesOrder;
    }

    return this.mapSalesOrderCreateRequestToUiModel(request);
  }

  public mapRelatedInvoicesApiToUiModel(
    api: readonly ISalesOrderRelatedInvoiceApiModel[]
  ): readonly ISalesOrderRelatedInvoice[] {
    return api.map(invoice => {
      const totalAmount = invoice.totalAmount || 0;
      const paidAmount = invoice.paidAmount || 0;
      const outstandingAmount = calculateOutstandingAmount(totalAmount, paidAmount, invoice.outstandingAmount);
      const invoiceNumber = invoice.invoiceNumber || invoice.invoiceNo || invoice.no || '';
      const rawSalespersonCode = invoice.salespersonCode ?? invoice.salesPersonCode ?? invoice.SalespersonCode ??
        invoice.salesPerson ?? invoice.salesperson;
      const salespersonCode = rawSalespersonCode === undefined || rawSalespersonCode === null
        ? ''
        : String(rawSalespersonCode).trim();

      return {
        id: invoice.id || invoiceNumber,
        invoiceNumber,
        salespersonCode,
        invoiceDate: normalizeBusinessDate(invoice.invoiceDate || invoice.postingDate),
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

  private mapPagedResult(
    api: SalesOrderListApiResponse | undefined,
    requestedPageSize: number,
    filters: ISalesOrderFilters,
    sorting: ISortState | undefined,
    currentUser: IAppUser | undefined
  ): IServerPagedResult<ISalesOrderListItem> {
    const mappedItems = (api?.items || []).map(item => this.mapSalesOrderApiToUiModel(item));
    const scopedItems = filterByCurrentSalesperson(mappedItems, currentUser);
    const filteredItems = this.filterSalesOrders(scopedItems, filters);
    const sortedItems = this.sortSalesOrders(filteredItems, sorting);

    return {
      items: sortedItems,
      pageSize: api?.pageSize || requestedPageSize,
      hasNext: Boolean(api?.hasNext),
      nextToken: api?.nextToken
    };
  }

  private filterSalesOrders(
    items: readonly ISalesOrderListItem[],
    filters: ISalesOrderFilters
  ): readonly ISalesOrderListItem[] {
    const searchText = (filters.searchText || '').trim().toLowerCase();
    const customerCode = (filters.customerCode || '').trim().toLowerCase();
    const salespersonCode = normalizeSalespersonCode(filters.salespersonCode);
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

      if (salespersonCode && normalizeSalespersonCode(item.salespersonCode) !== salespersonCode) {
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
      case 'invoiceDiscountAmountExclVat':
        return item.invoiceDiscountAmountExclVat;
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
      lineDiscountPercentage: this.toOptionalNumber(
        api.lineDiscountPercentage,
        this.toOptionalNumber(api.lineDiscountPercent, api.lineDiscountPct)
      ),
      unitPriceExcludingTax: this.toOptionalNumber(api.unitpriceexclTax),
      lineAmount: this.toNumber(api.lineAmount, 0),
      amountIncludingVAT: this.toOptionalNumber(api.amountIncludingVAT, this.toOptionalNumber(api.amountIncludingVATLCY)),
      amountLCY: this.toOptionalNumber(api.amountLCY),
      amountIncludingVATLCY: this.toOptionalNumber(api.amountIncludingVATLCY),
      outstandingQuantity: this.toOptionalNumber(api.outstandingQuantity),
      outstandingAmountLCY: this.toOptionalNumber(api.outstandingAmountLCY),
      quantityShipped: this.toOptionalNumber(api.quantityShipped),
      quantityInvoiced: this.toOptionalNumber(api.quantityInvoiced),
      quantityToShip: this.toOptionalNumber(api.qtyToShip),
      quantityToInvoice: this.toOptionalNumber(api.qtyToInvoice),
      unitOfMeasureCode: api.unitOfMeasureCode || '',
      shipmentDate: normalizeBusinessDate(api.shipmentDate),
      plannedShipmentDate: normalizeBusinessDate(api.plannedShipmentDate),
      plannedDeliveryDate: normalizeBusinessDate(api.plannedDeliveryDate),
      requestedDeliveryDate: this.toBusinessDate(api.requestedDeliveryDate),
      promisedDeliveryDate: this.toBusinessDate(api.promisedDeliveryDate),
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

  private mapSalesOrderCreateRequestToUiModel(request: ISalesOrderCreateRequest): ISalesOrderDetail {
    const lines = request.salesLines.map((line, index) => {
      const quantity = this.toNumber(line.quantity, 0);
      const unitPrice = this.toNumber(line.rate, 0);
      const lineDiscountPercentage = this.toNumber(line.lineDiscountPercentage, 0);
      const grossLineAmount = quantity * unitPrice;
      const lineAmount = Number((grossLineAmount - ((grossLineAmount * lineDiscountPercentage) / 100)).toFixed(2));

      return {
        lineNumber: String(index + 1),
        lineType: line.type,
        itemCode: line.no,
        description: '',
        quantity,
        unitPrice,
        lineDiscountPercentage,
        lineAmount
      };
    });
    const totalAmount = Number((lines.reduce((total, line) => total + line.lineAmount, 0) - this.toNumber(request.invoiceDiscountAmountExclVat, 0)).toFixed(2));
    const productDimension = request.salesLines
      .map(line => line.dimension || [])
      .reduce(
        (allDimensions, lineDimensions) => allDimensions.concat(lineDimensions),
        [] as readonly { dimensionCode: string; dimensionValueCode: string }[]
      )
      .filter(dimension => dimension.dimensionCode.toUpperCase() === 'PRODUCT')[0];

    return {
      id: '',
      salesOrderNumber: '',
      documentType: '',
      documentDate: undefined,
      postingDescription: '',
      customerCode: request.sellToCustomerNo,
      customerName: '',
      customerName2: '',
      clientCode: '',
      clientName: '',
      salespersonCode: request.salesperson || '',
      salespersonName: '',
      eventCode: productDimension?.dimensionValueCode || '',
      eventName: '',
      postingDate: normalizeBusinessDate(request.postingDate),
      orderDate: normalizeBusinessDate(request.rodate),
      dueDate: undefined,
      shipmentDate: undefined,
      requestedDeliveryDate: undefined,
      promisedDeliveryDate: undefined,
      externalDocumentNumber: request.roNo || '',
      yourReference: '',
      status: 'Unknown',
      totalAmount,
      amountIncludingVAT: undefined,
      amountLCY: undefined,
      amountIncludingVATLCY: undefined,
      outstandingQuantity: undefined,
      outstandingAmountLCY: undefined,
      quantityToShip: undefined,
      quantityShipped: undefined,
      quantityToInvoice: undefined,
      quantityInvoiced: undefined,
      currencyCode: '',
      pricesIncludingVAT: undefined,
      paymentTermsCode: '',
      paymentMethodCode: '',
      invoiceDiscountAmountExclVat: request.invoiceDiscountAmountExclVat,
      invoiceDiscountPercent: request.invoiceDiscountPercent,
      paymentDiscountPercent: undefined,
      prepaymentPercent: undefined,
      responsibilityCenter: '',
      assignedUserID: '',
      shortcutDimension1Code: '',
      shortcutDimension2Code: '',
      locationCode: request.locationcode || '',
      shippingAdvice: '',
      completelyShipped: undefined,
      shipToName: '',
      shipToAddress: '',
      shipToAddress2: '',
      shipToCity: '',
      shipToCounty: '',
      shipToPostCode: '',
      shipToCountryRegionCode: '',
      shipToContact: '',
      billToName: '',
      billToAddress: '',
      billToAddress2: '',
      billToCity: '',
      billToCounty: '',
      billToPostCode: '',
      billToCountryRegionCode: '',
      billToContactNo: '',
      billToContact: '',
      sellToAddress: '',
      sellToAddress2: '',
      sellToCity: '',
      sellToCounty: '',
      sellToPostCode: '',
      sellToCountryRegionCode: '',
      sellToPhoneNo: '',
      sellToEmail: '',
      sellToContact: '',
      lines,
      relatedInvoices: [],
      invoiceSummary: this.mapInvoiceSummaryApiToUiModel(undefined, [])
    };
  }

  private tryDecodeSalesOrderPostResponse(base64: string | undefined): ISalesOrderApiModel | undefined {
    if (!base64) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(this.decodeBase64Utf8(base64)) as unknown;

      return this.isRecord(parsed) && !Array.isArray(parsed) ? parsed as ISalesOrderApiModel : undefined;
    } catch {
      return undefined;
    }
  }

  private decodeBase64Utf8(base64: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private sumLineAmount(
    lines: readonly ISalesOrderLineItemApiModel[],
    fieldName:
      | 'lineAmount'
      | 'amountIncludingVAT'
      | 'outstandingQuantity'
      | 'outstandingAmountLCY'
      | 'qtyToShip'
      | 'quantityShipped'
      | 'qtyToInvoice'
      | 'quantityInvoiced'
  ): number {
    return lines.reduce((total, line) => {
      const amount = fieldName === 'amountIncludingVAT'
        ? this.toNumber(line.amountIncludingVAT, this.toNumber(line.amountIncludingVATLCY, 0))
        : this.toNumber(line[fieldName], 0);

      return total + amount;
    }, 0);
  }

  private toOptionalNumber(value: number | undefined, fallback?: number): number | undefined {
    return typeof value === 'number' ? value : fallback;
  }

  private toNumber(value: number | undefined, fallback: number): number {
    return typeof value === 'number' ? value : fallback;
  }

  private toPositiveOptionalNumber(value: number | undefined): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
  }

  private toBusinessDate(value: string | undefined): string | undefined {
    return normalizeBusinessDate(value);
  }
}
