import type { IModuleConfig } from '../../../../shared/models/IModuleConfig';
import type { IFormFieldConfig, IValidationRule } from '../../../../shared/models/IFormFieldConfig';
import type { ILookupOption } from '../../../../shared/models/ILookupOption';
import type { ICustomerListItem } from '../../models/customers/ICustomerModels';

export const customerBranchOptions: readonly ILookupOption[] = [
  { key: 'CLT', text: 'CLT', value: 'CLT' },
  { key: 'MPM', text: 'MPM', value: 'MPM' },
  { key: 'TVM', text: 'TVM', value: 'TVM' },
  { key: 'TSR', text: 'TSR', value: 'TSR' },
  { key: 'CHN', text: 'CHN', value: 'CHN' },
  { key: 'KTM', text: 'KTM', value: 'KTM' },
  { key: 'CORP', text: 'CORP', value: 'CORP' },
  { key: 'KNR', text: 'KNR', value: 'KNR' }
];

export const customerDepartmentOptions: readonly ILookupOption[] = [
  { key: 'CIR', text: 'CIR', value: 'CIR' },
  { key: 'ADVT', text: 'ADVT', value: 'ADVT' }
];

export interface ICustomerFormLookupSets {
  countryRegionCodeOptions: readonly ILookupOption[];
  stateCodeOptions: readonly ILookupOption[];
  locationCodeOptions: readonly ILookupOption[];
  genPostingGroupOptions: readonly ILookupOption[];
  customerPostingGroupOptions: readonly ILookupOption[];
  gstCustomerTypeOptions: readonly ILookupOption[];
}

const indiaCountryCode = 'IN';
const gstRegisteredCustomerTypes = ['REGISTERED', 'DEEMED EXPORT', 'SEZ DEVELOPMENT', 'SEZ UNIT'];
const alphanumericCodePattern = /^[A-Z0-9 -]*$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;

const normalizeCode = (value: unknown): string => typeof value === 'string' ? value.trim().toUpperCase() : '';
const normalizeText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const isIndiaCustomer = (values: Readonly<Record<string, unknown>>): boolean =>
  normalizeCode(values.countryRegionCode) === indiaCountryCode;
const isRegisteredGstCustomer = (values: Readonly<Record<string, unknown>>): boolean =>
  gstRegisteredCustomerTypes.indexOf(normalizeCode(values.gstCustomerType)) !== -1;
const matchesLookupOption = (options: readonly ILookupOption[], value: unknown): boolean => {
  const normalizedValue = normalizeCode(value);

  if (!normalizedValue) {
    return false;
  }

  return options.some(option => normalizeCode(option.value) === normalizedValue);
};
const maxTrimmedLengthRule = (maxLength: number, label: string): IValidationRule => ({
  type: 'custom' as const,
  message: `${label} must be ${maxLength} characters or fewer.`,
  validator: (value: unknown) => normalizeText(value).length <= maxLength
});
const validLookupRule = (label: string, options: readonly ILookupOption[]): IValidationRule => ({
  type: 'custom' as const,
  message: `Select a valid ${label}.`,
  validator: (value: unknown) => !normalizeCode(value) || matchesLookupOption(options, value)
});

export const customerCountryRegionOptions: readonly ILookupOption[] = [
  { key: indiaCountryCode, text: 'India', value: indiaCountryCode }
];

