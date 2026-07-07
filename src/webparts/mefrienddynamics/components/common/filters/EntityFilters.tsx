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

export const EntityFilters: React.FC<IEntityFiltersProps> = ({ filters, values, onChange, onApply, onClear, loading = false }) => (
  <section className={styles.filters} aria-label="Filters">
    <div className={styles.grid}>
      {filters.map(filter => {
        if (filter.type === 'dropdown' || filter.type === 'status') {
          return (
            <Dropdown
              key={filter.key}
              label={filter.label}
              value={typeof values[filter.key] === 'string' ? String(values[filter.key]) : undefined}
              options={filter.options || []}
              disabled={loading}
              onChange={value => onChange(filter.key, typeof value === 'string' ? value : undefined)}
              placeholder="All"
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
              />
              <DatePicker
                label={`${filter.label} To`}
                value={typeof values[`${filter.key}To`] === 'string' ? String(values[`${filter.key}To`]) : ''}
                disabled={loading}
                onChange={value => onChange(`${filter.key}To`, value)}
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
                onChange={event => onChange(filter.key, event.currentTarget.checked)}
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
      })}
    </div>
    <div className={styles.actions}>
      <Button label="Clear" variant="secondary" disabled={loading} onClick={onClear} />
      <Button label="Apply" variant="primary" loading={loading} onClick={onApply} />
    </div>
  </section>
);
