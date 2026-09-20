import { bcCompanies } from '../config/bcCompanies';
import {
  bcSelectedCompanyStorageKey,
  persistBcCompany,
  restoreBcCompany,
  type IBcCompanyStorage
} from './BcCompanyContext';

const createStorage = (initialValue?: string): IBcCompanyStorage & { values: Map<string, string> } => {
  const values = new Map<string, string>();
  if (initialValue) {
    values.set(bcSelectedCompanyStorageKey, initialValue);
  }

  return {
    values,
    getItem: key => values.get(key),
    setItem: (key, value) => values.set(key, value),
    removeItem: key => { values.delete(key); }
  };
};

describe('BC company selection storage', () => {
  it('restores a configured company from its stored ID', () => {
    const company = bcCompanies[1];
    const storage = createStorage(company.id);

    expect(restoreBcCompany(storage)).toBe(company);
  });

  it('rejects and removes an invalid stored company ID', () => {
    const storage = createStorage('stale-company-id');

    expect(restoreBcCompany(storage)).toBeUndefined();
    expect(storage.values.has(bcSelectedCompanyStorageKey)).toBe(false);
  });

  it('removes an empty stored company ID', () => {
    const storage = createStorage();
    storage.values.set(bcSelectedCompanyStorageKey, '');

    expect(restoreBcCompany(storage)).toBeUndefined();
    expect(storage.values.has(bcSelectedCompanyStorageKey)).toBe(false);
  });

  it('persists only the selected ID and clears it for reselection', () => {
    const storage = createStorage();
    const company = bcCompanies[6];

    persistBcCompany(company, storage);
    expect(storage.values.get(bcSelectedCompanyStorageKey)).toBe(company.id);

    persistBcCompany(undefined, storage);
    expect(storage.values.has(bcSelectedCompanyStorageKey)).toBe(false);
  });
});
