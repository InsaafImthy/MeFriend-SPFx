export const DEFAULT_SERVER_PAGE_SIZE = 20;

export interface IBcPageRequest {
  pageSize: number;
  continuationToken?: string;
}

export interface IBcPagedResult<TItem> {
  items: readonly TItem[];
  pageSize: number;
  hasNext: boolean;
  nextToken?: string;
}

export interface ICursorPaginationState {
  pageNumber: number;
  pageSize: number;
  currentToken?: string;
  nextToken?: string;
  hasNext: boolean;
  pageTokens: Readonly<Record<number, string | undefined>>;
}
