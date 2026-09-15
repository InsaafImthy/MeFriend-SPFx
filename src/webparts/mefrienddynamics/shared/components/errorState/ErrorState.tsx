import * as React from 'react';
import { Button } from '../buttons/Button';
import styles from './ErrorState.module.scss';

export interface IErrorStateProps {
  title: string;
  message: string;
  details?: string;
  retry?: () => void;
}

export const ErrorState: React.FC<IErrorStateProps> = ({ title, message, details, retry }) => (
  <section className={styles.errorState} role="alert">
    <div className={styles.icon} aria-hidden="true">
      !
    </div>
    <div className={styles.content}>
      <h2>{title}</h2>
      <p>{message}</p>
      {details ? <pre className={styles.details}>{details}</pre> : null}
      {retry ? <Button label="Retry" variant="secondary" onClick={retry} /> : null}
    </div>
  </section>
);
