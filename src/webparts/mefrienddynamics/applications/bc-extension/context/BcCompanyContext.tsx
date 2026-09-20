import * as React from 'react';
import { bcCompanies, type BcCompany } from '../config/bcCompanies';

export const bcSelectedCompanyStorageKey = 'mefriend.bc.selectedCompanyId';

export interface IBcCompanyStorage {
  getItem(key: string): string | undefined;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface IBcCompanyContextValue {
  selectedCompany: BcCompany | undefined;
  selectedCompanyId: string | undefined;
  selectedCompanyName: string | undefined;
  selectCompany: (company: BcCompany) => void;
  clearCompany: () => void;
}

const getSessionStorage = (): IBcCompanyStorage | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const storage = window.sessionStorage;
    return {
      getItem: key => storage.getItem(key) ?? undefined,
      setItem: (key, value) => storage.setItem(key, value),
      removeItem: key => storage.removeItem(key)
    };
  } catch {
    return undefined;
  }
};

export const restoreBcCompany = (storage: IBcCompanyStorage | undefined = getSessionStorage()): BcCompany | undefined => {
  if (!storage) {
    return undefined;
  }

  try {
    const storedCompanyId = storage.getItem(bcSelectedCompanyStorageKey);
    if (storedCompanyId === undefined) {
      return undefined;
    }

    const company = bcCompanies.filter(item => item.id === storedCompanyId)[0];
    if (!company) {
      storage.removeItem(bcSelectedCompanyStorageKey);
    }

    return company;
  } catch {
    return undefined;
  }
};

export const persistBcCompany = (
  company: BcCompany | undefined,
  storage: IBcCompanyStorage | undefined = getSessionStorage()
): void => {
  if (!storage) {
    return;
  }

  try {
    if (company) {
      storage.setItem(bcSelectedCompanyStorageKey, company.id);
    } else {
      storage.removeItem(bcSelectedCompanyStorageKey);
    }
  } catch {
    // The in-memory selection remains usable when browser storage is unavailable.
  }
};

const BcCompanyContext = React.createContext<IBcCompanyContextValue | undefined>(undefined);

export const BcCompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompany] = React.useState<BcCompany | undefined>(restoreBcCompany);

  const selectCompany = React.useCallback((company: BcCompany): void => {
    const configuredCompany = bcCompanies.filter(item => item.id === company.id)[0];
    if (!configuredCompany) {
      throw new Error('The selected Business Central company is not configured.');
    }

    persistBcCompany(configuredCompany);
    setSelectedCompany(configuredCompany);
  }, []);

  const clearCompany = React.useCallback((): void => {
    persistBcCompany(undefined);
    setSelectedCompany(undefined);
  }, []);

  const value = React.useMemo<IBcCompanyContextValue>(() => ({
    selectedCompany,
    selectedCompanyId: selectedCompany?.id,
    selectedCompanyName: selectedCompany?.name,
    selectCompany,
    clearCompany
  }), [clearCompany, selectCompany, selectedCompany]);

  return <BcCompanyContext.Provider value={value}>{children}</BcCompanyContext.Provider>;
};

export const useBcCompany = (): IBcCompanyContextValue => {
  const context = React.useContext(BcCompanyContext);
  if (!context) {
    throw new Error('useBcCompany must be used inside BcCompanyProvider.');
  }

  return context;
};
