import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { mefriendFields, mefriendListTitles, normalizeEmail } from '../../config/sharePointConfig';
import type { ICustomerCreateFormState } from '../../models/customers';
import type {
  BCIntegrationOperation,
  IBCIntegrationQueueItem,
  IBCIntegrationResult,
  ICustomerRequest,
  ISalesOrderRequest,
  RequestType
} from '../../models/requests';
import type { ISalesOrderCreateFormState, ISalesOrderLineItem } from '../../models/salesOrders';
import { normalizeBusinessDate } from '../../utils/formatUtils';
import { CustomerService } from '../customers/customerService';
import { getUserFriendlyError } from '../api/apiErrorHandler';
import { SalesOrderService } from '../salesOrders/salesOrderService';
import { AppAccessService } from './appAccessService';
import { CustomerRequestService } from './customerRequestService';
import { SalesOrderRequestService } from './salesOrderRequestService';
import { SharePointRestClient } from './sharePointRestClient';

interface IBCIntegrationQueueListItem {
  Id?: number;
  ID?: number;
  Title?: string;
  QueueNumber?: string;
  RequestType?: string;
  RequestNumber?: string;
  RequestItemId?: number;
  Operation?: string;
  IntegrationStatus?: string;
  AttemptCount?: number;
  RequestPayload?: string;
  ResponsePayload?: string;
  ErrorMessage?: string;
  BCDocumentNumber?: string;
  BCSystemId?: string;
  CorrelationId?: string;
  TriggeredById?: number;
  TriggeredBy?: { Title?: string };
  TriggeredOn?: string;
  LastAttemptOn?: string;
  CompletedOn?: string;
}

export interface IBCIntegrationQueueServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
  customerService: CustomerService;
  salesOrderService: SalesOrderService;
}

const queueSelect = [
  'Id',
  'ID',
  'Title',
  'QueueNumber',
  'RequestType',
  'RequestNumber',
  'RequestItemId',
  'Operation',
  'IntegrationStatus',
  'AttemptCount',
  'RequestPayload',
  'ResponsePayload',
  'ErrorMessage',
  'BCDocumentNumber',
  'BCSystemId',
  'CorrelationId',
  'TriggeredById',
  'TriggeredBy/Title',
  'TriggeredOn',
  'LastAttemptOn',
  'CompletedOn'
];

const toNumber = (value: number | undefined): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
type CustomerPostRequest = ICustomerRequest & { requestType: 'Customer'; requestItemId: number };
type SalesOrderPostRequest = ISalesOrderRequest & { requestType: 'SalesOrder'; requestItemId: number };
type PostableRequest = CustomerPostRequest | SalesOrderPostRequest;

export class BCIntegrationQueueService {
  private readonly appAccessService: AppAccessService;
  private readonly customerRequestService: CustomerRequestService;
  private readonly salesOrderRequestService: SalesOrderRequestService;
  private readonly restClient: SharePointRestClient;

  public constructor(private readonly options: IBCIntegrationQueueServiceOptions) {
    this.appAccessService = new AppAccessService(options);
    this.customerRequestService = new CustomerRequestService(options);
    this.salesOrderRequestService = new SalesOrderRequestService(options);
    this.restClient = new SharePointRestClient(options);
  }

