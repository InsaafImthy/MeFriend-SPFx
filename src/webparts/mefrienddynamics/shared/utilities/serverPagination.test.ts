import {
  applyCursorPageResult,
  buildServerPageQuery,
  createCursorPaginationState,
  moveToCursorPage
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
    expect(buildServerPageQuery({}, secondPageRequest)).toMatchObject({
      pageSize: 20,
      continuationToken: 'page-2-token'
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

  it('builds remote filter and sort parameters', () => {
    expect(buildServerPageQuery(
      { searchText: 'ABC', status: 'Open' },
      createCursorPaginationState(),
      { fieldName: 'name', direction: 'asc' }
    )).toEqual({
      searchText: 'ABC',
      status: 'Open',
      pageSize: 20,
      continuationToken: undefined,
      sortBy: 'name',
      sortDirection: 'asc'
    });
  });
});
