export const formatNullFallback = (value?: string | number, fallback: string = '-'): string => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

const padDatePart = (value: number): string => (value < 10 ? `0${value}` : String(value));

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return false;
  }

  const parsedDate = new Date(year, month - 1, day);
  return parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day;
};

export const normalizeBusinessDate = (value?: string | Date): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? undefined
      : `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue || trimmedValue === '0001-01-01' || trimmedValue === '0001-01-01T00:00:00Z') {
    return undefined;
  }

  const yearFirstMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(trimmedValue);
  if (yearFirstMatch) {
    const year = Number(yearFirstMatch[1]);
    const month = Number(yearFirstMatch[2]);
    const day = Number(yearFirstMatch[3]);

    return isValidDateParts(year, month, day)
      ? `${year}-${padDatePart(month)}-${padDatePart(day)}`
      : undefined;
  }

  const dayFirstMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmedValue);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);

    return isValidDateParts(year, month, day)
      ? `${year}-${padDatePart(month)}-${padDatePart(day)}`
      : undefined;
  }

  const parsedDate = new Date(trimmedValue);
  return Number.isNaN(parsedDate.getTime())
    ? undefined
    : `${parsedDate.getFullYear()}-${padDatePart(parsedDate.getMonth() + 1)}-${padDatePart(parsedDate.getDate())}`;
};

export const formatDate = (value?: string | Date, fallback: string = '-'): string => {
  const normalizedDate = normalizeBusinessDate(value);

  if (!normalizedDate) {
    return fallback;
  }

  const dateParts = normalizedDate.split('-');
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);

  return `${padDatePart(day)}/${padDatePart(month)}/${year}`;
};

export const formatAmount = (value?: number, fallback: string = '-'): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(value);
};

export const formatCurrency = (
  value?: number,
  currencyCode: string = 'INR',
  fallback: string = '-'
): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return new Intl.NumberFormat('en-IN', {
    currency: currencyCode || 'INR',
    style: 'currency'
  }).format(value);
};

export const formatStatusLabel = (value?: string, fallback: string = 'Unknown'): string => {
  if (!value || !value.trim()) {
    return fallback;
  }

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\w\S*/g, word => word.charAt(0).toUpperCase() + word.substr(1).toLowerCase());
};
