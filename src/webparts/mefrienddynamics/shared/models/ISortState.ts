export type SortDirection = 'asc' | 'desc';

export interface ISortState {
  fieldName: string;
  direction: SortDirection;
}
