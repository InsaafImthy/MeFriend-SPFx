import * as React from 'react';
import styles from './EmptyState.module.scss';

export interface IEmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<IEmptyStateProps> = ({ title, message, action }) => (
  <section className={styles.emptyState} aria-live="polite">
    <div className={styles.icon} aria-hidden="true" />
    <h2>{title}</h2>
    <p>{message}</p>
    {action ? <div className={styles.action}>{action}</div> : null}
  </section>
);
