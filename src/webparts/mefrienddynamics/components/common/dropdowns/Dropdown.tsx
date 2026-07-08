import * as React from 'react';
import type { ILookupOption } from '../../../models/common/ILookupOption';
import styles from './Dropdown.module.scss';

export interface IDropdownProps<TValue = string> {
  label: string;
  value?: TValue;
  values?: readonly TValue[];
  options: readonly ILookupOption<TValue>[];
  searchable?: boolean;
  multiSelect?: boolean;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  readOnly?: boolean;
  errorMessage?: string;
  onChange?: (value: TValue | readonly TValue[] | undefined) => void;
  placeholder?: string;
}

export const Dropdown = <TValue extends string | number = string>({
  label,
  value,
  values = [],
  options,
  searchable = false,
  multiSelect = false,
  required = false,
  disabled = false,
  loading = false,
  readOnly = false,
  errorMessage,
  onChange,
  placeholder = 'Select'
}: IDropdownProps<TValue>): React.ReactElement => {
  const fieldId = React.useMemo(() => `dropdown-${Math.random().toString(36).substr(2, 9)}`, []);
  const errorId = `${fieldId}-error`;
  const [query, setQuery] = React.useState<string>('');
  const getOptionKeyByValue = (optionValue?: TValue): string => {
    const matchingOption = options.filter(option => String(option.value) === String(optionValue))[0];
    return matchingOption ? matchingOption.key : '';
  };
  const selectedKeys = values.map(item => getOptionKeyByValue(item)).filter(item => item);
  const isDisabled = disabled || loading || readOnly;
  const loadingId = `${fieldId}-loading`;
  const filteredOptions = searchable && query
    ? options.filter(option => option.text.toLowerCase().indexOf(query.toLowerCase()) !== -1)
    : options;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (!onChange || readOnly) {
      return;
    }

    if (multiSelect) {
      const nextValues: TValue[] = [];
      for (let index = 0; index < event.currentTarget.selectedOptions.length; index += 1) {
        const selectedOption = filteredOptions.filter(option => option.key === event.currentTarget.selectedOptions[index].value)[0];
        if (selectedOption) {
          nextValues.push(selectedOption.value);
        }
      }
      onChange(nextValues);
      return;
    }

    const nextOption = filteredOptions.filter(option => option.key === event.currentTarget.value)[0];
    onChange(nextOption ? nextOption.value : undefined);
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        <span>{label}</span>
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      {searchable ? (
        <input
          aria-label={`Search ${label}`}
          className={styles.search}
          disabled={isDisabled}
          onChange={event => setQuery(event.currentTarget.value)}
          placeholder={`Search ${label}`}
          type="search"
          value={query}
        />
      ) : null}
      <select
        aria-busy={loading}
        aria-describedby={errorMessage ? errorId : loading ? loadingId : undefined}
        aria-invalid={errorMessage ? true : undefined}
        className={errorMessage ? `${styles.control} ${styles.hasError}` : styles.control}
        disabled={isDisabled}
        id={fieldId}
        multiple={multiSelect}
        onChange={handleChange}
        required={required}
        value={multiSelect ? selectedKeys : value !== undefined ? getOptionKeyByValue(value) : ''}
      >
        {loading ? <option value="">Loading options...</option> : !multiSelect ? <option value="">{placeholder}</option> : null}
        {filteredOptions.map(option => (
          <option disabled={option.disabled} key={option.key} value={option.key}>
            {option.text}
          </option>
        ))}
      </select>
      {loading ? (
        <span className={styles.loadingText} id={loadingId} role="status">
          Loading {label.toLowerCase()} options
        </span>
      ) : null}
      {errorMessage ? (
        <span className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
