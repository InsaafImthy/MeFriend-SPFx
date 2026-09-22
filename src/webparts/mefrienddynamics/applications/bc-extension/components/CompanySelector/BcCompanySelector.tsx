import * as React from 'react';
import { Icon } from '@fluentui/react';
import { Button } from '../../../../shared/components/buttons';
import { Dropdown } from '../../../../shared/components/dropdowns';
import type { ILookupOption } from '../../../../shared/models/ILookupOption';
import { buildPortalHref } from '../../../../shared/routing/hashPaths';
import { getBcCompanyLabel, type BcCompany } from '../../config/bcCompanies';
import styles from './BcCompanySelector.module.scss';

export interface IBcCompanySelectorProps {
  companies: readonly BcCompany[];
  onBack?: () => void;
  onEnter: (company: BcCompany) => void;
}

export const BcCompanySelector: React.FC<IBcCompanySelectorProps> = ({ companies, onBack, onEnter }) => {
  const [companyId, setCompanyId] = React.useState<string | undefined>(undefined);
  const selectedCompany = companies.filter(company => company.id === companyId)[0];
  const companyOptions = React.useMemo<readonly ILookupOption<string>[]>(() => companies.map(company => ({
    key: company.id,
    value: company.id,
    text: getBcCompanyLabel(company),
    detailText: company.displayName.trim() && company.displayName.trim() !== company.name
      ? company.name
      : undefined
  })), [companies]);

  const handleBack = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    if (onBack && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      onBack();
    }
  };

  return (
    <main className={styles.selector}>
      <section className={styles.card} aria-labelledby="bc-company-selector-title">
        <span className={styles.icon} aria-hidden="true"><Icon iconName="CityNext" /></span>
        <div className={styles.heading}>
          <span>MEFRIEND BC EXTENSION</span>
          <h1 id="bc-company-selector-title">Select Company</h1>
          <p>Choose the Business Central company you want to work with.</p>
        </div>
        <Dropdown
          label="Company"
          options={companyOptions}
          placeholder="Select a company"
          searchable
          showOptionDetails
          showSelectedDetail
          value={companyId}
          onChange={value => setCompanyId(typeof value === 'string' ? value : undefined)}
        />
        <Button
          disabled={!selectedCompany}
          label="Enter Company"
          onClick={() => selectedCompany && onEnter(selectedCompany)}
          size="large"
        />
        <a className={styles.backLink} href={buildPortalHref('apps')} onClick={handleBack}>
          <Icon iconName="Back" aria-hidden="true" />
          <span>Back to All Applications</span>
        </a>
      </section>
    </main>
  );
};
