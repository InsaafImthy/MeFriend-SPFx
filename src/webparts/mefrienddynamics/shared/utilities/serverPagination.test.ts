import {
  applyCursorPageResult,
  buildBcPageQuery,
  createCursorPaginationState,
  moveToCursorPage,
  resetCursorPaginationState
} from './serverPagination';

describe('cursor server pagination', () => {
  it('starts on the first 20-record page without a token', () => {
    expect(createCursorPaginationState()).toEqual({
      pageNumber: 1,
      pageSize: 20,
      currentToken: undefined,
      nextToken: undefined,
      hasNext: false,
      pageTokens: { 1: undefined }
    });
  });

  it('uses nextToken for Next and the known token for Previous', () => {
    const firstPage = applyCursorPageResult(createCursorPaginationState(), {
      items: [{ id: 1 }],
      pageSize: 20,
      hasNext: true,
      nextToken: 'page-2-token'
    });
    const secondPageRequest = moveToCursorPage(firstPage, 2);

    expect(secondPageRequest.currentToken).toBe('page-2-token');
    expect(buildBcPageQuery({}, secondPageRequest)).toMatchObject({
      PageSize: 20,
      ContinuationToken: 'page-2-token'
    });

    const secondPage = applyCursorPageResult(secondPageRequest, {
      items: [{ id: 2 }],
      pageSize: 20,
      hasNext: true,
      nextToken: 'page-3-token'
    });
    expect(moveToCursorPage(secondPage, 1).currentToken).toBeUndefined();
  });

  it('does not advance when hasNext is false', () => {
    const lastPage = applyCursorPageResult(createCursorPaginationState(), {
      items: [],
      pageSize: 20,
      hasNext: false
    });

    expect(moveToCursorPage(lastPage, 2)).toBe(lastPage);
  });

  it('discards token history when a filter or sort changes', () => {
    const firstPage = applyCursorPageResult(createCursorPaginationState(), {
      items: [{ id: 1 }],
      pageSize: 20,
      hasNext: true,
      nextToken: 'page-2-token'
    });
    const secondPage = moveToCursorPage(firstPage, 2);

    expect(resetCursorPaginationState(secondPage.pageSize)).toEqual(createCursorPaginationState(20));
  });

  it('builds remote filter and sort parameters', () => {
    expect(buildBcPageQuery(
      { search: 'ABC', filters: { status: 'Open' } },
      createCursorPaginationState(),
      { fieldName: 'name', direction: 'asc' }
    )).toEqual({
      PageSize: 20,
      ContinuationToken: undefined,
      Search: 'ABC',
      SortField: 'name',
      SortDirection: 'asc',
      'Filters[status]': 'Open'
    });
  });
});
