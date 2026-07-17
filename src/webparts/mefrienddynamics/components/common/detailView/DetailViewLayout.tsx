import * as React from 'react';
import { Button } from '../buttons/Button';
import { ErrorState } from '../errorState/ErrorState';
import { Loader } from '../loaders/Loader';
import { LabelValue, LabelValueRenderType } from './LabelValue';
import styles from './DetailViewLayout.module.scss';

export interface IDetailViewField {
  key: string;
  label: string;
  value?: React.ReactNode;
  renderType?: LabelValueRenderType;
}

export interface IDetailViewSection {
  title: string;
  description?: string;
  fields?: readonly IDetailViewField[];
  customContent?: React.ReactNode;
}

export interface IDetailViewLayoutProps {
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  sections: readonly IDetailViewSection[];
  actions?: React.ReactNode;
  loading?: boolean;
  error?: string;
}

export const DetailViewLayout: React.FC<IDetailViewLayoutProps> = ({
  title,
  subtitle,
  backLabel = 'Back',
  onBack,
  sections,
  actions,
  loading = false,
  error
}) => (
  <section className={styles.detailView}>
    <header className={styles.header}>
      <div className={styles.headingSurface}>
        <div className={styles.heading}>
          {onBack ? <Button label={backLabel} variant="ghost" size="small" onClick={onBack} /> : null}
          <div className={styles.headingText}>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
    {loading ? <Loader type="page" message="Loading details" /> : null}
    {!loading && error ? <ErrorState title="Unable to load details" message={error} /> : null}
    {!loading && !error ? (
      <div className={styles.sections}>
        {sections.map(section => (
          <section className={styles.section} key={section.title}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionHeading}>
                <h3>{section.title}</h3>
                {section.description ? <p>{section.description}</p> : null}
              </div>
            </div>
            {section.fields && section.fields.length ? (
              <dl className={styles.fieldGrid}>
                {section.fields.map(field => (
                  <LabelValue key={field.key} label={field.label} value={field.value} renderType={field.renderType} />
                ))}
              </dl>
            ) : null}
            {section.customContent ? <div className={styles.customContent}>{section.customContent}</div> : null}
          </section>
        ))}
      </div>
    ) : null}
  </section>
);
