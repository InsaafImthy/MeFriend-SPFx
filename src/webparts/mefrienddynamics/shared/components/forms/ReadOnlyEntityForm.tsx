import * as React from 'react';
import type { IFormFieldConfig } from '../../models/IFormFieldConfig';
import type { EntityFormValues } from '../../utilities/validationUtils';
import { formatAmount, formatDate } from '../../utilities/formatUtils';
import { FormFooter } from './FormFooter';
import { FormSection } from './FormSection';
import formStyles from './Forms.module.scss';
import styles from './ReadOnlyEntityForm.module.scss';

export interface IReadOnlyEntityFormProps {
  fields?: readonly IFormFieldConfig[];
  values?: EntityFormValues;
  backLabel?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
}

const getSectionTitle = (field: IFormFieldConfig): string => field.section || 'Details';

const getDisplayValue = (field: IFormFieldConfig, values: EntityFormValues): string => {
  const rawValue = values[field.key];

  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return '-';
  }

  if ((field.type === 'dropdown' || field.type === 'lookup') && field.options) {
    const matchingOption = field.options.find(option => String(option.value) === String(rawValue));
    return matchingOption?.text || String(rawValue);
  }

  if (field.type === 'date') {
    return formatDate(typeof rawValue === 'string' ? rawValue : undefined);
  }

  if (field.type === 'amount') {
    const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
    return formatAmount(Number.isFinite(numericValue) ? numericValue : undefined);
  }

  return String(rawValue);
};

const renderField = (field: IFormFieldConfig, values: EntityFormValues): React.ReactNode => {
  const displayValue = getDisplayValue(field, values);
  const isPlaceholder = displayValue === '-';
  const isTextarea = field.type === 'textarea';

  return (
    <div className={styles.field} key={field.key}>
      <label className={styles.label}>
        <span>{field.label}</span>
        {field.required ? <span className={styles.required} aria-hidden="true">*</span> : null}
      </label>
      <div className={`${styles.control} ${isTextarea ? styles.textarea : ''}`}>
        <span className={isPlaceholder ? styles.placeholder : undefined}>{displayValue}</span>
      </div>
    </div>
  );
};

export const ReadOnlyEntityForm: React.FC<IReadOnlyEntityFormProps> = ({
  fields = [],
  values = {},
  backLabel = 'Back',
  onBack,
  actions
}) => {
  const visibleFields = fields.filter(field => field.hidden !== true);

  const sectionTitles = visibleFields.reduce<string[]>((sections, field) => {
    const title = getSectionTitle(field);
    return sections.indexOf(title) === -1 ? [...sections, title] : sections;
  }, []);

  return (
    <div className={formStyles.entityForm}>
      <div className={formStyles.formBody}>
        {sectionTitles.map(sectionTitle => {
          const sectionFields = visibleFields.filter(field => getSectionTitle(field) === sectionTitle);

          return (
            <FormSection key={sectionTitle} title={sectionTitle}>
              {sectionFields.map(field => renderField(field, values))}
            </FormSection>
          );
        })}
      </div>
      {onBack || actions ? <FormFooter actions={actions} cancelLabel={backLabel} onCancel={onBack} /> : null}
    </div>
  );
};
