export interface ISalespersonDataScopeUser {
  isSalesperson: boolean;
  salespersonCode?: unknown;
}

export interface ISalespersonScopedRecord {
  salespersonCode?: unknown;
}

export const missingSalespersonCodeMessage =
  'Your Salesperson Code is not configured. Contact an administrator to update your app-user settings.';

export const normalizeSalespersonCode = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value).trim().toUpperCase() : '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  return String(value).trim().toUpperCase();
};

export const shouldApplySalespersonRestriction = (user?: ISalespersonDataScopeUser): boolean =>
  user?.isSalesperson === true;

export const getCurrentSalespersonCode = (user?: ISalespersonDataScopeUser): string | undefined => {
  if (!shouldApplySalespersonRestriction(user)) {
    return undefined;
  }

  const salespersonCode = normalizeSalespersonCode(user?.salespersonCode);

  if (!salespersonCode) {
    throw new Error(missingSalespersonCodeMessage);
  }

  return salespersonCode;
};

export const filterByCurrentSalesperson = <TRecord extends ISalespersonScopedRecord>(
  records: readonly TRecord[],
  user?: ISalespersonDataScopeUser
): readonly TRecord[] => {
  const salespersonCode = getCurrentSalespersonCode(user);

  if (!salespersonCode) {
    return records;
  }

  return records.filter(record => normalizeSalespersonCode(record.salespersonCode) === salespersonCode);
};
