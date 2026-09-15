jest.mock('../config/applications', () => ({
  applications: [
    { id: 'bc-extension', route: 'apps/bc', defaultPath: 'customers', enabled: true, legacyPathRoots: ['customers', 'salesOrders'] },
    { id: 'future-app', route: 'apps/future', defaultPath: 'dashboard', enabled: true },
    { id: 'disabled-app', route: 'apps/disabled', defaultPath: 'dashboard', enabled: false }
  ]
}));

import { buildPortalHref } from './paths';
import { migrateLegacyApplicationPath, resolvePortalRoute } from './portalRoutes';

describe('portal routing', () => {
  it('opens the launcher for an empty URL and /apps', () => {
    expect(resolvePortalRoute('')).toEqual({ type: 'home' });
    expect(resolvePortalRoute('#/apps')).toEqual({ type: 'home' });
  });

  it('keeps BC detail paths and IDs inside the BC application', () => {
    const route = resolvePortalRoute('#/apps/bc/customers/detail/CUST%2F001');
    expect(route.type).toBe('application');
    if (route.type === 'application') {
      expect(route.application.id).toBe('bc-extension');
      expect(route.routePath).toBe('customers/detail/CUST%2F001');
    }
    expect(resolvePortalRoute('apps/bc')).toMatchObject({ routePath: 'customers' });
  });

  it('resolves another registered application without a BC route branch', () => {
    expect(resolvePortalRoute('apps/future/reports')).toMatchObject({
      type: 'application',
      routePath: 'reports',
      application: { id: 'future-app' }
    });
    expect(resolvePortalRoute('apps/disabled')).toEqual({ type: 'notFound' });
  });

  it('upgrades old BC bookmarks while preserving the detail path', () => {
    expect(migrateLegacyApplicationPath('customers/detail/CUST%2F001'))
      .toBe('apps/bc/customers/detail/CUST%2F001');
    expect(migrateLegacyApplicationPath('apps/future/reports')).toBeUndefined();
  });

  it('builds hash links that remain on the current SharePoint page', () => {
    expect(buildPortalHref('')).toBe('#/');
    expect(buildPortalHref('apps/bc')).toBe('#/apps/bc');
  });
});
