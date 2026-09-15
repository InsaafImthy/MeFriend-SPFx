export interface IPagedResult<TItem> {
  items: readonly TItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
