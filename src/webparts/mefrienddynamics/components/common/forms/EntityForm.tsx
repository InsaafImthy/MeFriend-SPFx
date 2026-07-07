import * as React from 'react';
import { useEntityForm } from '../../../hooks/useEntityForm';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { EntityFormValue, EntityFormValues } from '../../../utils/validationUtils';
import { Button } from '../buttons/Button';
import { DatePicker } from '../datePicker/DatePicker';
import { Dropdown } from '../dropdowns/Dropdown';
import { InputField } from '../inputs/InputField';
import { FormSection } from './FormSection';
import styles from './Forms.module.scss';

export interface IEntityFormProps {
  fields?: readonly IFormFieldConfig[];
  initialValues?: EntityFormValues;
  children?: React.ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onSubmit?: (values: EntityFormValues) => void;
  onCancel?: () => void;
  actions?: React.ReactNode;
  onDirtyChange?: (isDirty: boolean) => void;
  onValidityChange?: (isValid: boolean) => void;
}

const getSectionTitle = (field: IFormFieldConfig): string => field.section || 'Details';

const toNumberValue = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

const renderField = (
  field: IFormFieldConfig,
  value: EntityFormValue,
  errorMessage: string | undefined,
  disabled: boolean,
  readOnly: boolean,
  setValue: (key: string, value: EntityFormValue) => void,
  validateField: (key: string) => void
): React.ReactNode => {
  const sharedDisabled = disabled || Boolean(field.disabled);
  const sharedReadOnly = readOnly || Boolean(field.readOnly);

  if (field.type === 'dropdown' || field.type === 'lookup') {
    const selectedValue = typeof value === 'string' || typeof value === 'number' ? value : undefined;

    return (
      <Dropdown
        key={field.key}
        label={field.label}
        value={selectedValue}
        options={field.options || []}
        required={field.required}
        disabled={sharedDisabled}
        readOnly={sharedReadOnly}
        errorMessage={errorMessage}
        onChange={nextValue => setValue(field.key, typeof nextValue === 'string' || typeof nextValue === 'number' ? nextValue : undefined)}
        placeholder={field.placeholder || 'Select'}
      />
    );
  }

  if (field.type === 'date') {
    return (
      <DatePicker
        key={field.key}
        label={field.label}
        value={typeof value === 'string' ? value : ''}
        required={field.required}
        disabled={sharedDisabled}
        readOnly={sharedReadOnly}
        errorMessage={errorMessage}
        onChange={nextValue => setValue(field.key, nextValue)}
      />
    );
  }

  const isNumericField = field.type === 'number' || field.type === 'amount';
  const textType = field.type === 'email' ? 'email' : field.type === 'textarea' ? 'textarea' : isNumericField ? 'number' : 'text';

  return (
    <InputField
      key={field.key}
      label={field.label}
      value={typeof value === 'number' || typeof value === 'string' ? value : ''}
      type={textType}
      placeholder={field.placeholder}
      required={field.required}
      disabled={sharedDisabled}
      readOnly={sharedReadOnly}
      errorMessage={errorMessage}
      onBlur={() => validateField(field.key)}
      onChange={nextValue => setValue(field.key, isNumericField ? toNumberValue(nextValue) : nextValue)}
    />
  );
};

export const EntityForm: React.FC<IEntityFormProps> = ({
  fields = [],
  initialValues,
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  disabled = false,
  readOnly = false,
  onSubmit,
  onCancel,
  actions,
  onDirtyChange,
  onValidityChange
}) => {
  const form = useEntityForm({ fields, initialValues, onSubmit });

  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(form.isDirty);
    }
  }, [form.isDirty, onDirtyChange]);

  React.useEffect(() => {
    if (onValidityChange) {
      onValidityChange(form.isValid);
    }
  }, [form.isValid, onValidityChange]);

  const sectionTitles = fields.reduce<string[]>((sections, field) => {
    const title = getSectionTitle(field);
    return sections.indexOf(title) === -1 ? [...sections, title] : sections;
  }, []);

  return (
    <form
      className={styles.entityForm}
      onSubmit={event => {
        event.preventDefault();
        form.handleSubmit();
      }}
    >
      <div className={styles.formBody}>
        {sectionTitles.map(sectionTitle => {
          const sectionFields = fields.filter(field => getSectionTitle(field) === sectionTitle);

          return (
            <FormSection key={sectionTitle} title={sectionTitle}>
              {sectionFields.map(field =>
                renderField(
                  field,
                  form.values[field.key],
                  form.touched[field.key] ? form.errors[field.key] : undefined,
                  disabled || loading,
                  readOnly,
                  form.setValue,
                  form.validateField
                )
              )}
            </FormSection>
          );
        })}
        {children}
      </div>
      <div className={styles.formActions}>
        {actions}
        {onCancel ? <Button label={cancelLabel} variant="secondary" disabled={loading || disabled} onClick={onCancel} /> : null}
        {onSubmit ? <Button label={submitLabel} type="submit" loading={loading} disabled={disabled || readOnly} /> : null}
      </div>
    </form>
  );
};
