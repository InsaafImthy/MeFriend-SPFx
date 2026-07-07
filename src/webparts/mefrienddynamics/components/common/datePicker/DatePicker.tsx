import * as React from 'react';
import styles from './DatePicker.module.scss';

export interface IDatePickerProps {
  label: string;
  value?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  errorMessage?: string;
  onChange?: (value: string) => void;
  minDate?: string;
  maxDate?: string;
}

export const DatePicker: React.FC<IDatePickerProps> = ({
  label,
  value = '',
  required = false,
  disabled = false,
  readOnly = false,
  errorMessage,
  onChange,
  minDate,
  maxDate
}) => {
  const fieldId = React.useMemo(() => `date-${Math.random().toString(36).substr(2, 9)}`, []);
  const errorId = `${fieldId}-error`;

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        <span>{label}</span>
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <input
        aria-describedby={errorMessage ? errorId : undefined}
        aria-invalid={errorMessage ? true : undefined}
        className={errorMessage ? `${styles.control} ${styles.hasError}` : styles.control}
        disabled={disabled}
        id={fieldId}
        max={maxDate}
        min={minDate}
        onChange={event => onChange && onChange(event.currentTarget.value)}
        readOnly={readOnly}
        required={required}
        type="date"
        value={value}
      />
      {errorMessage ? (
        <span className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
