import * as React from 'react';
import styles from './InputField.module.scss';

export type InputFieldType = 'text' | 'number' | 'email' | 'textarea';

export interface IInputFieldProps {
  label: string;
  value?: string | number;
  type?: InputFieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  errorMessage?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  maxLength?: number;
  min?: number;
  max?: number;
}

export const InputField: React.FC<IInputFieldProps> = ({
  label,
  value = '',
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  readOnly = false,
  errorMessage,
  onChange,
  onBlur,
  maxLength,
  min,
  max
}) => {
  const fieldId = React.useMemo(() => `input-${Math.random().toString(36).substr(2, 9)}`, []);
  const errorId = `${fieldId}-error`;
  const sharedProps = {
    'aria-describedby': errorMessage ? errorId : undefined,
    'aria-invalid': errorMessage ? true : undefined,
    className: errorMessage ? `${styles.control} ${styles.hasError}` : styles.control,
    disabled,
    id: fieldId,
    maxLength,
    onBlur,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange && onChange(event.currentTarget.value),
    placeholder,
    readOnly,
    required,
    value
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={fieldId}>
        <span>{label}</span>
        {required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      {type === 'textarea' ? (
        <textarea {...sharedProps} rows={4} />
      ) : (
        <input {...sharedProps} max={max} min={min} type={type} />
      )}
      {errorMessage ? (
        <span className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
