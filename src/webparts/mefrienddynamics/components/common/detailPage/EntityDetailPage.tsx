import * as React from 'react';
import { Icon } from '@fluentui/react';
import { Button } from '../buttons/Button';
import { ErrorState } from '../errorState/ErrorState';
import { Loader } from '../loaders/Loader';
import { PageContainer } from '../pageContainer/PageContainer';
import styles from './EntityDetailPage.module.scss';

export interface IEntityDetailPageProps {
  title: string;
  description?: string;
  backLabel: string;
  onBack: () => void;
  loading?: boolean;
  loadingMessage?: string;
  error?: string;
  children: React.ReactNode;
}

export interface IEntityDetailSectionProps {
  children: React.ReactNode;
  ariaLabel?: string;
}

export const EntityDetailSection: React.FC<IEntityDetailSectionProps> = ({ children, ariaLabel }) => (
  <section className={styles.section} aria-label={ariaLabel}>
    {children}
  </section>
);

export const EntityDetailPage: React.FC<IEntityDetailPageProps> = ({
  title,
  description,
  backLabel,
  onBack,
  loading = false,
  loadingMessage = 'Loading details',
  error,
  children
}) => (
  <PageContainer
    title={title}
    description={description}
    actions={
      <Button
        label={backLabel}
        variant="secondary"
        icon={<Icon iconName="ChevronLeft" aria-hidden="true" />}
        onClick={onBack}
      />
    }
  >
    {loading ? <Loader type="page" message={loadingMessage} /> : null}
    {!loading && error ? <ErrorState title="Unable to load details" message={error} /> : null}
    {!loading && !error ? <div className={styles.detailStack}>{children}</div> : null}
  </PageContainer>
);
