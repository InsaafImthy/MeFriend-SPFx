import * as React from 'react';
import * as ReactDom from 'react-dom';
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

interface IFooterBounds {
  left: number;
  width: number;
}

const defaultBounds: IFooterBounds = {
  left: 0,
  width: 0
};

export const FormFooter: React.FC<IFormFooterProps> = ({
  actions,
  cancelLabel = 'Cancel',
  submitLabel = 'Save',
  loading = false,
  disabled = false,
  submitDisabled = false,
  onCancel,
  onSubmit
}) => {
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = React.useState<boolean>(false);
  const [bounds, setBounds] = React.useState<IFooterBounds>(defaultBounds);

  const measureFooter = React.useCallback((): void => {
    if (typeof window === 'undefined') {
      return;
    }

    const anchor = anchorRef.current;
    const content = anchor?.closest('[data-mefriend-content="true"]') as HTMLElement | null;
    const rect = content ? content.getBoundingClientRect() : undefined;

    setBounds({
      left: rect ? Math.max(0, rect.left) : 0,
      width: rect ? rect.width : window.innerWidth
    });
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted || typeof window === 'undefined') {
      return undefined;
    }

    const anchor = anchorRef.current;
    const content = anchor?.closest('[data-mefriend-content="true"]') as HTMLElement | null;
    let resizeObserver: ResizeObserver | undefined;
    let animationFrameId = 0;

    const scheduleMeasure = (): void => {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(measureFooter);
    };

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);

    if (content && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(content);
    }

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', scheduleMeasure);

      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [measureFooter, mounted]);

  const actionBar = (
    <div
      className={styles.bar}
      style={{
        left: bounds.left,
        width: bounds.width || '100%'
      }}
      role="group"
      aria-label="Form actions"
    >
      <div className={styles.actions}>
        {actions}
        {onCancel ? <Button label={cancelLabel} variant="secondary" disabled={loading || disabled} onClick={onCancel} /> : null}
        {onSubmit ? <Button label={submitLabel} type="button" loading={loading} disabled={disabled || submitDisabled} onClick={onSubmit} /> : null}
      </div>
    </div>
  );

  return (
    <>
      <div className={styles.anchor} ref={anchorRef} aria-hidden="true" />
      {mounted && typeof document !== 'undefined' ? ReactDom.createPortal(actionBar, document.body) : null}
    </>
  );
};
