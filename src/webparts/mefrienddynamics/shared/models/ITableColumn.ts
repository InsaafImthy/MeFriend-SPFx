import * as React from 'react';

export type TableColumnRenderType = 'text' | 'date' | 'amount' | 'status' | 'tag' | 'document' | 'custom';
export type TableColumnAlign = 'left' | 'center' | 'right';

export interface ITableColumn<TItem> {
  key: string;
  header: string;
  fieldName: keyof TItem | string;
  sortable: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  align?: TableColumnAlign;
  renderType: TableColumnRenderType;
  customRender?: (item: TItem) => React.ReactNode;
}
