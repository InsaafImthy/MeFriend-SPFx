import type { IAppRouteDefinition } from '../models/common/AppRoute';
import type { IModuleDefinition } from '../models/common/ModuleDefinition';

export const moduleDefinitions: readonly IModuleDefinition[] = [
  {
    key: 'customers',
    title: 'Customer Master',
    description: 'Customer listing, details, search, filtering, and creation.',
    defaultRouteKey: 'customers',
    status: 'ready'
  },
  {
    key: 'events',
    title: 'Event View',
    description: 'Read-only event listing with search and filtering.',
    defaultRouteKey: 'events',
    status: 'pendingContract'
  },
  {
    key: 'salespersons',
    title: 'Salesperson View',
    description: 'Read-only salesperson listing with search and filtering.',
    defaultRouteKey: 'salespersons',
    status: 'pendingContract'
  },
  {
    key: 'invoices',
    title: 'Invoice View',
    description: 'Invoice listing, details, outstanding, and payment visibility.',
    defaultRouteKey: 'invoices',
    status: 'pendingContract'
  },
  {
    key: 'salesOrders',
    title: 'Sales Order',
    description: 'Sales order listing, detail, creation, lines, and related invoices.',
    defaultRouteKey: 'salesOrders',
    status: 'pendingContract'
  }
];

export const routeDefinitions: readonly IAppRouteDefinition[] = [
  {
    key: 'customers',
    path: 'customers',
    title: 'Customer Master',
    moduleKey: 'customers',
    showInNavigation: true
  },
  {
    key: 'events',
    path: 'events',
    title: 'Event View',
    moduleKey: 'events',
    showInNavigation: true
  },
  {
    key: 'salespersons',
    path: 'salespersons',
    title: 'Salesperson View',
    moduleKey: 'salespersons',
    showInNavigation: true
  },
  {
    key: 'invoices',
    path: 'invoices',
    title: 'Invoice View',
    moduleKey: 'invoices',
    showInNavigation: true
  },
  {
    key: 'invoiceDetail',
    path: 'invoices/detail/:id',
    title: 'Invoice Detail',
    moduleKey: 'invoices',
    showInNavigation: false
  },
  {
    key: 'salesOrders',
    path: 'sales-orders',
    title: 'Sales Order',
    moduleKey: 'salesOrders',
    showInNavigation: true
  },
  {
    key: 'salesOrderCreate',
    path: 'sales-orders/create',
    title: 'Create Sales Order',
    moduleKey: 'salesOrders',
    showInNavigation: false
  },
  {
    key: 'salesOrderDetail',
    path: 'sales-orders/detail/:id',
    title: 'Sales Order Detail',
    moduleKey: 'salesOrders',
    showInNavigation: false
  }
];
