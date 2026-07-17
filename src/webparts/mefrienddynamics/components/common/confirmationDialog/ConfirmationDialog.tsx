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
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onAfterClose?: () => void;
}

const dialogAnimationDurationMs = 180;

export const ConfirmationDialog: React.FC<IConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
  onAfterClose
}) => {
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
    }, dialogAnimationDurationMs);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = undefined;
      }
    };
  }, [isOpen, onAfterClose, shouldRender]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={isClosing ? `${styles.overlay} ${styles.overlayClosing}` : styles.overlay} role="presentation">
      <section
        aria-modal="true"
        className={isClosing ? `${styles.dialog} ${styles.dialogClosing}` : styles.dialog}
        role="dialog"
        aria-labelledby="confirmation-title"
      >
        <h2 id="confirmation-title">{title}</h2>
        <p>{message}</p>
        <div className={styles.actions}>
          <Button disabled={loading} label={cancelLabel} variant="secondary" onClick={onCancel} />
          <Button label={confirmLabel} loading={loading} variant={variant} onClick={onConfirm} />
        </div>
      </section>
    </div>
  );
};
