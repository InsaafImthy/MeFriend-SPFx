import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';
import { mefriendFields, mefriendListTitles } from '../../config/sharePointConfig';
import type { ICustomerCreateFormState } from '../../models/customers';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';
import type { ICustomerRequest, IRequestListFilter, RequestStatus } from '../../models/requests';
import { SharePointRestClient } from './sharePointRestClient';

interface ICustomerRequestListItem {
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
  BCCustomerNumber?: string;
  BCSystemId?: string;
  BCPostedOn?: string;
  BCErrorMessage?: string;
  CustomerName?: string;
  Name2?: string;
  Address?: string;
  Address2?: string;
  StateCode?: string;
  CountryRegionCode?: string;
  City?: string;
  PostCode?: string;
  LocationCode?: string;
  PhoneNumber?: string;
  PAN?: string;
  GSTRegistrationNo?: string;
  GenPostingGroup?: string;
  CustomerPostingGroup?: string;
  GSTCustomerType?: string;
}

export interface ICustomerRequestServiceOptions {
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
  webAbsoluteUrl?: string;
}

export interface ICreateCustomerRequestInput {
  form: ICustomerCreateFormState;
  workflowId: number;
  submittedById: number;
}

export interface IUpdateCustomerRequestWorkflowInput {
  approvalStatus?: ICustomerRequest['approvalStatus'];
  currentLevel?: number;
  approvalCycle?: number;
  lastActionById?: number;
  lastActionOn?: string;
  rejectionReason?: string;
  bcPostingStatus?: ICustomerRequest['bcPostingStatus'];
  bcCustomerNumber?: string;
  bcSystemId?: string;
  bcPostedOn?: string;
  bcErrorMessage?: string;
}

const customerRequestSelect = [
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
  'BCCustomerNumber',
  'BCSystemId',
  'BCPostedOn',
  'BCErrorMessage',
  'CustomerName',
  'Name2',
  'Address',
  'Address2',
  'StateCode',
  'CountryRegionCode',
  'City',
  'PostCode',
  'LocationCode',
  'PhoneNumber',
  'PAN',
  'GSTRegistrationNo',
  'GenPostingGroup',
  'CustomerPostingGroup',
  'GSTCustomerType'
];

const padRequestId = (id: number): string => {
  const text = id.toString();
  return `${'000000'.substr(text.length)}${text}`;
};

export class CustomerRequestService {
  private readonly restClient: SharePointRestClient;

  public constructor(options: ICustomerRequestServiceOptions) {
    this.restClient = new SharePointRestClient(options);
  }

  public getRequestNumber(id: number): string {
    return `CUS-${padRequestId(id)}`;
  }

  public async createRequestHeader(input: ICreateCustomerRequestInput): Promise<ICustomerRequest> {
    const payload = {
      [mefriendFields.customerRequests.title]: 'Customer request',
      [mefriendFields.customerRequests.requestNumber]: '',
      [mefriendFields.customerRequests.approvalStatus]: 'Pending Approval',
      [mefriendFields.customerRequests.workflowId]: input.workflowId,
      [mefriendFields.customerRequests.currentLevel]: 1,
      [mefriendFields.customerRequests.approvalCycle]: 1,
      [mefriendFields.customerRequests.submittedById]: input.submittedById,
      [mefriendFields.customerRequests.submittedOn]: new Date().toISOString(),
      [mefriendFields.customerRequests.rejectionReason]: '',
      [mefriendFields.customerRequests.bcPostingStatus]: 'Not Ready',
      [mefriendFields.customerRequests.bcCustomerNumber]: '',
      [mefriendFields.customerRequests.bcSystemId]: '',
      [mefriendFields.customerRequests.bcErrorMessage]: '',
      [mefriendFields.customerRequests.customerName]: input.form.name,
      [mefriendFields.customerRequests.name2]: input.form.name2,
      [mefriendFields.customerRequests.address]: input.form.address,
      [mefriendFields.customerRequests.address2]: input.form.address2,
      [mefriendFields.customerRequests.stateCode]: input.form.stateCode,
      [mefriendFields.customerRequests.countryRegionCode]: input.form.countryRegionCode,
      [mefriendFields.customerRequests.city]: input.form.city,
      [mefriendFields.customerRequests.postCode]: input.form.postCode,
      [mefriendFields.customerRequests.locationCode]: input.form.locationCode,
      [mefriendFields.customerRequests.phoneNumber]: input.form.phoneNumber,
      [mefriendFields.customerRequests.pan]: input.form.PAN,
      [mefriendFields.customerRequests.gstRegistrationNo]: input.form.gstRegistrationNo,
      [mefriendFields.customerRequests.genPostingGroup]: input.form.genPostingGroup,
      [mefriendFields.customerRequests.customerPostingGroup]: input.form.customerPostingGroup,
      [mefriendFields.customerRequests.gstCustomerType]: input.form.gstCustomerType
    };

    const created = await this.restClient.createItem<typeof payload, ICustomerRequestListItem>(
      mefriendListTitles.customerRequests,
      payload
    );

    return this.mapRequest(created);
  }

