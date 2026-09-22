import { bcCompanies } from './bcCompanies';
import {
  filterAuthorizedBcCompanies,
  getMappedBcCompanyName,
  isBcCompanyAuthorized
} from './companyAccess';

describe('company access mapping', () => {
  it.each([
    ['IDEAL PUBLICATIONS TRUST', 'Ideal Publications Trust'],
    ['Madhyamam Capital Enterprises LLP', 'Madhyamam Capital Enterprises'],
    ['Madhyamam Capital Initiatives LLP', 'Madhyamam Capital Initiatives'],
    ['Madhyamam Capital Resources LLP', 'Madhyamam Capital Resource LLP'],
    ['Madhyamam Printing and Publishing LLP', 'Madhyamam Print & Publish LLP'],
    ['Mefriend Business Solutions LLP', 'Mefriend Business Sol LLP'],
    ['My Company', 'My Company']
  ])('maps %s exactly to %s', (sharePointName, bcName) => {
    expect(getMappedBcCompanyName(sharePointName)).toBe(bcName);
  });

  it('does not guess unmapped or partially matching names', () => {
    expect(getMappedBcCompanyName('Mefriend Business')).toBeUndefined();
    expect(getMappedBcCompanyName('ideal publications trust')).toBeUndefined();
  });

  it('returns only explicitly assigned BC companies with their configured IDs', () => {
    const result = filterAuthorizedBcCompanies([
      'Mefriend Business Solutions LLP',
      'IDEAL PUBLICATIONS TRUST'
    ], bcCompanies);

    expect(result.companies.map(company => company.name)).toEqual([
      'Mefriend Business Sol LLP',
      'Ideal Publications Trust'
    ]);
    expect(result.companies[0].id).toBe('cde40340-e0af-f011-bbd0-6045bd7340ea');
    expect(isBcCompanyAuthorized(bcCompanies[0], result.companies)).toBe(false);
  });

  it('reports unmapped and unavailable companies without substituting another company', () => {
    const result = filterAuthorizedBcCompanies(
      ['Unknown Company', 'My Company'],
      bcCompanies.filter(company => company.name !== 'My Company')
    );

    expect(result.companies).toEqual([]);
    expect(result.unmappedSharePointCompanies).toEqual(['Unknown Company']);
    expect(result.unavailableBcCompanyNames).toEqual(['My Company']);
  });
});
