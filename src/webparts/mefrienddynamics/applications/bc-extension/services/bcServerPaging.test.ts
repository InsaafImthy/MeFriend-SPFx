import type { ApiClient } from '../../../shared/api/apiClient';
import { createCursorPaginationState } from '../../../shared/utilities/serverPagination';
import { CustomerService } from './customers/customerService';
import { EventService } from './events/eventService';
import { InvoiceService } from './invoices/invoiceService';
import { SalesOrderService } from './salesOrders/salesOrderService';
import { SalespersonService } from './salespersons/salespersonService';
import type { IAppUser } from '../models/settings/IAppAccessModels';
import { missingSalespersonCodeMessage } from '../utils/salespersonDataScope';

const createApiClient = (data: unknown): { apiClient: ApiClient; get: jest.Mock } => {
  const get = jest.fn().mockResolvedValue({ success: true, data });

  return {
    apiClient: { get } as unknown as ApiClient,
    get
  };
};

const createAppUser = (overrides: Partial<IAppUser> = {}): IAppUser => ({
  id: 1,
  title: 'App User',
  email: 'user@example.com',
  role: 'User',
  companies: ['My Company'],
  canAccessApp: true,
  isActive: true,
  isSalesperson: false,
  ...overrides
});

describe('Business Central server paging services', () => {
  it('requests only the current customer page with remote filters and sorting', async () => {
    const { apiClient, get } = createApiClient({
      items: [{ id: '1', number: 'C-1', name: 'Customer 1', city: 'Kochi' }],
      pageSize: 20,
      hasNext: true,
      nextToken: 'next-customer-page'
    });
    const result = await new CustomerService(apiClient).getCustomers(
      { searchText: 'Customer', city: 'Kochi' },
      createCursorPaginationState(),
      { fieldName: 'customerName', direction: 'asc' }
    );

    expect(result.items).toHaveLength(1);
    expect(result.nextToken).toBe('next-customer-page');
    expect(get).toHaveBeenCalledWith('/api/Customers', expect.objectContaining({
      Search: 'Customer',
      'Filters[city]': 'Kochi',
      PageSize: 20,
      SortField: 'customerName',
      SortDirection: 'asc'
    }));
  });

  it('leaves customer result selection to the server while preserving cursor metadata', async () => {
    const { apiClient, get } = createApiClient({
      items: [
        { id: '2', number: 'C-2', name: 'Zulu', city: 'Kochi', stateCode: 'KL', gstCustomerType: 'Registered' },
        { id: '1', number: 'C-1', name: 'Alpha', city: 'Kochi', stateCode: 'KL', gstCustomerType: 'Registered' },
        { id: '3', number: 'C-3', name: 'Other', city: 'Chennai', stateCode: 'TN', gstCustomerType: 'Unregistered' }
      ],
      pageSize: 20,
      hasNext: true,
      nextToken: 'customer-next'
    });

    const result = await new CustomerService(apiClient).getCustomers(
      { city: 'kochi', stateCode: 'kl', gstCustomerType: 'registered' },
      createCursorPaginationState(),
      { fieldName: 'customerName', direction: 'asc' }
    );

    expect(result.items.map(item => item.customerCode)).toEqual(['C-2', 'C-1', 'C-3']);
    expect(result).toMatchObject({ pageSize: 20, hasNext: true, nextToken: 'customer-next' });
    expect(get).toHaveBeenCalledWith('/api/Customers', expect.objectContaining({
      'Filters[city]': 'kochi',
      'Filters[stateCode]': 'kl',
      'Filters[gstCustomerType]': 'registered',
      SortField: 'customerName'
    }));
  });

  it('sends sales order filters through the backend contract', async () => {
    const { apiClient, get } = createApiClient({
      items: [
        { id: '1', no: 'SO-1', customerCode: 'C-1', status: 'Released', salespersonCode: 'SP002', orderDate: '2026-09-01' },
        { id: '2', no: 'SO-2', customerCode: 'C-2', status: 'Open', salespersonCode: 'SP002', orderDate: '2026-09-01' },
        { id: '3', no: 'SO-3', customerCode: 'C-3', status: 'Released', salespersonCode: 'SP003', orderDate: '2026-09-01' }
      ],
      pageSize: 20,
      hasNext: false
    });

    const result = await new SalesOrderService(apiClient).getSalesOrders(
      { status: 'Released', salespersonCode: 'sp002' },
      createCursorPaginationState(),
      undefined,
      createAppUser()
    );

    expect(result.items.map(item => item.salesOrderNumber)).toEqual(['SO-1', 'SO-2', 'SO-3']);
    expect(get).toHaveBeenCalledWith('/api/SalesOrders', expect.objectContaining({
      'Filters[status]': 'Released',
      'Filters[salespersonCode]': 'SP002'
    }));
  });

  it('sends the restricted salesperson server-side for sales orders', async () => {
    const { apiClient, get } = createApiClient({
      items: [
        { id: '1', no: 'SO-1', SalespersonCode: ' sp001 ' }
      ],
      pageSize: 20,
      hasNext: true,
      nextToken: 'sales-order-next'
    });
    const currentUser = createAppUser({ isSalesperson: true, salespersonCode: ' sp001 ' });

    const result = await new SalesOrderService(apiClient).getSalesOrders(
      {},
      createCursorPaginationState(),
      undefined,
      currentUser
    );

    expect(result.items.map(item => item.salesOrderNumber)).toEqual(['SO-1']);
    expect(result.nextToken).toBe('sales-order-next');
    expect(get).toHaveBeenCalledWith('/api/SalesOrders', expect.objectContaining({
      'Filters[salespersonCode]': 'SP001'
    }));
  });

  it('sends outstanding-only and restricted salesperson filters server-side', async () => {
    const { apiClient, get } = createApiClient({
      items: [
        { invoiceNumber: 'INV-1', salesperson: 'SP001', totalAmount: 100, paidAmount: 20, invoiceStatus: 'Posted' }
      ],
      pageSize: 20,
      hasNext: true,
      nextToken: 'invoice-next'
    });

    const result = await new InvoiceService(apiClient).getInvoices(
      { outstandingOnly: true },
      createCursorPaginationState(),
      undefined,
      createAppUser({ isSalesperson: true, salespersonCode: 'SP001' })
    );

    expect(result.items.map(item => item.invoiceNumber)).toEqual(['INV-1']);
    expect(result).toMatchObject({ pageSize: 20, hasNext: true, nextToken: 'invoice-next' });
    expect(get).toHaveBeenCalledWith('/api/SalesInvoices', expect.objectContaining({
      'Filters[outstandingOnly]': true,
      'Filters[salespersonCode]': 'SP001'
    }));
  });

  it('sends normalized invoice date ranges through the backend filter contract', async () => {
    const { apiClient, get } = createApiClient({ items: [], pageSize: 20, hasNext: false });
    const service = new InvoiceService(apiClient);
    const pagination = createCursorPaginationState();

    await service.getInvoices({ invoiceDateFrom: '2026/9/2' }, pagination);
    await service.getInvoices({ invoiceDateTo: '30/09/2026' }, pagination);
    await service.getInvoices({ invoiceDateFrom: '2026-09-02', invoiceDateTo: '2026-09-30' }, pagination);
    await service.getInvoices({}, pagination);

    expect(get.mock.calls[0][1]).toMatchObject({
      'Filters[invoiceDateFrom]': '2026-09-02'
    });
    expect(get.mock.calls[0][1]['Filters[invoiceDateTo]']).toBeUndefined();
    expect(get.mock.calls[1][1]).toMatchObject({
      'Filters[invoiceDateTo]': '2026-09-30'
    });
    expect(get.mock.calls[1][1]['Filters[invoiceDateFrom]']).toBeUndefined();
    expect(get.mock.calls[2][1]).toMatchObject({
      'Filters[invoiceDateFrom]': '2026-09-02',
      'Filters[invoiceDateTo]': '2026-09-30'
    });
    expect(get.mock.calls[3][1]['Filters[invoiceDateFrom]']).toBeUndefined();
    expect(get.mock.calls[3][1]['Filters[invoiceDateTo]']).toBeUndefined();
    expect(get.mock.calls[2][1].invoiceDateFrom).toBeUndefined();
    expect(get.mock.calls[2][1].invoiceDateTo).toBeUndefined();
  });

  it('fails closed before requesting invoices or sales orders for a salesperson without a code', async () => {
    const invoice = createApiClient({ items: [], pageSize: 20, hasNext: false });
    const order = createApiClient({ items: [], pageSize: 20, hasNext: false });
    const currentUser = createAppUser({ isSalesperson: true, salespersonCode: '' });

    await expect(new InvoiceService(invoice.apiClient).getInvoices(
      {},
      createCursorPaginationState(),
      undefined,
      currentUser
    )).rejects.toThrow(missingSalespersonCodeMessage);
    await expect(new SalesOrderService(order.apiClient).getSalesOrders(
      {},
      createCursorPaginationState(),
      undefined,
      currentUser
    )).rejects.toThrow(missingSalespersonCodeMessage);
    expect(invoice.get).not.toHaveBeenCalled();
    expect(order.get).not.toHaveBeenCalled();
  });

  it('sends Event and Salesperson searches to their paged endpoints', async () => {
    const events = createApiClient({
      items: [
        { eventCode: 'E-1', eventName: 'Launch' }
      ],
      pageSize: 20,
      hasNext: false
    });
    const salespersons = createApiClient({
      items: [
        { code: 'SP002', name: 'Bob', email: 'bob@example.com' }
      ],
      pageSize: 20,
      hasNext: false
    });

    const eventResult = await new EventService(events.apiClient).getEvents(
      { searchText: 'Launch' },
      createCursorPaginationState()
    );
    const salespersonResult = await new SalespersonService(salespersons.apiClient).getSalespersons(
      { searchText: 'bob' },
      createCursorPaginationState()
    );

    expect(eventResult.items.map(item => item.eventCode)).toEqual(['E-1']);
    expect(salespersonResult.items.map(item => item.salespersonCode)).toEqual(['SP002']);
    expect(events.get).toHaveBeenCalledWith('/api/Events', expect.objectContaining({ Search: 'Launch' }));
    expect(salespersons.get).toHaveBeenCalledWith('/api/Salespersons', expect.objectContaining({ Search: 'bob' }));
  });

  it('uses the paged Events endpoint instead of expanded Dimensions', async () => {
    const { apiClient, get } = createApiClient({
      items: [{ id: 'event-id', eventCode: 'EVENT-1', eventName: 'Event 1' }],
      pageSize: 20,
      hasNext: false
    });

    await new EventService(apiClient).getEvents({ searchText: 'Event' }, createCursorPaginationState());

    expect(get).toHaveBeenCalledWith('/api/Events', expect.objectContaining({
      Search: 'Event',
      PageSize: 20
    }));
    expect(get).not.toHaveBeenCalledWith('/api/Dimensions', expect.anything());
  });

  it('uses direct record endpoints for every BC detail service', async () => {
    const customer = createApiClient({ id: 'customer/id', number: 'C-1', name: 'Customer' });
    const invoice = createApiClient({
      id: '42eadb99-be08-f111-8405-6045bde7abd0',
      invoiceNumber: 'INV/123'
    });
    const order = createApiClient({ id: 'order/id', salesOrderNumber: 'SO-1' });
    const salesperson = createApiClient({ id: 'salesperson/id', code: 'SP-1', name: 'Salesperson' });
    const event = createApiClient({ id: 'event/id', eventCode: 'E-1', eventName: 'Event' });

    await Promise.all([
      new CustomerService(customer.apiClient).getCustomerById('customer/id'),
      new InvoiceService(invoice.apiClient).getInvoiceByNumber(' INV/123 '),
      new SalesOrderService(order.apiClient).getSalesOrderById('SO-1'),
      new SalespersonService(salesperson.apiClient).getSalespersonById('SP-1'),
      new EventService(event.apiClient).getEventById('event/id')
    ]);

    expect(customer.get).toHaveBeenCalledWith('/api/Customers/customer%2Fid');
    expect(invoice.get).toHaveBeenCalledWith('/api/SalesInvoices/INV%2F123', { salespersonCode: undefined });
    expect(order.get).toHaveBeenCalledWith('/api/SalesOrders/SO-1', { salespersonCode: undefined });
    expect(salesperson.get).toHaveBeenCalledWith('/api/Salespersons/SP-1');
    expect(event.get).toHaveBeenCalledWith('/api/Events/event%2Fid');
  });

  it('loads every server-filtered related-invoice continuation page', async () => {
    const get = jest.fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [{ invoiceNo: 'INV-1', salesOrderNo: 'SO-1' }],
          pageSize: 100,
          hasNext: true,
          nextToken: 'related-page-2'
        }
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [{ invoiceNo: 'INV-2', salesOrderNo: 'SO-1' }],
          pageSize: 100,
          hasNext: false
        }
      });
    const service = new SalesOrderService({ get } as unknown as ApiClient);

    const result = await service.getInvoicesForSalesOrder('SO-1');

    expect(result.map(invoice => invoice.invoiceNumber)).toEqual(['INV-1', 'INV-2']);
    expect(get).toHaveBeenNthCalledWith(1, '/api/SalesInvoices', expect.objectContaining({
      PageSize: 100,
      ContinuationToken: undefined,
      'Filters[salesOrderNumber]': 'SO-1'
    }));
    expect(get).toHaveBeenNthCalledWith(2, '/api/SalesInvoices', expect.objectContaining({
      PageSize: 100,
      ContinuationToken: 'related-page-2',
      'Filters[salesOrderNumber]': 'SO-1'
    }));
  });

  it('maps the backend salesperson phone field with compatibility fallbacks', () => {
    const service = new SalespersonService({} as ApiClient);

    expect(service.mapSalespersonApiToUiModel({ code: 'SP-1', phone: '111' }).phoneNumber).toBe('111');
    expect(service.mapSalespersonApiToUiModel({ code: 'SP-2', phoneNo: '222' }).phoneNumber).toBe('222');
  });

  it('rejects a missing invoice number without calling the invoice detail endpoint', async () => {
    const invoice = createApiClient({
      id: '42eadb99-be08-f111-8405-6045bde7abd0',
      invoiceNumber: ''
    });

    await expect(new InvoiceService(invoice.apiClient).getInvoiceByNumber('   '))
      .rejects.toThrow('Invoice number is missing');
    expect(invoice.get).not.toHaveBeenCalled();
  });
});