  public async postApprovedRequest(requestType: RequestType, requestItemId: number): Promise<IBCIntegrationResult<ICustomerRequest | ISalesOrderRequest>> {
    const access = await this.appAccessService.getCurrentAccess(true);
    const moduleKey = requestType === 'Customer' ? 'customers' : 'salesOrders';
    const moduleAccess = access.permissions[moduleKey];

    if (!access.isAuthorized || !moduleAccess || !moduleAccess.canPostToBC) {
      throw new Error('You do not have permission to post this request to Business Central.');
    }

    const currentSharePointUserId = await this.getCurrentSharePointUserId(access.signedInEmail);
    const request = requestType === 'Customer'
      ? await this.loadCustomerRequest(requestItemId)
      : await this.loadSalesOrderRequest(requestItemId);

    this.validateRequestCanPost(request);
    await this.ensureNoProcessingAttempt(request.requestType, request.requestItemId);

    const operation: BCIntegrationOperation = request.requestType === 'Customer' ? 'CreateCustomer' : 'CreateSalesOrder';
    const correlationId = this.createCorrelationId(request.requestType, request.requestNumber);
    const now = new Date().toISOString();
    const attemptCount = await this.getNextAttemptCount(request.requestType, request.requestItemId);
    const payload = request.requestType === 'Customer'
      ? this.toCustomerPayload(request)
      : await this.toSalesOrderPayload(request);
    const queueItem = await this.createQueueAttempt({
      request,
      operation,
      attemptCount,
      requestPayload: this.toSafeJson(payload),
      correlationId,
      currentSharePointUserId,
      now
    });

    try {
      await this.setRequestPosting(request);

      if (request.requestType === 'Customer') {
        const response = await this.options.customerService.postCustomerToBusinessCentral(payload as ICustomerCreateFormState);
        const documentNumber = this.getFirstText(response, ['customerCode', 'number', 'businessCentralDocumentNumber', 'id']);
        const systemId = this.getFirstText(response, ['systemId', 'bcSystemId', 'id']);

        await this.markQueueSucceeded(queueItem.id, response, documentNumber, systemId, new Date().toISOString());
        await this.customerRequestService.updateWorkflowState(request.id, {
          bcPostingStatus: 'Posted',
          bcCustomerNumber: documentNumber,
          bcSystemId: systemId,
          bcPostedOn: new Date().toISOString(),
          bcErrorMessage: ''
        });

        return {
          request: {
            ...request,
            bcPostingStatus: 'Posted',
            bcCustomerNumber: documentNumber,
            bcSystemId: systemId
          },
          queueItem: {
            ...queueItem,
            integrationStatus: 'Succeeded',
            bcDocumentNumber: documentNumber,
            bcSystemId: systemId
          }
        };
      }

      const response = await this.options.salesOrderService.postSalesOrderToBusinessCentral(payload as ISalesOrderCreateFormState);
      const documentNumber = response.salesOrderNumber || response.id || '';
      const systemId = response.id || '';

      await this.markQueueSucceeded(queueItem.id, response, documentNumber, systemId, new Date().toISOString());
      await this.salesOrderRequestService.updateWorkflowState(request.id, {
        bcPostingStatus: 'Posted',
        bcSalesOrderNumber: documentNumber,
        bcSystemId: systemId,
        bcPostedOn: new Date().toISOString(),
        bcErrorMessage: ''
      });

      return {
        request: {
          ...request,
          bcPostingStatus: 'Posted',
          bcSalesOrderNumber: documentNumber,
          bcSystemId: systemId
        },
        queueItem: {
          ...queueItem,
          integrationStatus: 'Succeeded',
          bcDocumentNumber: documentNumber,
          bcSystemId: systemId
        }
      };
    } catch (error) {
      const message = getUserFriendlyError(error);
      await this.markQueueFailed(queueItem.id, error, message);
      await this.setRequestFailed(request, message);
      throw new Error(message);
    }
  }

  public async getQueueHistory(requestType: RequestType, requestItemId: number): Promise<readonly IBCIntegrationQueueItem[]> {
    const items = await this.restClient.readItems<IBCIntegrationQueueListItem>(mefriendListTitles.bcIntegrationQueue, {
      select: queueSelect,
      expand: ['TriggeredBy'],
      filter: `RequestType eq '${requestType}' and RequestItemId eq ${requestItemId}`,
      orderBy: 'TriggeredOn desc'
    });

    return items.map(this.mapQueueItem);
  }

  private validateRequestCanPost(request: PostableRequest): void {
    if (request.approvalStatus !== 'Approved') {
      throw new Error('Only approved requests can be posted to Business Central.');
    }

    if (request.bcPostingStatus !== 'Ready to Post' && request.bcPostingStatus !== 'Failed') {
      throw new Error('This request is not ready for Business Central posting.');
    }

    if ((request.requestType === 'Customer' && request.bcCustomerNumber) || (request.requestType === 'SalesOrder' && request.bcSalesOrderNumber)) {
      throw new Error('This request has already been posted to Business Central.');
    }
  }

  private async ensureNoProcessingAttempt(requestType: RequestType, requestItemId: number): Promise<void> {
    const items = await this.restClient.readItems<IBCIntegrationQueueListItem>(mefriendListTitles.bcIntegrationQueue, {
      select: ['Id', 'IntegrationStatus'],
      filter: `RequestType eq '${requestType}' and RequestItemId eq ${requestItemId} and IntegrationStatus eq 'Processing'`,
      top: 1
    });

    if (items.length) {
      throw new Error('A Business Central posting attempt is already processing for this request.');
    }
  }

