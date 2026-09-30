import { fetchAllBcLookupItems } from './bcLookupPagination';

describe('Business Central lookup pagination', () => {
  it('combines all continuation pages using the canonical query contract', async () => {
    const loadPage = jest.fn()
      .mockResolvedValueOnce({ items: [{ code: 'A' }], pageSize: 100, hasNext: true, nextToken: 'page-2' })
      .mockResolvedValueOnce({ items: [{ code: 'B' }], pageSize: 100, hasNext: false });

    await expect(fetchAllBcLookupItems(loadPage, 'abc')).resolves.toEqual([
      { code: 'A' },
      { code: 'B' }
    ]);
    expect(loadPage).toHaveBeenNthCalledWith(1, {
      PageSize: 100,
      ContinuationToken: undefined,
      Search: 'abc'
    });
    expect(loadPage).toHaveBeenNthCalledWith(2, {
      PageSize: 100,
      ContinuationToken: 'page-2',
      Search: 'abc'
    });
  });

  it('stops safely when hasNext has no token', async () => {
    const loadPage = jest.fn().mockResolvedValue({ items: [{ code: 'A' }], pageSize: 100, hasNext: true });

    await expect(fetchAllBcLookupItems(loadPage)).resolves.toEqual([{ code: 'A' }]);
    expect(loadPage).toHaveBeenCalledTimes(1);
  });
});
