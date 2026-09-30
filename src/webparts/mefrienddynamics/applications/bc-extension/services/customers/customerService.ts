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

    return this.mapPagedResult(response.data, pagination.pageSize, filters, sorting);
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
    requestedPageSize: number,
    filters: ICustomerFilters,
    sorting?: ISortState
  ): IServerPagedResult<ICustomerListItem> {
    const mappedItems = (api?.items || []).map(item => this.mapCustomerApiToUiModel(item));
    const filteredItems = this.filterCustomers(mappedItems, filters);
    const sortedItems = this.sortCustomers(filteredItems, sorting);

    return {
      items: sortedItems,
      pageSize: api?.pageSize || requestedPageSize,
      hasNext: Boolean(api?.hasNext),
      nextToken: api?.nextToken
    };
  }

  private filterCustomers(
    customers: readonly ICustomerListItem[],
    filters: ICustomerFilters
  ): readonly ICustomerListItem[] {
    const searchText = this.normalizeFilterText(filters.searchText);
    const branch = this.normalizeFilterText(filters.branch);
    const department = this.normalizeFilterText(filters.department);
    const city = this.normalizeFilterText(filters.city);
    const stateCode = this.normalizeFilterText(filters.stateCode);
    const status = this.normalizeFilterText(filters.status);

    return customers.filter(customer => {
      if (searchText && !this.customerMatchesSearch(customer, searchText)) {
        return false;
      }

      if (branch && this.normalizeFilterText(customer.branch).indexOf(branch) === -1) {
        return false;
      }

      if (department && this.normalizeFilterText(customer.department).indexOf(department) === -1) {
        return false;
      }

      if (city && this.normalizeFilterText(customer.city).indexOf(city) === -1) {
        return false;
      }

      if (stateCode && this.normalizeFilterText(customer.stateCode).indexOf(stateCode) === -1) {
        return false;
      }

      if (status && this.normalizeFilterText(customer.status).indexOf(status) === -1) {
        return false;
      }

      return true;
    });
  }

  private customerMatchesSearch(customer: ICustomerListItem, searchText: string): boolean {
    const searchableText = [
      customer.customerCode,
      customer.customerName,
      customer.city,
      customer.stateCode,
      customer.countryCode,
      customer.locationCode,
      customer.phoneNumber,
      customer.status
    ].map(value => this.normalizeFilterText(value)).join(' ');

    return searchableText.indexOf(searchText) !== -1;
  }

  private sortCustomers(
    customers: readonly ICustomerListItem[],
    sorting?: ISortState
  ): readonly ICustomerListItem[] {
    if (!sorting) {
      return customers;
    }

    const directionMultiplier = sorting.direction === 'desc' ? -1 : 1;

    return customers.slice().sort((left, right) => {
      const leftValue = this.normalizeSortValue(this.getCustomerFieldValue(left, sorting.fieldName));
      const rightValue = this.normalizeSortValue(this.getCustomerFieldValue(right, sorting.fieldName));

      if (leftValue < rightValue) {
        return -1 * directionMultiplier;
      }

      if (leftValue > rightValue) {
        return directionMultiplier;
      }

      return 0;
    });
  }

  private getCustomerFieldValue(customer: ICustomerListItem, fieldName: string): unknown {
    return (customer as unknown as Record<string, unknown>)[fieldName];
  }

  private normalizeFilterText(value: string | undefined): string {
    return (value || '').trim().toLowerCase();
  }

  private normalizeSortValue(value: unknown): string {
    if (value === undefined || value === null) {
      return '';
    }

    return String(value).trim().toLowerCase();
  }
}
