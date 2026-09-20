export interface BcCompany {
  id: string;
  name: string;
  displayName: string;
}

export const bcCompanies: readonly BcCompany[] = [
  {
    id: 'fa94e309-c06d-f011-b47a-6045bde9c9cc',
    name: 'CRONUS IN',
    displayName: ''
  },
  {
    id: 'bd36648e-7581-f011-b4ca-7c1e523b2493',
    name: 'Ideal Publications Trust',
    displayName: 'IDEAL PUBLICATIONS TRUST'
  },
  {
    id: '681a7f93-f1af-f011-bbd0-6045bd7340ea',
    name: 'Madhyamam Capital Enterprises',
    displayName: 'Madhyamam Capital Enterprises LLP'
  },
  {
    id: 'da082405-f2af-f011-bbd0-6045bd7340ea',
    name: 'Madhyamam Capital Initiatives',
    displayName: 'Madhyamam Capital Initiatives LLP'
  },
  {
    id: '03df0547-f2af-f011-bbd0-6045bd7340ea',
    name: 'Madhyamam Capital Resource LLP',
    displayName: 'Madhyamam Capital Resources LLP'
  },
  {
    id: 'ebec8cb0-f2af-f011-bbd0-6045bd7340ea',
    name: 'Madhyamam Print & Publish LLP',
    displayName: 'Madhyamam Printing and Publishing LLP'
  },
  {
    id: 'cde40340-e0af-f011-bbd0-6045bd7340ea',
    name: 'Mefriend Business Sol LLP',
    displayName: 'Mefriend Business Solutions LLP'
  },
  {
    id: '3feeec15-c06d-f011-b47a-6045bde9c9cc',
    name: 'My Company',
    displayName: ''
  }
] as const;

export const getBcCompanyLabel = (company: BcCompany): string =>
  company.displayName.trim() || company.name;

export const getBcCompanyRequestHeaders = (company: BcCompany | undefined): Readonly<Record<string, string>> => {
  if (!company) {
    throw new Error('Select a Business Central company before making backend requests.');
  }

  return {
    'X-BC-Company-Id': company.id,
    'X-BC-Company-Name': company.name
  };
};