export const customerIndiaStateOptions: readonly ILookupOption[] = [
  { key: 'AN', text: 'Andaman and Nicobar Islands', value: 'AN' },
  { key: 'AP', text: 'Andhra Pradesh', value: 'AP' },
  { key: 'AR', text: 'Arunachal Pradesh', value: 'AR' },
  { key: 'AS', text: 'Assam', value: 'AS' },
  { key: 'BR', text: 'Bihar', value: 'BR' },
  { key: 'CG', text: 'Chhattisgarh', value: 'CG' },
  { key: 'CH', text: 'Chandigarh', value: 'CH' },
  { key: 'DD', text: 'Daman and Diu', value: 'DD' },
  { key: 'DL', text: 'Delhi', value: 'DL' },
  { key: 'DN', text: 'Dadra and Nagar Haveli', value: 'DN' },
  { key: 'GA', text: 'Goa', value: 'GA' },
  { key: 'GJ', text: 'Gujarat', value: 'GJ' },
  { key: 'HP', text: 'Himachal Pradesh', value: 'HP' },
  { key: 'HR', text: 'Haryana', value: 'HR' },
  { key: 'JH', text: 'Jharkhand', value: 'JH' },
  { key: 'JK', text: 'Jammu and Kashmir', value: 'JK' },
  { key: 'KA', text: 'Karnataka', value: 'KA' },
  { key: 'KL', text: 'Kerala', value: 'KL' },
  { key: 'LA', text: 'Ladakh', value: 'LA' },
  { key: 'LD', text: 'Lakshadweep', value: 'LD' },
  { key: 'MH', text: 'Maharashtra', value: 'MH' },
  { key: 'ML', text: 'Meghalaya', value: 'ML' },
  { key: 'MN', text: 'Manipur', value: 'MN' },
  { key: 'MP', text: 'Madhya Pradesh', value: 'MP' },
  { key: 'MZ', text: 'Mizoram', value: 'MZ' },
  { key: 'NL', text: 'Nagaland', value: 'NL' },
  { key: 'OD', text: 'Odisha', value: 'OD' },
  { key: 'PB', text: 'Punjab', value: 'PB' },
  { key: 'PY', text: 'Puducherry', value: 'PY' },
  { key: 'RJ', text: 'Rajasthan', value: 'RJ' },
  { key: 'SK', text: 'Sikkim', value: 'SK' },
  { key: 'TN', text: 'Tamil Nadu', value: 'TN' },
  { key: 'TR', text: 'Tripura', value: 'TR' },
  { key: 'TS', text: 'Telangana', value: 'TS' },
  { key: 'UK', text: 'Uttarakhand', value: 'UK' },
  { key: 'UP', text: 'Uttar Pradesh', value: 'UP' },
  { key: 'WB', text: 'West Bengal', value: 'WB' }
];

export const customerGstCustomerTypeOptions: readonly ILookupOption[] = [
  { key: 'REGISTERED', text: 'Registered', value: 'Registered' },
  { key: 'UNREGISTERED', text: 'Unregistered', value: 'Unregistered' },
  { key: 'EXPORT', text: 'Export', value: 'Export' },
  { key: 'DEEMED EXPORT', text: 'Deemed Export', value: 'Deemed Export' },
  { key: 'EXEMPTED', text: 'Exempted', value: 'Exempted' },
  { key: 'SEZ DEVELOPMENT', text: 'SEZ Development', value: 'SEZ Development' },
  { key: 'SEZ UNIT', text: 'SEZ Unit', value: 'SEZ Unit' }
];

export const customerGenPostingGroupOptions: readonly ILookupOption[] = [
  { key: 'B2B', text: 'B2B', value: 'B2B' },
  { key: 'B2C', text: 'B2C', value: 'B2C' },
  { key: 'DOMESTIC', text: 'DOMESTIC', value: 'DOMESTIC' },
  { key: 'FOREIGN', text: 'FOREIGN', value: 'FOREIGN' }
];

export const customerPostingGroupOptions: readonly ILookupOption[] = [
  { key: 'B2B', text: 'B2B', value: 'B2B' },
  { key: 'B2C', text: 'B2C', value: 'B2C' },
  { key: 'FOREIGN', text: 'FOREIGN', value: 'FOREIGN' }
];

export const customerLocationOptions: readonly ILookupOption[] = [];

const defaultCustomerLookupSets: ICustomerFormLookupSets = {
  countryRegionCodeOptions: customerCountryRegionOptions,
  stateCodeOptions: customerIndiaStateOptions,
  locationCodeOptions: customerLocationOptions,
  genPostingGroupOptions: customerGenPostingGroupOptions,
  customerPostingGroupOptions: customerPostingGroupOptions,
  gstCustomerTypeOptions: customerGstCustomerTypeOptions
};

