import * as React from 'react';
import styles from './Forms.module.scss';

export interface IFormSectionProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const FormSection: React.FC<IFormSectionProps> = ({ title, description, children }) => (
  <section className={styles.formSection}>
    <div className={styles.sectionHeader}>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
    <div className={styles.formGrid}>{children}</div>
  </section>
);
