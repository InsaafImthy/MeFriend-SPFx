import * as React from 'react';
import styles from './AmountDisplay.module.scss';

export type AmountDisplayVariant = 'normal' | 'paid' | 'outstanding' | 'total';

export interface IAmountDisplayProps {
  amount?: number;
  currencyCode?: string;
  fallback?: string;
  showZero?: boolean;
  variant?: AmountDisplayVariant;
}

export const AmountDisplay: React.FC<IAmountDisplayProps> = ({
  amount,
  currencyCode = 'INR',
  fallback = '-',
  showZero = true,
  variant = 'normal'
}) => {
  if (amount === undefined || (!showZero && amount === 0)) {
    return <span className={styles.fallback}>{fallback}</span>;
  }

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    currency: currencyCode,
    style: 'currency'
  }).format(amount);

  return <span className={`${styles.amount} ${styles[variant]}`}>{formattedAmount}</span>;
};
