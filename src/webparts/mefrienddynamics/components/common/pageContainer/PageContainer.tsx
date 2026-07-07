import * as React from 'react';
import styles from './PageContainer.module.scss';

export interface IPageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageContainer: React.FC<IPageContainerProps> = ({ title, description, actions, children }) => (
  <section className={styles.pageContainer} aria-labelledby="mefriend-page-title">
    <div className={styles.header}>
      <div>
        <h2 id="mefriend-page-title">{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
    <div className={styles.body}>{children}</div>
  </section>
);
