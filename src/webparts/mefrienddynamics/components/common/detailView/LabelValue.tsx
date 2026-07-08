import * as React from 'react';
import { formatDate, formatNullFallback } from '../../../utils/formatUtils';
import { AmountDisplay } from '../amountDisplay/AmountDisplay';
import { StatusBadge } from '../statusBadge/StatusBadge';
import styles from './LabelValue.module.scss';

export type LabelValueRenderType = 'text' | 'date' | 'amount' | 'status' | 'custom';

export interface ILabelValueProps {
  label: string;
  value?: React.ReactNode;
  renderType?: LabelValueRenderType;
}

const renderValue = (value: React.ReactNode, renderType: LabelValueRenderType): React.ReactNode => {
  if (renderType === 'custom') {
    return value || <span className={styles.fallback}>-</span>;
  }

  if (renderType === 'amount') {
    return <AmountDisplay amount={typeof value === 'number' ? value : undefined} />;
  }

  if (renderType === 'status') {
    return <StatusBadge value={typeof value === 'string' ? value : undefined} />;
  }

  if (renderType === 'date' && typeof value === 'string' && value) {
    return formatDate(value);
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const formattedValue = formatNullFallback(value);
    return formattedValue === '-' ? <span className={styles.fallback}>-</span> : formattedValue;
  }

  return value || <span className={styles.fallback}>-</span>;
};

export const LabelValue: React.FC<ILabelValueProps> = ({ label, value, renderType = 'text' }) => (
  <div className={styles.labelValue}>
    <dt>{label}</dt>
    <dd>{renderValue(value, renderType)}</dd>
  </div>
);