  public async updateRequestNumber(id: number): Promise<ICustomerRequest> {
    const requestNumber = this.getRequestNumber(id);
    await this.restClient.updateItem(mefriendListTitles.customerRequests, id, {
      [mefriendFields.customerRequests.title]: requestNumber,
      [mefriendFields.customerRequests.requestNumber]: requestNumber
    });

    const request = await this.getRequestById(id);
    if (!request) {
      throw new Error(`Customer request ${requestNumber} could not be loaded after creation.`);
    }

    return request;
  }

  public async cancelRequest(id: number, reason: string): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.customerRequests, id, {
      [mefriendFields.customerRequests.approvalStatus]: 'Cancelled',
      [mefriendFields.customerRequests.rejectionReason]: reason,
      [mefriendFields.customerRequests.bcErrorMessage]: reason
    });
  }

  public async updateWorkflowState(id: number, input: IUpdateCustomerRequestWorkflowInput): Promise<void> {
    const payload: Record<string, unknown> = {};

    this.assignIfDefined(payload, mefriendFields.customerRequests.approvalStatus, input.approvalStatus);
    this.assignIfDefined(payload, mefriendFields.customerRequests.currentLevel, input.currentLevel);
    this.assignIfDefined(payload, mefriendFields.customerRequests.approvalCycle, input.approvalCycle);
    this.assignIfDefined(payload, mefriendFields.customerRequests.lastActionById, input.lastActionById);
    this.assignIfDefined(payload, mefriendFields.customerRequests.lastActionOn, input.lastActionOn);
    this.assignIfDefined(payload, mefriendFields.customerRequests.rejectionReason, input.rejectionReason);
    this.assignIfDefined(payload, mefriendFields.customerRequests.bcPostingStatus, input.bcPostingStatus);
    this.assignIfDefined(payload, mefriendFields.customerRequests.bcCustomerNumber, input.bcCustomerNumber);
    this.assignIfDefined(payload, mefriendFields.customerRequests.bcSystemId, input.bcSystemId);
    this.assignIfDefined(payload, mefriendFields.customerRequests.bcPostedOn, input.bcPostedOn);
    this.assignIfDefined(payload, mefriendFields.customerRequests.bcErrorMessage, input.bcErrorMessage);

    await this.restClient.updateItem(mefriendListTitles.customerRequests, id, payload);
  }

  public async updateRequestSnapshot(id: number, form: ICustomerCreateFormState): Promise<void> {
    await this.restClient.updateItem(mefriendListTitles.customerRequests, id, {
      [mefriendFields.customerRequests.customerName]: form.name,
      [mefriendFields.customerRequests.name2]: form.name2,
      [mefriendFields.customerRequests.address]: form.address,
      [mefriendFields.customerRequests.address2]: form.address2,
      [mefriendFields.customerRequests.stateCode]: form.stateCode,
      [mefriendFields.customerRequests.countryRegionCode]: form.countryRegionCode,
      [mefriendFields.customerRequests.city]: form.city,
      [mefriendFields.customerRequests.postCode]: form.postCode,
      [mefriendFields.customerRequests.locationCode]: form.locationCode,
      [mefriendFields.customerRequests.phoneNumber]: form.phoneNumber,
      [mefriendFields.customerRequests.pan]: form.PAN,
      [mefriendFields.customerRequests.gstRegistrationNo]: form.gstRegistrationNo,
      [mefriendFields.customerRequests.genPostingGroup]: form.genPostingGroup,
      [mefriendFields.customerRequests.customerPostingGroup]: form.customerPostingGroup,
      [mefriendFields.customerRequests.gstCustomerType]: form.gstCustomerType
    });
  }

  public async getRequests(
    filters: IRequestListFilter = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ICustomerRequest>> {
    const items = await this.restClient.readItems<ICustomerRequestListItem>(mefriendListTitles.customerRequests, {
      select: customerRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      orderBy: 'SubmittedOn desc'
    });
    return this.toPagedResult(items.map(this.mapRequest), filters, pagination, sorting);
  }

  public async getRequestById(id: number): Promise<ICustomerRequest | undefined> {
    const items = await this.restClient.readItems<ICustomerRequestListItem>(mefriendListTitles.customerRequests, {
      select: customerRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      filter: `Id eq ${id}`,
      top: 1
    });

    return items.length ? this.mapRequest(items[0]) : undefined;
  }

  public async getRequestByNumber(requestNumber: string): Promise<ICustomerRequest | undefined> {
    const escapedRequestNumber = this.restClient.escapeODataString(requestNumber);
    const items = await this.restClient.readItems<ICustomerRequestListItem>(mefriendListTitles.customerRequests, {
      select: customerRequestSelect,
      expand: ['Workflow', 'SubmittedBy', 'LastActionBy'],
      filter: `RequestNumber eq '${escapedRequestNumber}'`,
      top: 1
    });

    return items.length ? this.mapRequest(items[0]) : undefined;
  }

  private toPagedResult(
    items: readonly ICustomerRequest[],
    filters: IRequestListFilter,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ICustomerRequest> {
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

  private filterRequests(items: readonly ICustomerRequest[], filters: IRequestListFilter): readonly ICustomerRequest[] {
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
        item.customerName,
        item.submittedByTitle,
        item.bcCustomerNumber,
        item.city,
        item.stateCode
      ].some(value => this.normalize(value).indexOf(searchText) !== -1);
    });
  }

  private sortRequests(items: readonly ICustomerRequest[], sorting?: ISortState): readonly ICustomerRequest[] {
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

  private assignIfDefined(payload: Record<string, unknown>, fieldName: string, value: unknown): void {
    if (value !== undefined) {
      payload[fieldName] = value;
    }
  }

  private mapRequest(item: ICustomerRequestListItem): ICustomerRequest {
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
      bcPostingStatus: (item.BCPostingStatus || 'Not Ready') as ICustomerRequest['bcPostingStatus'],
      bcCustomerNumber: item.BCCustomerNumber || '',
      bcSystemId: item.BCSystemId || '',
      bcPostedOn: item.BCPostedOn,
      bcErrorMessage: item.BCErrorMessage || '',
      customerName: item.CustomerName || '',
      name2: item.Name2 || '',
      address: item.Address || '',
      address2: item.Address2 || '',
      stateCode: item.StateCode || '',
      countryRegionCode: item.CountryRegionCode || '',
      city: item.City || '',
      postCode: item.PostCode || '',
      locationCode: item.LocationCode || '',
      phoneNumber: item.PhoneNumber || '',
      PAN: item.PAN || '',
      gstRegistrationNo: item.GSTRegistrationNo || '',
      genPostingGroup: item.GenPostingGroup || '',
      customerPostingGroup: item.CustomerPostingGroup || '',
      gstCustomerType: item.GSTCustomerType || ''
    };
  }
}
