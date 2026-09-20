import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ICustomerCreateFormState,
  ICustomerCreateRequest,
  ICustomerDetail,
  ICustomerFilters,
  ICustomerListItem
} from '../../models/customers';
import { DEFAULT_SERVER_PAGE_SIZE, type ICursorPaginationState, type IServerPagedResult } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { buildServerPageQuery } from '../../../../shared/utilities/serverPagination';

interface ICustomerApiModel {
  id?: string;
  number?: string;
  no?: string;
  name?: string;
  name2?: string;
  customerCode?: string;
  customerName?: string;
  branch?: string;
  department?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  countryRegionCode?: string;
  locationCode?: string;
  status?: string;
  address?: string;
  address2?: string;
  postCode?: string;
  phoneNumber?: string;
  panNo?: string;
  PAN?: string;
  gstNo?: string;
  gstRegistrationNo?: string;
  genPostingGroup?: string;
  customerPostingGroup?: string;
  gstCustomerType?: string;
}

interface ICustomerCreateApiResponse {
  id?: string;
  number?: string;
  name?: string;
  customerCode?: string;
  customerName?: string;
  businessCentralDocumentNumber?: string;
  rawReference?: string;
  createdAt?: string;
}

export interface ICustomerLookupItem {
  number?: string;
  no: string;
  name: string;
}

type CustomerListApiResponse = IServerPagedResult<ICustomerApiModel>;
type CustomerLookupApiResponse = IServerPagedResult<ICustomerLookupItem>;

const indiaCountryCode = 'IN';
const normalizeText = (value: string): string => value.trim();
const normalizeCode = (value: string): string => value.trim().toUpperCase();

export class CustomerService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getCustomers(
    filters: ICustomerFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IServerPagedResult<ICustomerListItem>> {
    const response = await this.apiClient.get<CustomerListApiResponse>('/api/Customers', buildServerPageQuery({
      searchText: filters.searchText,
      branch: filters.branch,
      department: filters.department,
      city: filters.city,
      stateCode: filters.stateCode,
      status: filters.status
    }, pagination, sorting));

    return this.mapPagedResult(response.data, pagination.pageSize);
  }

  public async getCustomerLookup(
    searchText?: string,
    pageSize: number = DEFAULT_SERVER_PAGE_SIZE
  ): Promise<IServerPagedResult<ICustomerLookupItem>> {
    const response = await this.apiClient.get<CustomerLookupApiResponse>('/api/Customers/lookup', {
      searchText,
      pageSize
    });
    const result = response.data;

    return {
      items: (result?.items || []).map(item => ({
        number: normalizeText(item.number || item.no || ''),
        no: normalizeText(item.no || item.number || ''),
        name: normalizeText(item.name || '')
      })).filter(item => item.no),
      pageSize: result?.pageSize || pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getCustomerById(id: string): Promise<ICustomerDetail> {
    const response = await this.apiClient.get<ICustomerApiModel>(`/api/Customers/${encodeURIComponent(id)}`);
    const customer = response.data;

    if (!customer) {
      const notFoundError = new Error(`Customer ${id} was not found.`) as Error & { status?: number };
      notFoundError.status = 404;
      throw notFoundError;
    }

    return this.mapCustomerApiToUiModel(customer);
  }

  public async postCustomerToBusinessCentral(payload: ICustomerCreateFormState): Promise<ICustomerCreateApiResponse> {
    const response = await this.apiClient.post<ICustomerCreateRequest, ICustomerCreateApiResponse>('/api/customers', payload);

    return response.data || {};
  }

  public async createCustomer(payload: ICustomerCreateFormState): Promise<ICustomerCreateApiResponse> {
    return this.postCustomerToBusinessCentral(payload);
  }

  public mapCustomerApiToUiModel(api?: ICustomerApiModel): ICustomerDetail {
    const customerCode = api?.customerCode || api?.number || api?.no || '';

    return {
      id: api?.id || api?.number || api?.no || api?.customerCode || '',
      customerCode,
      customerName: api?.customerName || api?.name || '',
      branch: api?.branch || '',
      department: api?.department || '',
      name: api?.name || '',
      name2: api?.name2 || '',
      city: api?.city || '',
      stateCode: api?.stateCode || '',
      countryCode: api?.countryCode || api?.countryRegionCode || '',
      countryRegionCode: api?.countryRegionCode || api?.countryCode || '',
      locationCode: api?.locationCode || '',
      status: api?.status || api?.gstCustomerType || api?.customerPostingGroup || '',
      address: api?.address || '',
      address2: api?.address2 || '',
      postCode: api?.postCode || '',
      phoneNumber: api?.phoneNumber || '',
      PAN: api?.PAN || api?.panNo || '',
      gstRegistrationNo: api?.gstRegistrationNo || api?.gstNo || '',
      genPostingGroup: api?.genPostingGroup || '',
      customerPostingGroup: api?.customerPostingGroup || '',
      gstCustomerType: api?.gstCustomerType || ''
    };
  }

  public mapCustomerFormToApiRequest(form: ICustomerCreateFormState): ICustomerCreateRequest {
    const countryRegionCode = normalizeCode(form.countryRegionCode);
    const isIndia = countryRegionCode === indiaCountryCode;

    return {
      name: normalizeText(form.name),
      name2: normalizeText(form.name2),
      address: normalizeText(form.address),
      address2: normalizeText(form.address2),
      stateCode: isIndia ? normalizeCode(form.stateCode) : '',
      countryRegionCode,
      city: normalizeText(form.city),
      postCode: normalizeCode(form.postCode),
      locationCode: normalizeCode(form.locationCode),
      phoneNumber: normalizeText(form.phoneNumber),
      PAN: isIndia ? normalizeCode(form.PAN) : '',
      gstRegistrationNo: isIndia ? normalizeCode(form.gstRegistrationNo) : '',
      genPostingGroup: normalizeCode(form.genPostingGroup),
      customerPostingGroup: normalizeCode(form.customerPostingGroup),
      gstCustomerType: isIndia ? normalizeText(form.gstCustomerType) : ''
    };
  }

  private mapPagedResult(
    api: CustomerListApiResponse | undefined,
    requestedPageSize: number
  ): IServerPagedResult<ICustomerListItem> {
    return {
      items: (api?.items || []).map(item => this.mapCustomerApiToUiModel(item)),
      pageSize: api?.pageSize || requestedPageSize,
      hasNext: Boolean(api?.hasNext),
      nextToken: api?.nextToken
    };
  }
}
