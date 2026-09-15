import * as React from 'react';
import { Button } from '../buttons/Button';
import styles from './FormFooter.module.scss';

export interface IFormFooterProps {
  actions?: React.ReactNode;
  cancelLabel?: string;
  submitLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  submitDisabled?: boolean;
  onCancel?: () => void;
  onSubmit?: () => void;
}

export const FormFooter: React.FC<IFormFooterProps> = ({
  actions,
  cancelLabel = 'Cancel',
  submitLabel = 'Save',
  loading = false,
  disabled = false,
  submitDisabled = false,
  onCancel,
  onSubmit
}) => (
  <div className={styles.bar} role="group" aria-label="Form actions">
    <div className={styles.actions}>
      {actions}
      {onCancel ? <Button label={cancelLabel} variant="secondary" disabled={loading || disabled} onClick={onCancel} /> : null}
      {onSubmit ? <Button label={submitLabel} type="button" loading={loading} disabled={disabled || submitDisabled} onClick={onSubmit} /> : null}
    </div>
  </div>
);
