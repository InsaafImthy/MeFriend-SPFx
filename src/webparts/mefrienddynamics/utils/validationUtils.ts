import type { IFormFieldConfig, IValidationRule } from '../models/common/IFormFieldConfig';

export type EntityFormPrimitiveValue = string | number | boolean | undefined;
export type EntityFormValue = EntityFormPrimitiveValue | readonly EntityFormPrimitiveValue[];
export type EntityFormValues = Record<string, EntityFormValue>;
export type EntityFormErrors = Record<string, string | undefined>;

const isEmptyValue = (value: EntityFormValue): boolean => {
  if (value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
};

export const validateRequired = (value: EntityFormValue): boolean => !isEmptyValue(value);

export const validateEmail = (value: EntityFormValue): boolean => {
  if (isEmptyValue(value)) {
    return true;
  }

  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const validateNumber = (value: EntityFormValue): boolean => {
  if (isEmptyValue(value)) {
    return true;
  }

  return typeof value === 'number' && Number.isFinite(value);
};

export const validateMinLength = (value: EntityFormValue, minLength: number): boolean => {
  if (isEmptyValue(value)) {
    return true;
  }

  return typeof value === 'string' && value.length >= minLength;
};

export const validateMaxLength = (value: EntityFormValue, maxLength: number): boolean => {
  if (isEmptyValue(value)) {
    return true;
  }

  return typeof value === 'string' && value.length <= maxLength;
};

const validateRule = (rule: IValidationRule, value: EntityFormValue, values: Readonly<EntityFormValues>): boolean => {
  if (rule.type === 'required') {
    return validateRequired(value);
  }

  if (rule.type === 'minLength' && typeof rule.value === 'number') {
    return validateMinLength(value, rule.value);
  }

  if (rule.type === 'maxLength' && typeof rule.value === 'number') {
    return validateMaxLength(value, rule.value);
  }

  if (rule.type === 'min' && typeof rule.value === 'number') {
    return isEmptyValue(value) || (typeof value === 'number' && value >= rule.value);
  }

  if (rule.type === 'max' && typeof rule.value === 'number') {
    return isEmptyValue(value) || (typeof value === 'number' && value <= rule.value);
  }

  if (rule.type === 'pattern' && rule.pattern) {
    return isEmptyValue(value) || (typeof value === 'string' && rule.pattern.test(value));
  }

  if (rule.type === 'custom' && rule.validator) {
    return rule.validator(value, values);
  }

  return true;
};

export const validateFieldValue = (
  field: IFormFieldConfig,
  value: EntityFormValue,
  values: Readonly<EntityFormValues>
): string | undefined => {
  if (field.required && !validateRequired(value)) {
    return `${field.label} is required.`;
  }

  if (field.type === 'email' && !validateEmail(value)) {
    return 'Enter a valid email address.';
  }

  if ((field.type === 'number' || field.type === 'amount') && !validateNumber(value)) {
    return `${field.label} must be a valid number.`;
  }

  const failedRule = (field.validationRules || []).filter(rule => !validateRule(rule, value, values))[0];
  return failedRule ? failedRule.message : undefined;
};

export const validateFormValues = (
  fields: readonly IFormFieldConfig[],
  values: Readonly<EntityFormValues>
): EntityFormErrors => {
  const errors: EntityFormErrors = {};

  fields.forEach(field => {
    if (field.hidden) {
      errors[field.key] = undefined;
      return;
    }

    errors[field.key] = validateFieldValue(field, values[field.key], values);
  });

  return errors;
};

export const hasValidationErrors = (errors: Readonly<EntityFormErrors>): boolean => {
  return Object.keys(errors).filter(key => Boolean(errors[key])).length > 0;
};
