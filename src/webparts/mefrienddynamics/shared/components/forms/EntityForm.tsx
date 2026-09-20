import * as React from 'react';
import { useEntityForm } from '../../hooks/useEntityForm';
import type { IFormFieldConfig } from '../../models/IFormFieldConfig';
import type { EntityFormValue, EntityFormValues } from '../../utilities/validationUtils';
import { DatePicker } from '../datePicker/DatePicker';
import { Dropdown } from '../dropdowns/Dropdown';
import { InputField } from '../inputs/InputField';
import { FormFooter } from './FormFooter';
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
  lookupLoadingKeys?: Readonly<Record<string, boolean>>;
  onDirtyChange?: (isDirty: boolean) => void;
  onValidityChange?: (isValid: boolean) => void;
  onValuesChange?: (values: EntityFormValues) => void;
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
  lookupLoading: boolean,
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
        loading={lookupLoading || field.loading}
        readOnly={sharedReadOnly}
        errorMessage={errorMessage}
        onChange={nextValue => setValue(field.key, typeof nextValue === 'string' || typeof nextValue === 'number' ? nextValue : undefined)}
        placeholder={field.placeholder || 'Select'}
        searchable={field.searchable || field.type === 'lookup'}
        remoteSearch={field.remoteSearch}
        onSearch={field.onSearch}
        showOptionDetails={field.type === 'lookup'}
        showSelectedDetail={field.type === 'lookup'}
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
        showQuickActions
        useCustomPicker
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
  lookupLoadingKeys = {},
  onDirtyChange,
  onValidityChange,
  onValuesChange
}) => {
  const form = useEntityForm({ fields, initialValues, onSubmit });
  const [collapsedSections, setCollapsedSections] = React.useState<Readonly<Record<string, boolean>>>({});

  const visibleFields = React.useMemo(
    () => fields.filter(field => field.hidden !== true),
    [fields]
  );

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

  React.useEffect(() => {
    if (onValuesChange) {
      onValuesChange(form.values);
    }
  }, [form.values, onValuesChange]);

  const sectionTitles = visibleFields.reduce<string[]>((sections, field) => {
    const title = getSectionTitle(field);
    return sections.indexOf(title) === -1 ? [...sections, title] : sections;
  }, []);

  React.useEffect(() => {
    setCollapsedSections(currentSections => {
      const nextSections: Record<string, boolean> = {};

      sectionTitles.forEach((sectionTitle, index) => {
        nextSections[sectionTitle] = currentSections[sectionTitle] !== undefined ? currentSections[sectionTitle] : index > 0;
      });

      return nextSections;
    });
  }, [sectionTitles.join('|')]);

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
          const sectionFields = visibleFields.filter(field => getSectionTitle(field) === sectionTitle);

          return (
            <FormSection
              key={sectionTitle}
              title={sectionTitle}
              collapsed={collapsedSections[sectionTitle] === true}
              onToggle={() => {
                setCollapsedSections(currentSections => ({
                  ...currentSections,
                  [sectionTitle]: currentSections[sectionTitle] !== true
                }));
              }}
            >
              {sectionFields.map(field =>
                renderField(
                  field,
                  form.values[field.key],
                  form.touched[field.key] ? form.errors[field.key] : undefined,
                  disabled || loading,
                  readOnly,
                  lookupLoadingKeys[field.key] === true,
                  form.setValue,
                  form.validateField
                )
              )}
            </FormSection>
          );
        })}
        {children}
      </div>
      <FormFooter
        actions={actions}
        cancelLabel={cancelLabel}
        submitLabel={submitLabel}
        loading={loading}
        disabled={disabled}
        submitDisabled={readOnly}
        onCancel={onCancel}
        onSubmit={onSubmit ? form.handleSubmit : undefined}
      />
    </form>
  );
};
