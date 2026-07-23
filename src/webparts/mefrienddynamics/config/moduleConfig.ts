import type { IAppRouteDefinition } from '../models/common/AppRoute';
import { customersModuleConfig } from './modules/customersModuleConfig';
import { eventsModuleConfig } from './modules/eventsModuleConfig';
import { invoicesModuleConfig } from './modules/invoicesModuleConfig';
import { salesOrdersModuleConfig } from './modules/salesOrdersModuleConfig';
import { salespersonsModuleConfig } from './modules/salespersonsModuleConfig';
import type { IModuleConfig } from '../models/common/IModuleConfig';

export const settingsModuleConfig: IModuleConfig = {
  key: 'settings',
  title: 'Settings',
  route: 'settings',
  icon: 'Settings',
  description: 'Permission and access-control settings.',
  createEnabled: false,
  detailEnabled: false,
  order: 99,
  visible: true
};

export const moduleDefinitions = [
  customersModuleConfig,
  eventsModuleConfig,
  salespersonsModuleConfig,
  invoicesModuleConfig,
  salesOrdersModuleConfig,
  settingsModuleConfig
] as const;

export const routeDefinitions: readonly IAppRouteDefinition[] = [
  {
    key: 'customers',
    path: customersModuleConfig.route,
    title: customersModuleConfig.title,
    moduleKey: customersModuleConfig.key,
    showInNavigation: true
  },
  {
    key: 'customerCreate',
    path: `${customersModuleConfig.route}/create`,
    title: 'Create Customer',
    moduleKey: customersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'customerDetail',
    path: `${customersModuleConfig.route}/detail/:id`,
    title: 'Customer Detail',
    moduleKey: customersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'customerRequests',
    path: `${customersModuleConfig.route}/requests`,
    title: 'Customer Requests',
    moduleKey: customersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'customerRequestDetail',
    path: `${customersModuleConfig.route}/requests/detail/:id`,
    title: 'Customer Request Detail',
    moduleKey: customersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'events',
    path: eventsModuleConfig.route,
    title: eventsModuleConfig.title,
    moduleKey: eventsModuleConfig.key,
    showInNavigation: true
  },
  {
    key: 'eventDetail',
    path: `${eventsModuleConfig.route}/detail/:id`,
    title: 'Event Detail',
    moduleKey: eventsModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'salespersons',
    path: salespersonsModuleConfig.route,
    title: salespersonsModuleConfig.title,
    moduleKey: salespersonsModuleConfig.key,
    showInNavigation: true
  },
  {
    key: 'salespersonDetail',
    path: `${salespersonsModuleConfig.route}/detail/:id`,
    title: 'Salesperson Detail',
    moduleKey: salespersonsModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'invoices',
    path: invoicesModuleConfig.route,
    title: invoicesModuleConfig.title,
    moduleKey: invoicesModuleConfig.key,
    showInNavigation: true
  },
  {
    key: 'invoiceDetail',
    path: `${invoicesModuleConfig.route}/detail/:id`,
    title: 'Invoice Detail',
    moduleKey: invoicesModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'salesOrders',
    path: salesOrdersModuleConfig.route,
    title: salesOrdersModuleConfig.title,
    moduleKey: salesOrdersModuleConfig.key,
    showInNavigation: true
  },
  {
    key: 'salesOrderCreate',
    path: `${salesOrdersModuleConfig.route}/create`,
    title: 'Create Sales Order',
    moduleKey: salesOrdersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'salesOrderDetail',
    path: `${salesOrdersModuleConfig.route}/detail/:id`,
    title: 'Sales Order Detail',
    moduleKey: salesOrdersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'salesOrderRequests',
    path: `${salesOrdersModuleConfig.route}/requests`,
    title: 'Sales Order Requests',
    moduleKey: salesOrdersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'salesOrderRequestDetail',
    path: `${salesOrdersModuleConfig.route}/requests/detail/:id`,
    title: 'Sales Order Request Detail',
    moduleKey: salesOrdersModuleConfig.key,
    showInNavigation: false
  },
  {
    key: 'settings',
    path: settingsModuleConfig.route,
    title: settingsModuleConfig.title,
    moduleKey: settingsModuleConfig.key,
    showInNavigation: true
  }
];

export {
  customersModuleConfig,
  eventsModuleConfig,
  invoicesModuleConfig,
  salesOrdersModuleConfig,
  salespersonsModuleConfig
};
