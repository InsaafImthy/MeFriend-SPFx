import type { ApiClient } from '../api/apiClient';
import type { QueryParams } from '../api/apiTypes';
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
  customerCode?: string;
  customerName?: string;
  branch?: string;
  department?: string;
  city?: string;
  stateCode?: string;
  countryCode?: string;
  locationCode?: string;
  status?: string;
  address?: string;
  postCode?: string;
  panNo?: string;
  gstNo?: string;
}

interface ICustomerCreateApiResponse {
  customerCode?: string;
  customerName?: string;
  businessCentralDocumentNumber?: string;
  rawReference?: string;
  createdAt?: string;
}

export class CustomerService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getCustomers(
    filters: ICustomerFilters = {},
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): Promise<IPagedResult<ICustomerListItem>> {
    const response = await this.apiClient.get<IPagedResult<ICustomerApiModel>>(
      '/api/customers',
      this.buildQueryParams(filters, pagination, sorting)
    );

    return this.mapPagedResult(response.data);
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
    return {
      id: api?.id || api?.customerCode || '',
      customerCode: api?.customerCode || '',
      customerName: api?.customerName || '',
      branch: api?.branch || '',
      department: api?.department || '',
      city: api?.city || '',
      stateCode: api?.stateCode || '',
      countryCode: api?.countryCode || '',
      locationCode: api?.locationCode || '',
      status: api?.status || '',
      address: api?.address || '',
      postCode: api?.postCode || '',
      panNo: api?.panNo || '',
      gstNo: api?.gstNo || ''
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

  private buildQueryParams(
    filters: ICustomerFilters,
    pagination?: Partial<IPaginationState>,
    sorting?: ISortState
  ): QueryParams {
    return {
      searchText: filters.searchText,
      branch: filters.branch,
      department: filters.department,
      city: filters.city,
      stateCode: filters.stateCode,
      status: filters.status,
      pageNumber: pagination?.pageNumber,
      pageSize: pagination?.pageSize,
      sortField: sorting?.fieldName,
      sortDirection: sorting?.direction
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
}
