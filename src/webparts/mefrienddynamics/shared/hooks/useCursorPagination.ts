import * as React from 'react';
import type { ICursorPaginationState, IServerPagedResult } from '../models/IServerPagination';
import {
  applyCursorPageResult,
  createCursorPaginationState,
  moveToCursorPage
} from '../utilities/serverPagination';

export interface IUseCursorPaginationResult {
  pagination: ICursorPaginationState;
  applyResult: <TItem>(result: IServerPagedResult<TItem>) => void;
  changePage: (pageNumber: number) => void;
  reset: () => void;
}

export const useCursorPagination = (pageSize?: number): IUseCursorPaginationResult => {
  const [pagination, setPagination] = React.useState<ICursorPaginationState>(() =>
    createCursorPaginationState(pageSize)
  );

  const applyResult = React.useCallback(<TItem,>(result: IServerPagedResult<TItem>): void => {
    setPagination(current => applyCursorPageResult(current, result));
  }, []);

  const changePage = React.useCallback((pageNumber: number): void => {
    setPagination(current => moveToCursorPage(current, pageNumber));
  }, []);

  const reset = React.useCallback((): void => {
    setPagination(createCursorPaginationState(pageSize));
  }, [pageSize]);

  return { pagination, applyResult, changePage, reset };
};
