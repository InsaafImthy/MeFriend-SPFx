import * as React from 'react';
import styles from './Forms.module.scss';

export interface IFormSectionProps {
  title: string;
  description?: string;
  collapsed?: boolean;
  children?: React.ReactNode;
  onToggle?: () => void;
}

export const FormSection: React.FC<IFormSectionProps> = ({ title, description, collapsed = false, children, onToggle }) => (
  <section className={collapsed ? `${styles.formSection} ${styles.formSectionCollapsed}` : styles.formSection}>
    <div className={styles.sectionHeader}>
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {onToggle ? (
        <button
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
          className={styles.sectionToggle}
          onClick={onToggle}
          type="button"
        >
          <span aria-hidden="true">{collapsed ? '+' : '-'}</span>
        </button>
      ) : null}
    </div>
    <div className={styles.formGrid}>{children}</div>
  </section>
);
