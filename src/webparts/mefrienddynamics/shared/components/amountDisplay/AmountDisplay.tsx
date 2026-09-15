import * as React from 'react';
import { formatCurrency } from '../../utilities/formatUtils';
import { platformConfig } from '../../config/platformConfig';
import styles from './AmountDisplay.module.scss';

export type AmountDisplayVariant = 'normal' | 'paid' | 'outstanding' | 'total';

export interface IAmountDisplayProps {
  amount?: number;
  currencyCode?: string;
  locale?: string;
  fallback?: string;
  showZero?: boolean;
  variant?: AmountDisplayVariant;
}

export const AmountDisplay: React.FC<IAmountDisplayProps> = ({
  amount,
  currencyCode = platformConfig.currencyCode,
  locale = platformConfig.locale,
  fallback = '-',
  showZero = true,
  variant = 'normal'
}) => {
  if (amount === undefined || (!showZero && amount === 0)) {
    return <span className={styles.fallback}>{fallback}</span>;
  }

  return <span className={`${styles.amount} ${styles[variant]}`}>{formatCurrency(amount, currencyCode, fallback, locale)}</span>;
};