  private async createQueueAttempt(input: {
    request: PostableRequest;
    operation: BCIntegrationOperation;
    attemptCount: number;
    requestPayload: string;
    correlationId: string;
    currentSharePointUserId: number;
    now: string;
  }): Promise<IBCIntegrationQueueItem> {
    const queueNumber = `BCQ-${input.request.requestNumber}-${input.now.replace(/[-:.TZ]/g, '')}`;
    const payload = {
      [mefriendFields.bcIntegrationQueue.title]: queueNumber,
      [mefriendFields.bcIntegrationQueue.queueNumber]: queueNumber,
      [mefriendFields.bcIntegrationQueue.requestType]: input.request.requestType,
      [mefriendFields.bcIntegrationQueue.requestNumber]: input.request.requestNumber,
      [mefriendFields.bcIntegrationQueue.requestItemId]: input.request.id,
      [mefriendFields.bcIntegrationQueue.operation]: input.operation,
      [mefriendFields.bcIntegrationQueue.integrationStatus]: 'Processing',
      [mefriendFields.bcIntegrationQueue.attemptCount]: input.attemptCount,
      [mefriendFields.bcIntegrationQueue.requestPayload]: input.requestPayload,
      [mefriendFields.bcIntegrationQueue.responsePayload]: '',
      [mefriendFields.bcIntegrationQueue.errorMessage]: '',
      [mefriendFields.bcIntegrationQueue.bcDocumentNumber]: '',
      [mefriendFields.bcIntegrationQueue.bcSystemId]: '',
      [mefriendFields.bcIntegrationQueue.correlationId]: input.correlationId,
      [mefriendFields.bcIntegrationQueue.triggeredById]: input.currentSharePointUserId,
      [mefriendFields.bcIntegrationQueue.triggeredOn]: input.now,
      [mefriendFields.bcIntegrationQueue.lastAttemptOn]: input.now
    };

    const created = await this.restClient.createItem<typeof payload, IBCIntegrationQueueListItem>(
      mefriendListTitles.bcIntegrationQueue,
      payload
    );

    return this.mapQueueItem(created);
  }

  private async setRequestPosting(request: PostableRequest): Promise<void> {
    if (request.requestType === 'Customer') {
      await this.customerRequestService.updateWorkflowState(request.id, {
        bcPostingStatus: 'Posting',
        bcErrorMessage: ''
      });
      return;
    }

    await this.salesOrderRequestService.updateWorkflowState(request.id, {
      bcPostingStatus: 'Posting',
      bcErrorMessage: ''
    });
  }

  private async getNextAttemptCount(requestType: RequestType, requestItemId: number): Promise<number> {
    const history = await this.getQueueHistory(requestType, requestItemId);
    const maxAttemptCount = history.reduce((max, item) => Math.max(max, item.attemptCount), 0);
    return maxAttemptCount + 1;
  }

  private async setRequestFailed(request: PostableRequest, message: string): Promise<void> {
    if (request.requestType === 'Customer') {
      await this.customerRequestService.updateWorkflowState(request.id, {
        bcPostingStatus: 'Failed',
        bcErrorMessage: message
      });
      return;
    }

    await this.salesOrderRequestService.updateWorkflowState(request.id, {
      bcPostingStatus: 'Failed',
      bcErrorMessage: message
    });
  }

