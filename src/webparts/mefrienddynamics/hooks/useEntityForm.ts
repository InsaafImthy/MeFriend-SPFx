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
      defaults[field.key] = initialValues[field.key];
      return;
    }

    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue as EntityFormValue;
      return;
    }

    defaults[field.key] = undefined;
  });

  return defaults;
};

const areValuesEqual = (left: EntityFormValues, right: EntityFormValues): boolean => JSON.stringify(left) === JSON.stringify(right);

export const useEntityForm = ({ fields, initialValues, onSubmit }: IUseEntityFormOptions): IUseEntityFormResult => {
  const fieldKeysSignature = React.useMemo(() => fields.map(field => field.key).join('|'), [fields]);
  const initialDefaults = React.useMemo(() => getDefaultValues(fields, initialValues), [fieldKeysSignature, initialValues]);
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
      const nextValues = {
        ...currentValues,
        [key]: value
      };
      const field = fields.filter(item => item.key === key)[0];

      if (field) {
        setErrors(currentErrors => ({
          ...currentErrors,
          [key]: validateFieldValue(field, value, nextValues)
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
    setValuesState(currentValues => ({
      ...currentValues,
      ...nextValues
    }));
    setTouched(currentTouched => {
      const nextTouched = { ...currentTouched };
      Object.keys(nextValues).forEach(key => {
        nextTouched[key] = true;
      });
      return nextTouched;
    });
  }, []);

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
