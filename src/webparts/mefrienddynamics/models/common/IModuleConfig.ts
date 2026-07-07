import type { IFilterConfig } from './IFilterConfig';
import type { IFormFieldConfig } from './IFormFieldConfig';
import type { ITableColumn } from './ITableColumn';

export interface IModuleConfig<TListItem = unknown> {
  key: string;
  title: string;
  route: string;
  icon: string;
  description: string;
  createEnabled: boolean;
  detailEnabled: boolean;
  order: number;
  visible: boolean;
  tableColumns?: readonly ITableColumn<TListItem>[];
  filters?: readonly IFilterConfig[];
  formFields?: readonly IFormFieldConfig[];
}
