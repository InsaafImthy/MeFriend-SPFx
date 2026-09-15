import * as React from 'react';
import { formatStatusLabel } from '../../utilities/formatUtils';
import styles from './StatusBadge.module.scss';

export type StatusBadgeType = 'invoice' | 'salesOrder' | 'payment' | 'generic';

export interface IStatusBadgeProps {
  value?: string;
  type?: StatusBadgeType;
  label?: string;
}

const getTone = (value?: string, type: StatusBadgeType = 'generic'): string => {
  const normalizedValue = (value || '').toLowerCase();

  if (type === 'payment') {
    if (normalizedValue === 'paid') {
      return styles.success;
    }
    if (normalizedValue === 'partially paid') {
      return styles.warning;
    }
    if (normalizedValue === 'unpaid' || normalizedValue === 'overdue') {
      return styles.danger;
    }
  }

  if (normalizedValue === 'open' || normalizedValue === 'active' || normalizedValue === 'released' || normalizedValue === 'posted') {
    return styles.success;
  }

  if (normalizedValue === 'pending' || normalizedValue === 'draft' || normalizedValue === 'partially paid') {
    return styles.warning;
  }

  if (normalizedValue === 'cancelled' || normalizedValue === 'canceled' || normalizedValue === 'failed' || normalizedValue === 'blocked') {
    return styles.danger;
  }

  return styles.neutral;
};

export const StatusBadge: React.FC<IStatusBadgeProps> = ({ value, type = 'generic', label }) => {
  const displayValue = label || formatStatusLabel(value);

  return <span className={`${styles.badge} ${getTone(value, type)}`}>{displayValue}</span>;
};
