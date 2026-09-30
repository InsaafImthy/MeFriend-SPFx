import type { QueryParams } from '../api/apiTypes';
import { DEFAULT_SERVER_PAGE_SIZE, type IBcPagedResult } from '../models/IServerPagination';

export const MAX_BC_LOOKUP_PAGE_SIZE = 100;

export type BcLookupPageLoader<TItem> = (
  query: QueryParams
) => Promise<IBcPagedResult<TItem> | undefined>;

export const fetchAllBcLookupItems = async <TItem,>(
  loadPage: BcLookupPageLoader<TItem>,
  search?: string,
  pageSize: number = MAX_BC_LOOKUP_PAGE_SIZE
): Promise<readonly TItem[]> => {
  const allItems: TItem[] = [];
  const seenTokens = new Set<string>();
  let continuationToken: string | undefined;

  do {
    const page = await loadPage({
      PageSize: pageSize || DEFAULT_SERVER_PAGE_SIZE,
      ContinuationToken: continuationToken,
      Search: search
    });

    allItems.push(...(page?.items || []));

    const nextToken = page?.hasNext === true ? page.nextToken : undefined;
    if (!nextToken) {
      continuationToken = undefined;
      continue;
    }

    if (seenTokens.has(nextToken)) {
      throw new Error('Business Central lookup pagination returned a repeated continuation token.');
    }

    seenTokens.add(nextToken);
    continuationToken = nextToken;
  } while (continuationToken);

  return allItems;
};
