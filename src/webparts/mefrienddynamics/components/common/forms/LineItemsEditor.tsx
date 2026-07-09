import * as React from 'react';
import type { IFormFieldConfig } from '../../../models/common/IFormFieldConfig';
import type { EntityFormErrors, EntityFormValue, EntityFormValues } from '../../../utils/validationUtils';
import { hasValidationErrors, validateFormValues } from '../../../utils/validationUtils';
import { Button } from '../buttons/Button';
import { DatePicker } from '../datePicker/DatePicker';
import { Dropdown } from '../dropdowns/Dropdown';
import { EmptyState } from '../emptyState/EmptyState';
import { InputField } from '../inputs/InputField';
import styles from './Forms.module.scss';

export type LineItemRecord = Record<string, EntityFormValue>;
export type LineItemErrors = Record<number, EntityFormErrors>;

export interface ILineItemsEditorProps<TItem extends LineItemRecord> {
  title?: string;
  items: readonly TItem[];
  fields: readonly IFormFieldConfig[];
  addLabel?: string;
  disabled?: boolean;
  readOnly?: boolean;
  requireAtLeastOneLine?: boolean;
  showValidationErrors?: boolean;
  createDefaultItem?: () => TItem;
  calculateItem?: (item: TItem, changedKey: string) => TItem;
  validateLine?: (item: TItem, index: number) => EntityFormErrors;
  onChange: (items: readonly TItem[]) => void;
  getRowKey?: (item: TItem, index: number) => string;
  emptyTitle?: string;
  emptyMessage?: string;
}

const createDefaultLine = <TItem extends LineItemRecord>(fields: readonly IFormFieldConfig[]): TItem => {
  const lineItem: LineItemRecord = {};

  fields.forEach(field => {
    lineItem[field.key] = field.defaultValue as EntityFormValue;
  });

  return lineItem as TItem;
};

const getLineErrors = <TItem extends LineItemRecord>(
  fields: readonly IFormFieldConfig[],
  item: TItem,
  index: number,
  validateLine?: (item: TItem, index: number) => EntityFormErrors
): EntityFormErrors => {
  const configErrors = validateFormValues(fields, item as EntityFormValues);
  const customErrors = validateLine ? validateLine(item, index) : {};

  return {
    ...configErrors,
    ...customErrors
  };
};

