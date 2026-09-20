import { ApiClient } from './apiClient';
import type { AuthClient } from './authClient';

describe('ApiClient contextual headers', () => {
  it('merges provider headers into the central request', async () => {
    const request = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '{"value":"complete"}'
    });
    const authClient = {
      getBaseUrl: () => 'https://api.example.test',
      request
    } as unknown as AuthClient;
    const apiClient = new ApiClient(authClient, {
      headerProvider: () => ({
        'X-BC-Company-Id': 'company-id',
        'X-BC-Company-Name': 'Canonical Company Name'
      })
    });

    await apiClient.get<{ value: string }>('/customers');

    expect(request).toHaveBeenCalledWith('https://api.example.test/customers', {
      method: 'GET',
      headers: {
        'X-BC-Company-Id': 'company-id',
        'X-BC-Company-Name': 'Canonical Company Name'
      },
      body: undefined
    });
  });
});

