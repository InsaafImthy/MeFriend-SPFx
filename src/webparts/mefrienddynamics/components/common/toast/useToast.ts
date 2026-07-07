import * as React from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface IToastOptions {
  title?: string;
  durationMs?: number;
}

export interface IToastMessage {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
}

export interface IToastContextValue {
  showToast: (variant: ToastVariant, message: string, options?: IToastOptions) => void;
  success: (message: string, options?: IToastOptions) => void;
  error: (message: string, options?: IToastOptions) => void;
  warning: (message: string, options?: IToastOptions) => void;
  info: (message: string, options?: IToastOptions) => void;
  addToast: (message: string) => void;
}

export const ToastContext = React.createContext<IToastContextValue>({
  addToast: () => undefined,
  error: () => undefined,
  info: () => undefined,
  showToast: () => undefined,
  success: () => undefined,
  warning: () => undefined
});

export const useToast = (): IToastContextValue => React.useContext(ToastContext);
