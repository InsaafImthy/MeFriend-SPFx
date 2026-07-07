import * as React from 'react';
import styles from './ToastProvider.module.scss';

export interface IToastMessage {
  id: string;
  message: string;
}

export interface IToastContextValue {
  addToast: (message: string) => void;
}

const ToastContext = React.createContext<IToastContextValue>({
  addToast: () => undefined
});

export const useToast = (): IToastContextValue => React.useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = React.useState<readonly IToastMessage[]>([]);

  const addToast = React.useCallback((message: string): void => {
    const id = `${Date.now()}`;
    setMessages(currentMessages => [...currentMessages, { id, message }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className={styles.toastRegion} aria-live="polite" aria-relevant="additions">
        {messages.map(message => (
          <div key={message.id} className={styles.toast}>
            {message.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
