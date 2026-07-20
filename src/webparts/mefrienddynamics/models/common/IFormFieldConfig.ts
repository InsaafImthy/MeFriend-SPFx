import type { ILookupOption } from './ILookupOption';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'textarea'
  | 'number'
  | 'amount'
  | 'dropdown'
  | 'date'
  | 'checkbox'
  | 'lookup';

export type ValidationRuleType = 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'custom';

export interface IValidationRule {
  type: ValidationRuleType;
  value?: string | number | boolean;
  message: string;
  pattern?: RegExp;
  validator?: (value: unknown, values: Readonly<Record<string, unknown>>) => boolean;
}

export interface IFormFieldConfig<TValue = unknown> {
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: readonly ILookupOption[];
  placeholder?: string;
  defaultValue?: TValue;
  validationRules?: readonly IValidationRule[];
  readOnly?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  hidden?: boolean;
  section?: string;
}
