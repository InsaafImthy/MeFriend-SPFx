export interface IValidationResult {
  isValid: boolean;
  errors: readonly string[];
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
}
