export interface ILookupOption<TValue = string> {
  key: string;
  text: string;
  value: TValue;
  description?: string;
  detailText?: string;
  iconText?: string;
  disabled?: boolean;
}
