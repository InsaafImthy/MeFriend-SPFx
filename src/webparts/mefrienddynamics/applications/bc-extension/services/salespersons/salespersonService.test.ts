import type { ApiClient } from '../../../../shared/api/apiClient';
import { SalespersonService } from './salespersonService';

describe('SalespersonService.getSalespersonLookup', () => {
  it('loads every continuation page and returns normalized, deduplicated, sorted lookup items', async () => {
    const get = jest.fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            { code: ' s8 ', name: '' },
            { code: 'S1', name: 'First Salesperson' },
            { code: '', name: 'Missing Code' }
          ],
          pageSize: 100,
          hasNext: true,
          nextToken: 'page-2'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            { code: 'S8', name: 'Sajithi' },
            { code: 'a1', name: 'Short Code' }
          ],
          pageSize: 100,
          hasNext: true,
          nextToken: 'page-3'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            { code: ' s8 ', name: 'Later Duplicate Name' },
            { code: 'S2', name: 'Second Salesperson' }
          ],
          pageSize: 100,
          hasNext: false
        }
      });
    const service = new SalespersonService({ get } as unknown as ApiClient);

    const result = await service.getSalespersonLookup();

    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenNthCalledWith(1, '/api/Salespersons/lookup', {
      PageSize: 100,
      ContinuationToken: undefined,
      Search: undefined
    });
    expect(get).toHaveBeenNthCalledWith(2, '/api/Salespersons/lookup', {
      PageSize: 100,
      ContinuationToken: 'page-2',
      Search: undefined
    });
    expect(get).toHaveBeenNthCalledWith(3, '/api/Salespersons/lookup', {
      PageSize: 100,
      ContinuationToken: 'page-3',
      Search: undefined
    });
    expect(result).toEqual({
      items: [
        { code: 'A1', name: 'Short Code' },
        { code: 'S1', name: 'First Salesperson' },
        { code: 'S2', name: 'Second Salesperson' },
        { code: 'S8', name: 'Sajithi' }
      ],
      pageSize: 100,
      hasNext: false
    });
  });

  it('forwards search text through the canonical lookup contract', async () => {
    const get = jest.fn().mockResolvedValue({
      success: true,
      data: {
        items: [
          { code: ' s8 ', name: ' Sajithi ' },
          { code: 'S8', name: 'Duplicate' }
        ],
        pageSize: 100,
        hasNext: false
      }
    });
    const service = new SalespersonService({ get } as unknown as ApiClient);

    const result = await service.getSalespersonLookup('Sajithi');

    expect(get).toHaveBeenCalledWith('/api/Salespersons/lookup', {
      PageSize: 100,
      ContinuationToken: undefined,
      Search: 'Sajithi'
    });
    expect(result.items).toEqual([{ code: 'S8', name: 'Sajithi' }]);
  });

  it('rejects a repeated continuation token instead of looping indefinitely', async () => {
    const get = jest.fn().mockResolvedValue({
      success: true,
      data: {
        items: [],
        pageSize: 100,
        hasNext: true,
        nextToken: 'repeated-token'
      }
    });
    const service = new SalespersonService({ get } as unknown as ApiClient);

    await expect(service.getSalespersonLookup()).rejects.toThrow(
      'Business Central lookup pagination returned a repeated continuation token.'
    );
    expect(get).toHaveBeenCalledTimes(2);
  });
});
