import * as React from 'react';
import type { IFilterConfig } from '../../../models/common/IFilterConfig';
import { Button } from '../buttons/Button';
import { DatePicker } from '../datePicker/DatePicker';
import { Dropdown } from '../dropdowns/Dropdown';
import { InputField } from '../inputs/InputField';
import styles from './EntityFilters.module.scss';

export type FilterValue = string | boolean | undefined;
export type EntityFilterValues = Record<string, FilterValue>;

export interface IEntityFiltersProps {
  filters: readonly IFilterConfig[];
  values: EntityFilterValues;
  onChange: (key: string, value: FilterValue) => void;
  onApply: () => void;
  onClear: () => void;
  loading?: boolean;
}

const primaryMobileFilterCount = 3;

export const EntityFilters: React.FC<IEntityFiltersProps> = ({ filters, values, onChange, onApply, onClear, loading = false }) => {
  const [isMobileMoreOpen, setIsMobileMoreOpen] = React.useState<boolean>(false);
  const mobilePrimaryFilters = filters.slice(0, primaryMobileFilterCount);
  const mobileSecondaryFilters = filters.slice(primaryMobileFilterCount);

  const renderFilter = (filter: IFilterConfig): React.ReactNode => {
    if (filter.type === 'dropdown' || filter.type === 'status') {
      return (
        <Dropdown
          key={filter.key}
          label={filter.label}
          value={typeof values[filter.key] === 'string' ? String(values[filter.key]) : undefined}
          options={filter.options || []}
          searchable={filter.searchable}
          disabled={loading || filter.disabled}
          loading={filter.loading}
          errorMessage={filter.errorMessage}
          onChange={value => onChange(filter.key, typeof value === 'string' ? value : undefined)}
          placeholder={filter.placeholder || 'All'}
        />
      );
    }

    if (filter.type === 'dateRange') {
      return (
        <div className={styles.dateRange} key={filter.key}>
          <DatePicker
            label={`${filter.label} From`}
            value={typeof values[`${filter.key}From`] === 'string' ? String(values[`${filter.key}From`]) : ''}
            disabled={loading}
            onChange={value => onChange(`${filter.key}From`, value)}
            showQuickActions
            useCustomPicker
          />
          <DatePicker
            label={`${filter.label} To`}
            value={typeof values[`${filter.key}To`] === 'string' ? String(values[`${filter.key}To`]) : ''}
            disabled={loading}
            onChange={value => onChange(`${filter.key}To`, value)}
            showQuickActions
            useCustomPicker
          />
        </div>
      );
    }

    if (filter.type === 'outstandingOnly') {
      return (
        <label className={styles.checkbox} key={filter.key}>
          <input
            checked={values[filter.key] === true}
            disabled={loading}
            onChange={event => {
              const checked = event.currentTarget.checked;
              onChange(filter.key, checked);
            }}
            type="checkbox"
          />
          <span>{filter.label}</span>
        </label>
      );
    }

    return (
      <InputField
        key={filter.key}
        label={filter.label}
        value={typeof values[filter.key] === 'string' ? String(values[filter.key]) : ''}
        disabled={loading}
        onChange={value => onChange(filter.key, value)}
        placeholder="Search"
        type="text"
      />
    );
  };

  return (
    <section className={styles.filters} aria-label="Filters">
      <div className={styles.desktopGrid}>{filters.map(renderFilter)}</div>
      <div className={styles.mobileFilters}>
        <div className={styles.mobileGrid}>{mobilePrimaryFilters.map(renderFilter)}</div>
        {mobileSecondaryFilters.length ? (
          <div className={styles.moreFilters}>
            <button
              aria-expanded={isMobileMoreOpen}
              className={styles.moreFiltersButton}
              onClick={() => setIsMobileMoreOpen(!isMobileMoreOpen)}
              type="button"
            >
              <span>More Filters</span>
              <span aria-hidden="true">{isMobileMoreOpen ? '-' : '+'}</span>
            </button>
            {isMobileMoreOpen ? <div className={styles.mobileGrid}>{mobileSecondaryFilters.map(renderFilter)}</div> : null}
          </div>
        ) : null}
      </div>
      <div className={styles.actions}>
        <Button label="Clear" variant="secondary" disabled={loading} onClick={onClear} />
        <Button label="Apply" variant="primary" loading={loading} onClick={onApply} />
      </div>
    </section>
  );
};
