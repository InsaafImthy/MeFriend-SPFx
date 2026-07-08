import * as React from 'react';
import styles from './PageHeader.module.scss';

export interface IPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  titleId?: string;
}

export const PageHeader: React.FC<IPageHeaderProps> = ({ title, description, actions, titleId }) => (
  <div className={styles.header}>
    <div>
      <h2 className={styles.title} id={titleId}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
    {actions ? <div className={styles.actions}>{actions}</div> : null}
  </div>
);