  private async markQueueSucceeded(id: number, response: unknown, documentNumber: string, systemId: string, completedOn: string): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.bcIntegrationQueue, id, {
      [mefriendFields.bcIntegrationQueue.integrationStatus]: 'Succeeded',
      [mefriendFields.bcIntegrationQueue.responsePayload]: this.toSafeJson(response),
      [mefriendFields.bcIntegrationQueue.errorMessage]: '',
      [mefriendFields.bcIntegrationQueue.bcDocumentNumber]: documentNumber,
      [mefriendFields.bcIntegrationQueue.bcSystemId]: systemId,
      [mefriendFields.bcIntegrationQueue.completedOn]: completedOn
    });
  }

  private async markQueueFailed(id: number, response: unknown, message: string): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.bcIntegrationQueue, id, {
      [mefriendFields.bcIntegrationQueue.integrationStatus]: 'Failed',
      [mefriendFields.bcIntegrationQueue.responsePayload]: this.toSafeJson(response),
      [mefriendFields.bcIntegrationQueue.errorMessage]: message
    });
  }

  private toCustomerPayload(request: ICustomerRequest): ICustomerCreateFormState {
    return {
      name: request.customerName,
      name2: request.name2,
      address: request.address,
      address2: request.address2,
      stateCode: request.stateCode,
      countryRegionCode: request.countryRegionCode,
      city: request.city,
      postCode: request.postCode,
      locationCode: request.locationCode,
      phoneNumber: request.phoneNumber,
      PAN: request.PAN,
      gstRegistrationNo: request.gstRegistrationNo,
      genPostingGroup: request.genPostingGroup,
      customerPostingGroup: request.customerPostingGroup,
      gstCustomerType: request.gstCustomerType
    };
  }

  private async toSalesOrderPayload(request: ISalesOrderRequest): Promise<ISalesOrderCreateFormState> {
    const lines = await this.salesOrderRequestService.getRequestLines(request.id);

    if (!lines.length) {
      throw new Error('This approved sales-order request has no active lines to post.');
    }

    return {
      customerCode: request.sellToCustomerCode,
      billToCustomerCode: request.billToCustomerCode,
      salespersonCode: request.salespersonCode,
      eventCode: request.eventCode,
      countryCode: request.countryCode,
      stateCode: request.stateCode,
      orderDate: normalizeBusinessDate(request.orderDate),
      postingDate: normalizeBusinessDate(request.postingDate),
      externalDocumentNumber: request.externalDocumentNumber,
      remarks: request.remarks,
      currencyCode: request.currencyCode,
      invoiceDiscountAmountExclVat: request.invoiceDiscountAmountExclVat,
      invoiceDiscountPercent: request.invoiceDiscountPercent,
      lines: lines.map((line): ISalesOrderLineItem => ({
        lineNumber: String(line.lineNumber),
        itemCode: line.itemCode,
        description: line.description,
        quantity: toNumber(line.quantity),
        unitPrice: toNumber(line.rate),
        lineDiscountPercentage: toNumber(line.lineDiscountPercentage),
        lineAmount: toNumber(line.netLineAmount),
        unitOfMeasureCode: line.unitOfMeasureCode
      }))
    };
  }

  private async loadCustomerRequest(id: number): Promise<CustomerPostRequest> {
    const request = await this.customerRequestService.getRequestById(id);

    if (!request) {
      throw new Error(`Customer request ${id} was not found.`);
    }

    return { ...request, requestType: 'Customer', requestItemId: request.id };
  }

  private async loadSalesOrderRequest(id: number): Promise<SalesOrderPostRequest> {
    const request = await this.salesOrderRequestService.getRequestById(id);

    if (!request) {
      throw new Error(`Sales order request ${id} was not found.`);
    }

    return { ...request, requestType: 'SalesOrder', requestItemId: request.id };
  }

  private async getCurrentSharePointUserId(email: string): Promise<number> {
    const ensuredUser = await this.restClient.ensureUser(normalizeEmail(email));
    return ensuredUser.id;
  }

  private createCorrelationId(requestType: RequestType, requestNumber: string): string {
    return `${requestType}-${requestNumber}-${Date.now()}`;
  }

  private getFirstText(source: unknown, keys: readonly string[]): string {
    const record = source as Record<string, unknown>;
    const value = keys.map(key => record[key]).filter(item => typeof item === 'string' && item.trim())[0];
    return typeof value === 'string' ? value : '';
  }

  private toSafeJson(value: unknown): string {
    try {
      const json = JSON.stringify(value, (_key, childValue) => {
        if (typeof childValue === 'string' && /bearer\s+/i.test(childValue)) {
          return '[redacted]';
        }
        return childValue;
      });
      return json.length > 20000 ? `${json.substring(0, 20000)}...` : json;
    } catch {
      return String(value);
    }
  }

  private mapQueueItem(item: IBCIntegrationQueueListItem): IBCIntegrationQueueItem {
    return {
      id: item.Id || item.ID || 0,
      title: item.Title || '',
      queueNumber: item.QueueNumber || item.Title || '',
      requestType: (item.RequestType || 'Customer') as RequestType,
      requestNumber: item.RequestNumber || '',
      requestItemId: item.RequestItemId || 0,
      operation: (item.Operation || 'CreateCustomer') as IBCIntegrationQueueItem['operation'],
      integrationStatus: (item.IntegrationStatus || 'Ready') as IBCIntegrationQueueItem['integrationStatus'],
      attemptCount: item.AttemptCount || 0,
      requestPayload: item.RequestPayload || '',
      responsePayload: item.ResponsePayload || '',
      errorMessage: item.ErrorMessage || '',
      bcDocumentNumber: item.BCDocumentNumber || '',
      bcSystemId: item.BCSystemId || '',
      correlationId: item.CorrelationId || '',
      triggeredById: item.TriggeredById,
      triggeredByTitle: item.TriggeredBy ? item.TriggeredBy.Title : undefined,
      triggeredOn: item.TriggeredOn,
      lastAttemptOn: item.LastAttemptOn,
      completedOn: item.CompletedOn
    };
  }
}
