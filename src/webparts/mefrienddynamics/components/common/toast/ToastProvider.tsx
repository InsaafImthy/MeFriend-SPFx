import * as React from 'react';
import { IToastMessage, IToastOptions, ToastContext, ToastVariant } from './useToast';
import styles from './ToastProvider.module.scss';

const toastIconByVariant: Record<ToastVariant, string> = {
  error: '!',
  info: 'i',
  success: '✓',
  warning: '!'
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = React.useState<readonly IToastMessage[]>([]);

  const removeToast = React.useCallback((id: string): void => {
    setMessages(currentMessages => currentMessages.filter(message => message.id !== id));
  }, []);

  const showToast = React.useCallback((variant: ToastVariant, message: string, options?: IToastOptions): void => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const nextMessage: IToastMessage = {
      id,
      message,
      title: options && options.title,
      variant
    };
    setMessages(currentMessages => [...currentMessages, nextMessage]);

    window.setTimeout(() => removeToast(id), options && options.durationMs ? options.durationMs : 4500);
  }, [removeToast]);

  const contextValue = React.useMemo(() => ({
    addToast: (message: string): void => showToast('info', message),
    error: (message: string, options?: IToastOptions): void => showToast('error', message, options),
    info: (message: string, options?: IToastOptions): void => showToast('info', message, options),
    showToast,
    success: (message: string, options?: IToastOptions): void => showToast('success', message, options),
    warning: (message: string, options?: IToastOptions): void => showToast('warning', message, options)
  }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={styles.toastRegion} aria-live="polite" aria-relevant="additions">
        {messages.map(message => (
          <div key={message.id} className={`${styles.toast} ${styles[message.variant]}`}>
            <span className={styles.toastIcon} aria-hidden="true">
              {toastIconByVariant[message.variant]}
            </span>
            <div className={styles.toastContent}>
              {message.title ? <strong>{message.title}</strong> : null}
              <span>{message.message}</span>
            </div>
            <button
              aria-label="Dismiss notification"
              className={styles.dismiss}
              onClick={() => removeToast(message.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
