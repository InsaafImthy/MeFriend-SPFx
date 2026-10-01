import type { ApiClient } from '../../../../shared/api/apiClient';
import type {
  ICustomerCreateFormState,
  ICustomerCreateRequest,
  ICustomerDetail,
  ICustomerFilters,
  ICustomerListItem
} from '../../models/customers';
import { type IBcPagedResult, type ICursorPaginationState } from '../../../../shared/models/IServerPagination';
import type { ISortState } from '../../../../shared/models/ISortState';
import { fetchAllBcLookupItems, MAX_BC_LOOKUP_PAGE_SIZE } from '../../../../shared/utilities/bcLookupPagination';
import { buildBcPageQuery } from '../../../../shared/utilities/serverPagination';

interface ICustomerApiModel {
  '@odata.etag': string;
  id: string;
  number: string;
  name: string;
  name2: string;
  address: string;
  address2: string;
  stateCode: string;
  countryRegionCode: string;
  city: string;
  postCode: string;
  locationCode: string;
  phoneNumber: string;
  PAN: string;
  gstRegistrationNo: string;
  genPostingGroup: string;
  customerPostingGroup: string;
  gstCustomerType: string;
  createdDateTime: string;
  modifiedDateTime: string;
}

export interface ICustomerLookupItem {
  number: string;
  name: string;
}

type CustomerListApiResponse = IBcPagedResult<ICustomerApiModel>;
type CustomerLookupApiResponse = IBcPagedResult<ICustomerLookupItem>;

const indiaCountryCode = 'IN';
const normalizeText = (value: string): string => value.trim();
const normalizeCode = (value: string): string => value.trim().toUpperCase();

export class CustomerService {
  public constructor(private readonly apiClient: ApiClient) {}

  public async getCustomers(
    filters: ICustomerFilters = {},
    pagination: ICursorPaginationState,
    sorting?: ISortState
  ): Promise<IBcPagedResult<ICustomerListItem>> {
    const response = await this.apiClient.get<CustomerListApiResponse>('/api/Customers', buildBcPageQuery({
      search: filters.searchText,
      filters: {
        city: filters.city,
        gstCustomerType: filters.gstCustomerType
      }
    }, pagination, sorting));
    const result = response.data;

    return {
      items: (result?.items || []).map(item => this.mapCustomerApiToUiModel(item)),
      pageSize: result?.pageSize || pagination.pageSize,
      hasNext: Boolean(result?.hasNext),
      nextToken: result?.nextToken
    };
  }

  public async getCustomerLookup(
    searchText?: string,
    pageSize: number = MAX_BC_LOOKUP_PAGE_SIZE
  ): Promise<IBcPagedResult<ICustomerLookupItem>> {
    const items = await fetchAllBcLookupItems<ICustomerLookupItem>(async query => {
      const response = await this.apiClient.get<CustomerLookupApiResponse>('/api/Customers/lookup', query);
      return response.data;
    }, searchText, pageSize);

    return {
      items: items.map(item => ({
        number: normalizeText(item.number),
        name: normalizeText(item.name)
      })).filter(item => item.number),
      pageSize,
      hasNext: false
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

  public async postCustomerToBusinessCentral(payload: ICustomerCreateFormState): Promise<ICustomerApiModel> {
    const response = await this.apiClient.post<ICustomerCreateRequest, ICustomerApiModel>('/api/customers', payload);

    if (!response.data) {
      throw new Error('Business Central did not return the customer contract.');
    }

    return response.data;
  }

  public async createCustomer(payload: ICustomerCreateFormState): Promise<ICustomerApiModel> {
    return this.postCustomerToBusinessCentral(payload);
  }

  public mapCustomerApiToUiModel(api: ICustomerApiModel): ICustomerDetail {
    return {
      id: api.id,
      customerCode: api.number,
      customerName: api.name,
      name: api.name,
      name2: api.name2,
      city: api.city,
      stateCode: api.stateCode,
      countryCode: api.countryRegionCode,
      countryRegionCode: api.countryRegionCode,
      locationCode: api.locationCode,
      address: api.address,
      address2: api.address2,
      postCode: api.postCode,
      phoneNumber: api.phoneNumber,
      PAN: api.PAN,
      gstRegistrationNo: api.gstRegistrationNo,
      genPostingGroup: api.genPostingGroup,
      customerPostingGroup: api.customerPostingGroup,
      gstCustomerType: api.gstCustomerType
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

}
