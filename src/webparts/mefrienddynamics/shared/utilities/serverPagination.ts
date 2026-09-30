import type { QueryParams, QueryParamValue } from '../api/apiTypes';
import type { ISortState } from '../models/ISortState';
import {
  DEFAULT_SERVER_PAGE_SIZE,
  type IBcPagedResult,
  type ICursorPaginationState,
} from '../models/IServerPagination';

export type ServerFilterValues = Readonly<Record<string, QueryParamValue | readonly QueryParamValue[]>>;

export const createCursorPaginationState = (
  pageSize: number = DEFAULT_SERVER_PAGE_SIZE
): ICursorPaginationState => ({
  pageNumber: 1,
  pageSize,
  currentToken: undefined,
  nextToken: undefined,
  hasNext: false,
  pageTokens: { 1: undefined }
});

export const resetCursorPaginationState = (
  pageSize: number = DEFAULT_SERVER_PAGE_SIZE
): ICursorPaginationState => createCursorPaginationState(pageSize);

export const applyCursorPageResult = <TItem,>(
  state: ICursorPaginationState,
  result: IBcPagedResult<TItem>
): ICursorPaginationState => {
  const nextToken = result.hasNext ? result.nextToken : undefined;
  const pageTokens: Record<number, string | undefined> = {
    ...state.pageTokens
  };

  Object.keys(pageTokens).forEach(key => {
    if (Number(key) > state.pageNumber + 1) {
      delete pageTokens[Number(key)];
    }
  });

  if (nextToken) {
    pageTokens[state.pageNumber + 1] = nextToken;
  } else {
    delete pageTokens[state.pageNumber + 1];
  }

  return {
    ...state,
    pageSize: result.pageSize || state.pageSize,
    nextToken,
    hasNext: result.hasNext && Boolean(nextToken),
    pageTokens
  };
};

export const moveToCursorPage = (
  state: ICursorPaginationState,
  pageNumber: number
): ICursorPaginationState => {
  const targetPage = Math.max(1, pageNumber);
  const isPreviousPage = targetPage < state.pageNumber;
  const isNextPage = targetPage === state.pageNumber + 1;

  if (!isPreviousPage && !isNextPage && targetPage !== state.pageNumber) {
    return state;
  }

  if (isNextPage && (!state.hasNext || !state.nextToken)) {
    return state;
  }

  if (targetPage > 1 && !state.pageTokens[targetPage]) {
    return state;
  }

  return {
    ...state,
    pageNumber: targetPage,
    currentToken: state.pageTokens[targetPage],
    nextToken: undefined,
    hasNext: false
  };
};

export interface IBcPageQueryOptions {
  search?: string;
  filters?: ServerFilterValues;
}

export const buildBcPageQuery = (
  options: IBcPageQueryOptions,
  pagination: Pick<ICursorPaginationState, 'pageSize' | 'currentToken'>,
  sorting?: ISortState
): QueryParams => {
  const query: Record<string, QueryParamValue | readonly QueryParamValue[]> = {
    PageSize: pagination.pageSize,
    ContinuationToken: pagination.currentToken,
    Search: options.search,
    SortField: sorting?.fieldName,
    SortDirection: sorting?.direction
  };

  Object.keys(options.filters || {}).forEach(key => {
    query[`Filters[${key}]`] = options.filters?.[key];
  });

  return query;
};