export const getCustomerFormFields = (
  countryRegionCode?: string,
  lookupSets: Partial<ICustomerFormLookupSets> = {}
): readonly IFormFieldConfig[] => {
  const resolvedLookups: ICustomerFormLookupSets = {
    ...defaultCustomerLookupSets,
    ...lookupSets
  };
  const isIndia = normalizeCode(countryRegionCode) === indiaCountryCode;

  return [
    {
      key: 'name',
      label: 'Customer Name',
      type: 'text',
      required: true,
      section: 'Customer Details',
      validationRules: [maxTrimmedLengthRule(100, 'Customer Name')]
    },
    {
      key: 'name2',
      label: 'Secondary Name',
      type: 'text',
      required: false,
      section: 'Customer Details',
      validationRules: [maxTrimmedLengthRule(50, 'Secondary Name')]
    },
    {
      key: 'address',
      label: 'Address',
      type: 'textarea',
      required: true,
      section: 'Address Details',
      validationRules: [maxTrimmedLengthRule(100, 'Address')]
    },
    {
      key: 'address2',
      label: 'Address 2',
      type: 'textarea',
      required: false,
      section: 'Address Details',
      validationRules: [maxTrimmedLengthRule(100, 'Address 2')]
    },
    {
      key: 'countryRegionCode',
      label: 'Country / Region Code',
      type: 'dropdown',
      required: true,
      section: 'Address Details',
      options: resolvedLookups.countryRegionCodeOptions,
      validationRules: [validLookupRule('country / region code', resolvedLookups.countryRegionCodeOptions)]
    },
    {
      key: 'stateCode',
      label: 'State Code',
      type: 'dropdown',
      required: false,
      hidden: !isIndia,
      section: 'Address Details',
      options: resolvedLookups.stateCodeOptions,
      validationRules: [
        {
          type: 'custom',
          message: 'State Code is required when Country / Region Code is IN.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || normalizeCode(values.stateCode).length > 0
        },
        {
          type: 'custom',
          message: 'Select a valid State Code.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || matchesLookupOption(resolvedLookups.stateCodeOptions, values.stateCode)
        }
      ]
    },
    {
      key: 'city',
      label: 'City',
      type: 'text',
      required: false,
      section: 'Address Details',
      validationRules: [maxTrimmedLengthRule(30, 'City')]
    },
    {
      key: 'postCode',
      label: 'Post Code',
      type: 'text',
      required: false,
      section: 'Address Details',
      validationRules: [
        maxTrimmedLengthRule(20, 'Post Code'),
        {
          type: 'custom',
          message: 'Post Code is required when Country / Region Code is IN.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || normalizeCode(values.postCode).length > 0
        },
        {
          type: 'custom',
          message: 'Post Code must be 6 numeric digits for India.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) => {
            const postCode = normalizeCode(values.postCode);

            if (!isIndiaCustomer(values) || !postCode) {
              return true;
            }

            return /^[0-9]{6}$/.test(postCode);
          }
        },
        {
          type: 'custom',
          message: 'Post Code must be alphanumeric.',
          validator: (value: unknown) => !normalizeCode(value) || alphanumericCodePattern.test(normalizeCode(value))
        }
      ]
    },
    {
      key: 'locationCode',
      label: 'Location Code',
      type: 'dropdown',
      required: false,
      section: 'Address Details',
      options: resolvedLookups.locationCodeOptions,
      validationRules: [validLookupRule('location code', resolvedLookups.locationCodeOptions)]
    },
    {
      key: 'phoneNumber',
      label: 'Phone Number',
      type: 'text',
      required: false,
      section: 'Address Details',
      validationRules: [maxTrimmedLengthRule(30, 'Phone Number')]
    },
    {
      key: 'PAN',
      label: 'PAN Number',
      type: 'text',
      required: false,
      hidden: !isIndia,
      section: 'Tax & Posting',
      validationRules: [
        {
          type: 'custom',
          message: 'PAN Number is required when Country / Region Code is IN.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || normalizeCode(values.PAN).length > 0
        },
        {
          type: 'custom',
          message: 'PAN Number must be 5 letters, 4 digits, and 1 letter.',
          validator: (value: unknown) => !normalizeCode(value) || panPattern.test(normalizeCode(value))
        }
      ]
    },
    {
      key: 'gstRegistrationNo',
      label: 'GST Registration No.',
      type: 'text',
      required: false,
      hidden: !isIndia,
      section: 'Tax & Posting',
      validationRules: [
        maxTrimmedLengthRule(20, 'GST Registration No.'),
        {
          type: 'custom',
          message: 'GST Registration No. is required for GST-registered customers.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || !isRegisteredGstCustomer(values) || normalizeCode(values.gstRegistrationNo).length > 0
        },
        {
          type: 'custom',
          message: 'GST Registration No. must be a valid 15-character GSTIN.',
          validator: (value: unknown) => !normalizeCode(value) || gstinPattern.test(normalizeCode(value))
        },
        {
          type: 'custom',
          message: 'GST Registration No. must embed the same PAN Number.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) => {
            const pan = normalizeCode(values.PAN);
            const gstRegistrationNo = normalizeCode(values.gstRegistrationNo);

            if (!pan || !gstRegistrationNo || gstRegistrationNo.length < 12) {
              return true;
            }

            return gstRegistrationNo.substring(2, 12) === pan;
          }
        }
      ]
    },
    {
      key: 'genPostingGroup',
      label: 'General Posting Group',
      type: 'dropdown',
      required: true,
      section: 'Tax & Posting',
      options: resolvedLookups.genPostingGroupOptions,
      validationRules: [validLookupRule('general posting group', resolvedLookups.genPostingGroupOptions)]
    },
    {
      key: 'customerPostingGroup',
      label: 'Customer Posting Group',
      type: 'dropdown',
      required: true,
      section: 'Tax & Posting',
      options: resolvedLookups.customerPostingGroupOptions,
      validationRules: [validLookupRule('customer posting group', resolvedLookups.customerPostingGroupOptions)]
    },
    {
      key: 'gstCustomerType',
      label: 'GST Customer Type',
      type: 'dropdown',
      required: false,
      hidden: !isIndia,
      section: 'Tax & Posting',
      options: resolvedLookups.gstCustomerTypeOptions,
      validationRules: [
        {
          type: 'custom',
          message: 'GST Customer Type is required when Country / Region Code is IN.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || normalizeCode(values.gstCustomerType).length > 0
        },
        {
          type: 'custom',
          message: 'Select a valid GST Customer Type.',
          validator: (_value: unknown, values: Readonly<Record<string, unknown>>) =>
            !isIndiaCustomer(values) || matchesLookupOption(resolvedLookups.gstCustomerTypeOptions, values.gstCustomerType)
        }
      ]
    }
  ];
};

