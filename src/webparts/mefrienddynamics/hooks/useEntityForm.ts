import * as React from 'react';
import type { IFormFieldConfig } from '../models/common/IFormFieldConfig';
import {
  EntityFormErrors,
  EntityFormValue,
  EntityFormValues,
  hasValidationErrors,
  validateFieldValue,
  validateFormValues
} from '../utils/validationUtils';
import { normalizeBusinessDate } from '../utils/formatUtils';

export type EntityFormTouched = Record<string, boolean>;

export interface IUseEntityFormOptions {
  fields: readonly IFormFieldConfig[];
  initialValues?: EntityFormValues;
  onSubmit?: (values: EntityFormValues) => void;
}

export interface IUseEntityFormResult {
  values: EntityFormValues;
  touched: EntityFormTouched;
  errors: EntityFormErrors;
  isDirty: boolean;
  isValid: boolean;
  setValue: (key: string, value: EntityFormValue) => void;
  setValues: (values: EntityFormValues) => void;
  validateField: (key: string) => string | undefined;
  validateForm: () => boolean;
  reset: (values?: EntityFormValues) => void;
  handleSubmit: () => boolean;
}

const getDefaultValues = (fields: readonly IFormFieldConfig[], initialValues?: EntityFormValues): EntityFormValues => {
  const defaults: EntityFormValues = {};

  fields.forEach(field => {
    if (initialValues && initialValues[field.key] !== undefined) {
      const initialValue = initialValues[field.key];
      defaults[field.key] = field.type === 'date' && typeof initialValue === 'string'
        ? normalizeBusinessDate(initialValue) || ''
        : initialValue;
      return;
    }

    if (field.defaultValue !== undefined) {
      const defaultValue = field.defaultValue as EntityFormValue;
      defaults[field.key] = field.type === 'date' && typeof defaultValue === 'string'
        ? normalizeBusinessDate(defaultValue) || ''
        : defaultValue;
      return;
    }

    defaults[field.key] = undefined;
  });

  return defaults;
};

const areValuesEqual = (left: EntityFormValues, right: EntityFormValues): boolean => JSON.stringify(left) === JSON.stringify(right);

export const useEntityForm = ({ fields, initialValues, onSubmit }: IUseEntityFormOptions): IUseEntityFormResult => {
  const fieldKeysSignature = React.useMemo(() => fields.map(field => field.key).join('|'), [fields]);
  const initialValuesSignature = React.useMemo(() => JSON.stringify(initialValues || {}), [initialValues]);
  const initialDefaults = React.useMemo(
    () => getDefaultValues(fields, initialValues),
    [fieldKeysSignature, initialValuesSignature]
  );
  const [values, setValuesState] = React.useState<EntityFormValues>(initialDefaults);
  const [touched, setTouched] = React.useState<EntityFormTouched>({});
  const [errors, setErrors] = React.useState<EntityFormErrors>({});
  const [baselineValues, setBaselineValues] = React.useState<EntityFormValues>(initialDefaults);

  React.useEffect(() => {
    setValuesState(initialDefaults);
    setBaselineValues(initialDefaults);
    setTouched({});
    setErrors({});
  }, [initialDefaults]);

  const setValue = React.useCallback((key: string, value: EntityFormValue): void => {
    setValuesState(currentValues => {
      const field = fields.filter(item => item.key === key)[0];
      const normalizedValue = field?.type === 'date' && typeof value === 'string'
        ? normalizeBusinessDate(value) || ''
        : value;
      const nextValues = {
        ...currentValues,
        [key]: normalizedValue
      };

      if (field) {
        setErrors(currentErrors => ({
          ...currentErrors,
          [key]: validateFieldValue(field, normalizedValue, nextValues)
        }));
      }

      return nextValues;
    });
    setTouched(currentTouched => ({
      ...currentTouched,
      [key]: true
    }));
  }, [fields]);

  const setValues = React.useCallback((nextValues: EntityFormValues): void => {
    const normalizedValues = Object.keys(nextValues).reduce<EntityFormValues>((values, key) => {
      const field = fields.filter(item => item.key === key)[0];
      const value = nextValues[key];

      values[key] = field?.type === 'date' && typeof value === 'string'
        ? normalizeBusinessDate(value) || ''
        : value;

      return values;
    }, {});

    setValuesState(currentValues => ({
      ...currentValues,
      ...normalizedValues
    }));
    setTouched(currentTouched => {
      const nextTouched = { ...currentTouched };
      Object.keys(normalizedValues).forEach(key => {
        nextTouched[key] = true;
      });
      return nextTouched;
    });
  }, [fields]);

  const validateField = React.useCallback((key: string): string | undefined => {
    const field = fields.filter(item => item.key === key)[0];
    const nextError = field ? validateFieldValue(field, values[key], values) : undefined;

    setErrors(currentErrors => ({
      ...currentErrors,
      [key]: nextError
    }));
    setTouched(currentTouched => ({
      ...currentTouched,
      [key]: true
    }));

    return nextError;
  }, [fields, values]);

  const validateForm = React.useCallback((): boolean => {
    const nextErrors = validateFormValues(fields, values);
    const nextTouched: EntityFormTouched = {};

    fields.forEach(field => {
      nextTouched[field.key] = true;
    });

    setErrors(nextErrors);
    setTouched(nextTouched);

    return !hasValidationErrors(nextErrors);
  }, [fields, values]);

  const reset = React.useCallback((nextValues?: EntityFormValues): void => {
    const resetValues = getDefaultValues(fields, nextValues || initialValues);
    setValuesState(resetValues);
    setBaselineValues(resetValues);
    setTouched({});
    setErrors({});
  }, [fields, initialValues]);

  const handleSubmit = React.useCallback((): boolean => {
    const isFormValid = validateForm();

    if (isFormValid && onSubmit) {
      onSubmit(values);
    }

    return isFormValid;
  }, [onSubmit, validateForm, values]);

  const isValid = !hasValidationErrors(validateFormValues(fields, values));

  return {
    errors,
    handleSubmit,
    isDirty: !areValuesEqual(values, baselineValues),
    isValid,
    reset,
    setValue,
    setValues,
    touched,
    validateField,
    validateForm,
    values
  };
};
