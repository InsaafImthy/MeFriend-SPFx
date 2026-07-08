import * as React from 'react';
import { PageHeader } from '../pageHeader/PageHeader';
import styles from './PageContainer.module.scss';

export interface IPageContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const PageContainer: React.FC<IPageContainerProps> = ({ title, description, actions, children }) => (
  <section className={styles.pageContainer} aria-labelledby="mefriend-page-title">
    <PageHeader title={title} description={description} actions={actions} titleId="mefriend-page-title" />
    <div className={styles.body}>{children}</div>
  </section>
);