export const customersModuleConfig: IModuleConfig<ICustomerListItem> = {
  key: 'customers',
  title: 'Customer Master',
  route: 'customers',
  icon: 'Contact',
  description: 'Customer listing, details, search, filtering, and creation.',
  createEnabled: true,
  detailEnabled: true,
  order: 1,
  visible: true,
  tableColumns: [
    { key: 'customerCode', header: 'Customer Code', fieldName: 'customerCode', sortable: true, renderType: 'text' },
    { key: 'customerName', header: 'Customer Name', fieldName: 'customerName', sortable: true, renderType: 'text', minWidth: 180 },
    { key: 'city', header: 'City', fieldName: 'city', sortable: true, renderType: 'text' },
    { key: 'stateCode', header: 'State', fieldName: 'stateCode', sortable: true, renderType: 'text' },
    { key: 'countryCode', header: 'Country', fieldName: 'countryCode', sortable: true, renderType: 'text' },
    { key: 'phoneNumber', header: 'Phone', fieldName: 'phoneNumber', sortable: true, renderType: 'text' },
    { key: 'gstCustomerType', header: 'GST Type', fieldName: 'status', sortable: true, renderType: 'status' }
  ],
  filters: [
    { key: 'searchText', label: 'Search', type: 'text' },
    { key: 'city', label: 'City', type: 'text' },
    { key: 'stateCode', label: 'State', type: 'text' },
    { key: 'status', label: 'GST Type', type: 'text' }
  ],
  formFields: getCustomerFormFields(indiaCountryCode)
};
