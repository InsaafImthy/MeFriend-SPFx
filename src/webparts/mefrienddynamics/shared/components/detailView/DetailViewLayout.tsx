import * as React from 'react';
import { Icon } from '@fluentui/react';
import { Button } from '../buttons/Button';
import { ErrorState } from '../errorState/ErrorState';
import { FormFooter } from '../forms/FormFooter';
import { Loader } from '../loaders/Loader';
import { PageContainer } from '../pageContainer/PageContainer';
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
  footerActions?: React.ReactNode;
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
  footerActions,
  loading = false,
  error
}) => {
  const headerActions = onBack || actions ? (
    <>
      {onBack ? (
        <Button
          label={backLabel}
          variant="secondary"
          icon={<Icon iconName="ChevronLeft" aria-hidden="true" />}
          onClick={onBack}
        />
      ) : null}
      {actions}
    </>
  ) : undefined;

  return (
    <PageContainer title={title} description={subtitle} actions={headerActions}>
      <section className={styles.detailView}>
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
        {!loading && !error && footerActions ? <FormFooter actions={footerActions} /> : null}
      </section>
    </PageContainer>
  );
};
