import {
  bcCompanies,
  getBcCompanyLabel,
  getBcCompanyRequestHeaders,
  isMefriendBusinessSolutionsCompany
} from './bcCompanies';

describe('BC company configuration', () => {
  it('uses displayName only for the UI label', () => {
    const company = bcCompanies[6];

    expect(getBcCompanyLabel(company)).toBe('Mefriend Business Solutions LLP');
    expect(getBcCompanyRequestHeaders(company)).toEqual({
      'X-BC-Company-Id': 'cde40340-e0af-f011-bbd0-6045bd7340ea',
      'X-BC-Company-Name': 'Mefriend Business Sol LLP'
    });
  });

  it('does not provide backend headers without a selection', () => {
    expect(() => getBcCompanyRequestHeaders(undefined)).toThrow('Select a Business Central company');
  });

  it('identifies only the canonical MeFriend Business Solutions company', () => {
    expect(isMefriendBusinessSolutionsCompany({
      ...bcCompanies[6],
      id: ` ${bcCompanies[6].id.toUpperCase()} `
    })).toBe(true);
    expect(isMefriendBusinessSolutionsCompany(bcCompanies[5])).toBe(false);
    expect(isMefriendBusinessSolutionsCompany(undefined)).toBe(false);
  });
});

