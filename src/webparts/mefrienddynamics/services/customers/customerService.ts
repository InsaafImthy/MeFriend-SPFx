import type { ApiClient } from '../api/apiClient';
import type {
  ICustomerCreateFormState,
  ICustomerCreateRequest,
  ICustomerDetail,
  ICustomerFilters,
  ICustomerListItem
} from '../../models/customers';
import type { IPagedResult } from '../../models/common/IPagedResult';
import type { IPaginationState } from '../../models/common/IPaginationState';
import type { ISortState } from '../../models/common/ISortState';

interface ICustomerApiModel {
  id?: string;
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
  postCode?: string;
  panNo?: string;
  PAN?: string;
  gstNo?: string;
  gstRegistrationNo?: string;
  genPostingGroup?: string;
  customerPostingGroup?: string;
  gstCustomerType?: string;
}

interface ICustomerCreateApiResponse {
  customerCode?: string;
  customerName?: string;
  businessCentralDocumentNumber?: string;
  rawReference?: string;
  createdAt?: string;
}

type CustomerListApiResponse = IPagedResult<ICustomerApiModel> | readonly ICustomerApiModel[];

export class CustomerService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getCustomers(
    filters: ICustomerFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ICustomerListItem>> {
    const response = await this.apiClient.get<CustomerListApiResponse>('/api/Customers');

    return this.mapCustomerListResult(response.data, filters, pagination, sorting);
  }

  public async getCustomerById(id: string): Promise<ICustomerDetail> {
    const response = await this.apiClient.get<ICustomerApiModel>(`/api/customers/${encodeURIComponent(id)}`);
    return this.mapCustomerApiToUiModel(response.data);
  }

  public async createCustomer(payload: ICustomerCreateFormState): Promise<ICustomerCreateApiResponse> {
    const response = await this.apiClient.post<ICustomerCreateRequest, ICustomerCreateApiResponse>(
      '/api/customers',
      this.mapCustomerFormToApiRequest(payload)
    );

    return response.data || {};
  }

  public mapCustomerApiToUiModel(api?: ICustomerApiModel): ICustomerDetail {
    const customerCode = api?.customerCode || api?.no || api?.name2 || '';

    return {
      id: api?.id || api?.no || api?.customerCode || api?.name2 || '',
      customerCode,
      customerName: api?.customerName || api?.name || '',
      branch: api?.branch || '',
      department: api?.department || '',
      city: api?.city || '',
      stateCode: api?.stateCode || '',
      countryCode: api?.countryCode || api?.countryRegionCode || '',
      locationCode: api?.locationCode || '',
      status: api?.status || api?.gstCustomerType || api?.customerPostingGroup || '',
      address: api?.address || '',
      postCode: api?.postCode || '',
      panNo: api?.panNo || api?.PAN || '',
      gstNo: api?.gstNo || api?.gstRegistrationNo || ''
    };
  }

  public mapCustomerFormToApiRequest(form: ICustomerCreateFormState): ICustomerCreateRequest {
    return {
      branch: form.branch.trim(),
      department: form.department.trim(),
      customerCode: form.customerCode.trim(),
      customerName: form.customerName.trim(),
      address: form.address.trim(),
      stateCode: form.stateCode.trim(),
      countryCode: form.countryCode.trim(),
      city: form.city.trim(),
      postCode: form.postCode.trim(),
      locationCode: form.locationCode.trim(),
      panNo: form.panNo.trim(),
      gstNo: form.gstNo.trim()
    };
  }

  private mapCustomerListResult(
    api: CustomerListApiResponse | undefined,
    filters: ICustomerFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ICustomerListItem> {
    if (this.isCustomerArray(api)) {
      return this.mapArrayResult(api, filters, pagination, sorting);
    }

    return this.mapPagedResult(api);
  }

  private mapArrayResult(
    apiItems: readonly ICustomerApiModel[],
    filters: ICustomerFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): IPagedResult<ICustomerListItem> {
    const pageNumber = Math.max(1, pagination?.pageNumber || 1);
    const pageSize = Math.max(1, pagination?.pageSize || apiItems.length || 1);
    const mappedItems = apiItems.map(item => this.mapCustomerApiToUiModel(item));
    const filteredItems = this.filterCustomers(mappedItems, filters);
    const sortedItems = this.sortCustomers(filteredItems, sorting);
    const startIndex = (pageNumber - 1) * pageSize;
    const pagedItems = sortedItems.slice(startIndex, startIndex + pageSize);
    const totalCount = sortedItems.length;

    return {
      items: pagedItems,
      pageNumber,
      pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize))
    };
  }

  private mapPagedResult(api?: IPagedResult<ICustomerApiModel>): IPagedResult<ICustomerListItem> {
    return {
      items: (api?.items || []).map(item => this.mapCustomerApiToUiModel(item)),
      pageNumber: api?.pageNumber || 1,
      pageSize: api?.pageSize || 0,
      totalCount: api?.totalCount || 0,
      totalPages: api?.totalPages || 0
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

  private isCustomerArray(api: CustomerListApiResponse | undefined): api is readonly ICustomerApiModel[] {
    return Array.isArray(api);
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