const toNumberValue = (value: string): number | undefined => {
  if (!value.trim()) {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
};

export const LineItemsEditor = <TItem extends LineItemRecord>({
  title = 'Line items',
  items,
  fields,
  addLabel = 'Add line',
  disabled = false,
  readOnly = false,
  requireAtLeastOneLine = true,
  showValidationErrors = false,
  createDefaultItem,
  calculateItem,
  validateLine,
  onChange,
  getRowKey,
  emptyTitle = 'No line items',
  emptyMessage = 'Add line items to continue.'
}: ILineItemsEditorProps<TItem>): React.ReactElement => {
  const [touchedRows, setTouchedRows] = React.useState<Record<number, boolean>>({});
  const allLineErrors = items.reduce<LineItemErrors>((errors, item, index) => {
    errors[index] = getLineErrors(fields, item, index, validateLine);
    return errors;
  }, {});
  const hasLineErrors = Object.keys(allLineErrors).filter(index => hasValidationErrors(allLineErrors[Number(index)])).length > 0;
  const listError = requireAtLeastOneLine && items.length === 0 ? 'At least one line item is required.' : undefined;

  const updateLine = (index: number, key: string, value: EntityFormValue): void => {
    const nextItems = items.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item;
      }

      const nextItem = {
        ...item,
        [key]: value
      } as TItem;

      return calculateItem ? calculateItem(nextItem, key) : nextItem;
    });

    setTouchedRows(currentRows => ({
      ...currentRows,
      [index]: true
    }));
    onChange(nextItems);
  };

  const addLine = (): void => {
    const nextItem = createDefaultItem ? createDefaultItem() : createDefaultLine<TItem>(fields);
    onChange([...items, nextItem]);
  };

  const removeLine = (index: number): void => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  const renderCell = (field: IFormFieldConfig, item: TItem, rowIndex: number): React.ReactNode => {
    const value = item[field.key];
    const errorMessage = touchedRows[rowIndex] || showValidationErrors ? allLineErrors[rowIndex][field.key] : undefined;
    const fieldDisabled = disabled || Boolean(field.disabled);
    const fieldReadOnly = readOnly || Boolean(field.readOnly);

    if (field.type === 'dropdown' || field.type === 'lookup') {
      const selectedValue = typeof value === 'string' || typeof value === 'number' ? value : undefined;

      return (
        <Dropdown
          label={field.label}
          value={selectedValue}
          options={field.options || []}
          disabled={fieldDisabled}
          readOnly={fieldReadOnly}
          required={field.required}
          errorMessage={errorMessage}
          onChange={nextValue => updateLine(rowIndex, field.key, typeof nextValue === 'string' || typeof nextValue === 'number' ? nextValue : undefined)}
          placeholder={field.placeholder || 'Select'}
        />
      );
    }

    if (field.type === 'date') {
      return (
        <DatePicker
          label={field.label}
          value={typeof value === 'string' ? value : ''}
          disabled={fieldDisabled}
          readOnly={fieldReadOnly}
          required={field.required}
          errorMessage={errorMessage}
          onChange={nextValue => updateLine(rowIndex, field.key, nextValue)}
          useCustomPicker
        />
      );
    }

    const isNumericField = field.type === 'number' || field.type === 'amount';
    const textType = field.type === 'email' ? 'email' : field.type === 'textarea' ? 'textarea' : isNumericField ? 'number' : 'text';

    return (
      <InputField
        label={field.label}
        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
        type={textType}
        placeholder={field.placeholder}
        required={field.required}
        disabled={fieldDisabled}
        readOnly={fieldReadOnly}
        errorMessage={errorMessage}
        onBlur={() => setTouchedRows(currentRows => ({ ...currentRows, [rowIndex]: true }))}
        onChange={nextValue => updateLine(rowIndex, field.key, isNumericField ? toNumberValue(nextValue) : nextValue)}
      />
    );
  };

  return (
    <section className={styles.lineItems}>
      <div className={styles.lineItemsHeader}>
        <div>
          <h3>{title}</h3>
          {listError ? <p className={styles.lineError}>{listError}</p> : null}
          {hasLineErrors ? <p className={styles.lineError}>Review the highlighted line item fields.</p> : null}
        </div>
        <Button label={addLabel} variant="secondary" size="small" disabled={disabled || readOnly} onClick={addLine} />
      </div>
      {items.length ? (
        <>
          <div className={styles.lineItemsScroll}>
            <table className={styles.lineItemsTable}>
              <thead>
                <tr>
                  {fields.map(field => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                  <th aria-label="Line actions" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, rowIndex) => (
                  <tr key={getRowKey ? getRowKey(item, rowIndex) : String(rowIndex)}>
                    {fields.map(field => (
                      <td key={field.key}>{renderCell(field, item, rowIndex)}</td>
                    ))}
                    <td className={styles.lineActionCell}>
                      <Button
                        label="Remove"
                        variant="ghost"
                        size="small"
                        disabled={disabled || readOnly}
                        onClick={() => removeLine(rowIndex)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.lineItemsCards}>
            {items.map((item, rowIndex) => (
              <div className={styles.lineItemCard} key={getRowKey ? `card-${getRowKey(item, rowIndex)}` : `card-${rowIndex}`}>
                <div className={styles.lineItemCardHeader}>
                  <h4>Line {rowIndex + 1}</h4>
                  <Button
                    label="Remove"
                    variant="ghost"
                    size="small"
                    disabled={disabled || readOnly}
                    onClick={() => removeLine(rowIndex)}
                  />
                </div>
                <div className={styles.lineItemCardGrid}>
                  {fields.map(field => (
                    <div key={field.key}>{renderCell(field, item, rowIndex)}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title={emptyTitle} message={emptyMessage} action={<Button label={addLabel} variant="secondary" disabled={disabled || readOnly} onClick={addLine} />} />
      )}
    </section>
  );
};
