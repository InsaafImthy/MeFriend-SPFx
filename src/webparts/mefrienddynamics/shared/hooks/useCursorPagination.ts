import * as React from 'react';
import type { IBcPagedResult, ICursorPaginationState } from '../models/IServerPagination';
import {
  applyCursorPageResult,
  createCursorPaginationState,
  moveToCursorPage,
  resetCursorPaginationState
} from '../utilities/serverPagination';

export interface IUseCursorPaginationResult {
  pagination: ICursorPaginationState;
  applyResult: <TItem>(result: IBcPagedResult<TItem>) => void;
  changePage: (pageNumber: number) => void;
  reset: () => void;
}

export const useCursorPagination = (pageSize?: number): IUseCursorPaginationResult => {
  const [pagination, setPagination] = React.useState<ICursorPaginationState>(() =>
    createCursorPaginationState(pageSize)
  );

  const applyResult = React.useCallback(<TItem,>(result: IBcPagedResult<TItem>): void => {
    setPagination(current => applyCursorPageResult(current, result));
  }, []);

  const changePage = React.useCallback((pageNumber: number): void => {
    setPagination(current => moveToCursorPage(current, pageNumber));
  }, []);

  const reset = React.useCallback((): void => {
    setPagination(resetCursorPaginationState(pageSize));
  }, [pageSize]);

  return { pagination, applyResult, changePage, reset };
};
