import * as React from 'react';
import { Button } from '../buttons/Button';
import { ConfirmationDialog } from '../confirmationDialog/ConfirmationDialog';
import styles from './Forms.module.scss';

export type EntityModalSize = 'small' | 'medium' | 'large' | 'full';

export interface IEntityModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: EntityModalSize;
  isDirty?: boolean;
  dirtyTitle?: string;
  dirtyMessage?: string;
  confirmCloseLabel?: string;
  cancelCloseLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss: () => void;
}

export const EntityModal: React.FC<IEntityModalProps> = ({
  isOpen,
  title,
  subtitle,
  children,
  actions,
  size = 'medium',
  isDirty = false,
  dirtyTitle = 'Discard changes?',
  dirtyMessage = 'You have unsaved changes. Closing this form will discard them.',
  confirmCloseLabel = 'Discard',
  cancelCloseLabel = 'Keep editing',
  onConfirm,
  onCancel,
  onDismiss
}) => {
  const [showDirtyConfirmation, setShowDirtyConfirmation] = React.useState<boolean>(false);

  const requestDismiss = (): void => {
    if (isDirty) {
      setShowDirtyConfirmation(true);
      return;
    }

    onDismiss();
  };

  const confirmDismiss = (): void => {
    setShowDirtyConfirmation(false);
    onDismiss();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section className={`${styles.modal} ${styles[size]}`} role="dialog" aria-modal="true" aria-labelledby="entity-modal-title">
        <header className={styles.modalHeader}>
          <div>
            <h2 id="entity-modal-title">{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <Button label="Close" variant="ghost" size="small" onClick={requestDismiss} ariaLabel="Close dialog" />
        </header>
        <div className={styles.modalBody}>{children}</div>
        {actions || onConfirm || onCancel ? (
          <footer className={styles.modalActions}>
            {actions}
            {onCancel ? <Button label="Cancel" variant="secondary" onClick={onCancel} /> : null}
            {onConfirm ? <Button label="Confirm" variant="primary" onClick={onConfirm} /> : null}
          </footer>
        ) : null}
      </section>
      <ConfirmationDialog
        isOpen={showDirtyConfirmation}
        title={dirtyTitle}
        message={dirtyMessage}
        confirmLabel={confirmCloseLabel}
        cancelLabel={cancelCloseLabel}
        variant="danger"
        onConfirm={confirmDismiss}
        onCancel={() => setShowDirtyConfirmation(false)}
      />
    </div>
  );
};
