import * as React from 'react';

export type TableColumnRenderType = 'text' | 'date' | 'amount' | 'status' | 'custom';

export interface ITableColumn<TItem> {
  key: string;
  header: string;
  fieldName: keyof TItem | string;
  sortable: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  renderType: TableColumnRenderType;
  customRender?: (item: TItem) => React.ReactNode;
}
