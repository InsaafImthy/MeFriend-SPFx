export const formatNullFallback = (value?: string | number, fallback: string = '-'): string => {
  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value);
};

export const formatDate = (value?: string, fallback: string = '-'): string => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date);
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
