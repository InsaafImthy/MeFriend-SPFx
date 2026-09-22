import type { BcCompany } from './bcCompanies';

export const companyNameMap = {
  'IDEAL PUBLICATIONS TRUST': 'Ideal Publications Trust',
  'Madhyamam Capital Enterprises LLP': 'Madhyamam Capital Enterprises',
  'Madhyamam Capital Initiatives LLP': 'Madhyamam Capital Initiatives',
  'Madhyamam Capital Resources LLP': 'Madhyamam Capital Resource LLP',
  'Madhyamam Printing and Publishing LLP': 'Madhyamam Print & Publish LLP',
  'Mefriend Business Solutions LLP': 'Mefriend Business Sol LLP',
  'My Company': 'My Company'
} as const;

export type SharePointCompanyName = keyof typeof companyNameMap;
export type BcCompanyName = typeof companyNameMap[SharePointCompanyName];

export interface IAuthorizedBcCompanyResult {
  readonly companies: readonly BcCompany[];
  readonly unmappedSharePointCompanies: readonly string[];
  readonly unavailableBcCompanyNames: readonly BcCompanyName[];
}

const isSharePointCompanyName = (value: string): value is SharePointCompanyName =>
  Object.prototype.hasOwnProperty.call(companyNameMap, value);

export const getMappedBcCompanyName = (sharePointCompanyName: string): BcCompanyName | undefined =>
  isSharePointCompanyName(sharePointCompanyName) ? companyNameMap[sharePointCompanyName] : undefined;

export const filterAuthorizedBcCompanies = (
  sharePointCompanies: readonly string[],
  availableBcCompanies: readonly BcCompany[]
): IAuthorizedBcCompanyResult => {
  const companies: BcCompany[] = [];
  const unmappedSharePointCompanies: string[] = [];
  const unavailableBcCompanyNames: BcCompanyName[] = [];
  const selectedCompanyIds = new Set<string>();

  sharePointCompanies.forEach(sharePointCompanyName => {
    const mappedName = getMappedBcCompanyName(sharePointCompanyName);

    if (!mappedName) {
      if (unmappedSharePointCompanies.indexOf(sharePointCompanyName) === -1) {
        unmappedSharePointCompanies.push(sharePointCompanyName);
      }
      return;
    }

    const matchingCompany = availableBcCompanies.filter(
      company => company.name.toLowerCase() === mappedName.toLowerCase()
    )[0];

    if (!matchingCompany) {
      if (unavailableBcCompanyNames.indexOf(mappedName) === -1) {
        unavailableBcCompanyNames.push(mappedName);
      }
      return;
    }

    if (!selectedCompanyIds.has(matchingCompany.id)) {
      selectedCompanyIds.add(matchingCompany.id);
      companies.push(matchingCompany);
    }
  });

  return { companies, unmappedSharePointCompanies, unavailableBcCompanyNames };
};

export const isBcCompanyAuthorized = (
  company: BcCompany,
  authorizedCompanies: readonly BcCompany[]
): boolean => authorizedCompanies.some(authorizedCompany => authorizedCompany.id === company.id);
