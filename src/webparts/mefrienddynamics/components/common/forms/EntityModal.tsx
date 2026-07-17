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
  confirmLabel?: string;
  cancelLabel?: string;
  confirmLoading?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss: () => void;
  onAfterClose?: () => void;
}

const modalAnimationDurationMs = 180;

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
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmLoading = false,
  confirmDisabled = false,
  cancelDisabled = false,
  onConfirm,
  onCancel,
  onDismiss,
  onAfterClose
}) => {
  const [showDirtyConfirmation, setShowDirtyConfirmation] = React.useState<boolean>(false);
  const [shouldRender, setShouldRender] = React.useState<boolean>(isOpen);
  const [isClosing, setIsClosing] = React.useState<boolean>(false);
  const closeTimerRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = undefined;
    }

    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
      return undefined;
    }

    if (!shouldRender) {
      return undefined;
    }

    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false);
      setIsClosing(false);
      closeTimerRef.current = undefined;

      if (onAfterClose) {
        onAfterClose();
      }
    }, modalAnimationDurationMs);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };
  }, [isOpen, onAfterClose, shouldRender]);

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

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={isClosing ? `${styles.modalOverlay} ${styles.modalOverlayClosing}` : styles.modalOverlay} role="presentation">
      <section
        className={[styles.modal, styles[size], isClosing ? styles.modalClosing : ''].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entity-modal-title"
      >
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
            {onCancel ? <Button disabled={cancelDisabled || confirmLoading} label={cancelLabel} variant="secondary" onClick={onCancel} /> : null}
            {onConfirm ? (
              <Button
                disabled={confirmDisabled}
                label={confirmLabel}
                loading={confirmLoading}
                variant="primary"
                onClick={onConfirm}
              />
            ) : null}
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
