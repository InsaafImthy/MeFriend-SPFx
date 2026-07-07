import * as React from 'react';
import { Button, ButtonVariant } from '../buttons/Button';
import styles from './ConfirmationDialog.module.scss';

export interface IConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<IConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.overlay} role="presentation">
      <section aria-modal="true" className={styles.dialog} role="dialog" aria-labelledby="confirmation-title">
        <h2 id="confirmation-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.actions}>
          <Button label={cancelLabel} variant="secondary" onClick={onCancel} />
          <Button label={confirmLabel} variant={variant} onClick={onConfirm} />
        </div>
      </section>
    </div>
  );
};
