import type { IPermissionConfig } from '../models/common/IPermissionModels';

export const permissionConfig: IPermissionConfig = {
  settingsListTitle: 'MeFriend Permission Settings',
  rules: [
    {
      key: 'customers.view',
      moduleKey: 'customers',
      action: 'view',
      enabled: true,
      title: 'Customer module access',
      description: 'Controls visibility and direct access for Customer Master.'
    },
    {
      key: 'customers.create',
      moduleKey: 'customers',
      action: 'create',
      enabled: true,
      title: 'Customer creation',
      description: 'Controls the Create Customer button and create route.'
    },
    {
      key: 'events.view',
      moduleKey: 'events',
      action: 'view',
      enabled: true,
      title: 'Event module access',
      description: 'Controls visibility and direct access for Events.'
    },
    {
      key: 'salespersons.view',
      moduleKey: 'salespersons',
      action: 'view',
      enabled: true,
      title: 'Salesperson module access',
      description: 'Controls visibility and direct access for Salespersons.'
    },
    {
      key: 'invoices.view',
      moduleKey: 'invoices',
      action: 'view',
      enabled: true,
      title: 'Invoice module access',
      description: 'Controls visibility and direct access for Invoices.'
    },
    {
      key: 'salesOrders.view',
      moduleKey: 'salesOrders',
      action: 'view',
      enabled: true,
      title: 'Sales order module access',
      description: 'Controls visibility and direct access for Sales Orders.'
    },
    {
      key: 'salesOrders.create',
      moduleKey: 'salesOrders',
      action: 'create',
      enabled: true,
      title: 'Sales order creation',
      description: 'Controls the Create Sales Order button and create route.'
    },
    {
      key: 'settings.manage',
      moduleKey: 'settings',
      action: 'view',
      enabled: true,
      title: 'Permission settings',
      description: 'Controls access to this permission settings panel.'
    }
  ]
};
