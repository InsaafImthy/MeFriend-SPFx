export interface ILookupOption<TValue = string> {
  key: string;
  text: string;
  value: TValue;
  disabled?: boolean;
}
