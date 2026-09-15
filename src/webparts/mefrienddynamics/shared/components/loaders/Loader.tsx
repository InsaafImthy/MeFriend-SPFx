import * as React from 'react';
import styles from './Loader.module.scss';

export type LoaderType = 'page' | 'table' | 'button' | 'inline';

export interface ILoaderProps {
  type?: LoaderType;
  message?: string;
}

export const Loader: React.FC<ILoaderProps> = ({ type = 'inline', message = 'Loading' }) => (
  <div className={`${styles.loader} ${styles[type]}`} role="status" aria-live="polite">
    <span className={styles.spinner} aria-hidden="true" />
    {type !== 'button' ? <span>{message}</span> : null}
  </div>
);
