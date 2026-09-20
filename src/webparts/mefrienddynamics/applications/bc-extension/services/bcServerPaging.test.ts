import type { ApiClient } from '../../../shared/api/apiClient';
import { createCursorPaginationState } from '../../../shared/utilities/serverPagination';
import { CustomerService } from './customers/customerService';
import { EventService } from './events/eventService';
import { InvoiceService } from './invoices/invoiceService';
import { SalesOrderService } from './salesOrders/salesOrderService';
import { SalespersonService } from './salespersons/salespersonService';

const createApiClient = (data: unknown): { apiClient: ApiClient; get: jest.Mock } => {
  const get = jest.fn().mockResolvedValue({ success: true, data });

  return {
    apiClient: { get } as unknown as ApiClient,
    get
  };
};

describe('Business Central server paging services', () => {
  it('requests only the current customer page with remote filters and sorting', async () => {
    const { apiClient, get } = createApiClient({
      items: [{ id: '1', number: 'C-1', name: 'Customer 1' }],
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
      searchText: 'Customer',
      city: 'Kochi',
      pageSize: 20,
      sortBy: 'customerName',
      sortDirection: 'asc'
    }));
  });

  it('uses the paged Events endpoint instead of expanded Dimensions', async () => {
    const { apiClient, get } = createApiClient({
      items: [{ id: 'event-id', eventCode: 'EVENT-1', eventName: 'Event 1' }],
      pageSize: 20,
      hasNext: false
    });

    await new EventService(apiClient).getEvents({ searchText: 'Event' }, createCursorPaginationState());

    expect(get).toHaveBeenCalledWith('/api/Events', expect.objectContaining({
      searchText: 'Event',
      pageSize: 20
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
      new SalesOrderService(order.apiClient).getSalesOrderById('order/id'),
      new SalespersonService(salesperson.apiClient).getSalespersonById('salesperson/id'),
      new EventService(event.apiClient).getEventById('event/id')
    ]);

    expect(customer.get).toHaveBeenCalledWith('/api/Customers/customer%2Fid');
    expect(invoice.get).toHaveBeenCalledWith('/api/SalesInvoices/INV%2F123', { salesPerson: undefined });
    expect(order.get).toHaveBeenCalledWith('/api/SalesOrders/order%2Fid', { salesperson: undefined });
    expect(salesperson.get).toHaveBeenCalledWith('/api/Salespersons/salesperson%2Fid');
    expect(event.get).toHaveBeenCalledWith('/api/Events/event%2Fid');
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
