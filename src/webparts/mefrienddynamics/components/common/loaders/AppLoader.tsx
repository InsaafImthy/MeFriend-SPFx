import * as React from 'react';
import styles from './AppLoader.module.scss';

export interface IAppLoaderProps {
  label?: string;
}

export const AppLoader: React.FC<IAppLoaderProps> = ({ label = 'Loading' }) => (
  <div className={styles.loader} role="status" aria-live="polite">
    <span className={styles.spinner} aria-hidden="true" />
    <span>{label}</span>
  </div>
);
