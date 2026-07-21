import * as React from 'react';
import type { PageContext } from '@microsoft/sp-page-context';
import type { AadHttpClientFactory, HttpClient, SPHttpClient } from '@microsoft/sp-http';
import { appConfig } from '../../config/appConfig';
import { ErrorBoundary } from '../common/errorState/ErrorBoundary';
import { AccessDenied } from '../common/errorState/AccessDenied';
import { AppLoader } from '../common/loaders/AppLoader';
import { ToastProvider } from '../common/toast/ToastProvider';
import { AppLayout } from '../Layout/AppLayout';
import { PlaceholderModulePage } from '../modules/PlaceholderModulePage';
import { CustomerCreatePage, CustomerDetailPage, CustomerPage } from '../modules/customers';
import { EventDetailPage, EventPage } from '../modules/events';
import { InvoiceDetailPage, InvoicePage } from '../modules/invoices';
import { SalesOrderCreatePage, SalesOrderDetailPage, SalesOrderPage } from '../modules/salesOrders';
import { SalespersonDetailPage, SalespersonPage } from '../modules/salespersons';
import { PermissionSettingsPage } from '../modules/settings';
import { ApiClient } from '../../services/api/apiClient';
import { AuthClient } from '../../services/api/authClient';
import { CustomerService } from '../../services/customers/customerService';
import { EventService } from '../../services/events/eventService';
import { InvoiceService } from '../../services/invoices/invoiceService';
import { ItemMasterService } from '../../services/itemMasters';
import { SalesOrderService } from '../../services/salesOrders/salesOrderService';
import { SalespersonService } from '../../services/salespersons/salespersonService';
import { MasterDataService } from '../../services/sharepoint/masterDataService';
import { PermissionService } from '../../services/sharepoint/permissionService';
import { usePermissions } from '../../hooks/usePermissions';
import { buildHashHref, getHashRoutePath, resolveRoute } from '../../utils/routeUtils';
import styles from './App.module.scss';

export interface IAppProps {
  userDisplayName: string;
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}

export const App: React.FC<IAppProps> = ({ aadHttpClientFactory, httpClient, pageContext, spHttpClient, userDisplayName }) => {
  const [routePath, setRoutePath] = React.useState<string>(getHashRoutePath);
  const [isLoading] = React.useState<boolean>(false);
  const apiClient = React.useMemo(() => {
    const authClient = new AuthClient({
      aadHttpClientFactory,
      httpClient
    });

    return new ApiClient(authClient);
  }, [aadHttpClientFactory, httpClient]);
  const customerService = React.useMemo(() => new CustomerService(apiClient), [apiClient]);
  const eventService = React.useMemo(() => new EventService(apiClient), [apiClient]);
  const invoiceService = React.useMemo(() => new InvoiceService(apiClient), [apiClient]);
  const itemMasterService = React.useMemo(() => new ItemMasterService(apiClient), [apiClient]);
  const salesOrderService = React.useMemo(() => new SalesOrderService(apiClient), [apiClient]);
  const salespersonService = React.useMemo(() => new SalespersonService(apiClient), [apiClient]);
  const masterDataService = React.useMemo(
    () =>
      new MasterDataService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: appConfig.sharePointSettings.masterDataWebUrl
      }),
    [pageContext, spHttpClient]
  );
  const permissionService = React.useMemo(
    () =>
      new PermissionService({
        pageContext,
        spHttpClient
      }),
    [pageContext, spHttpClient]
  );
  const permissions = usePermissions(permissionService);

  React.useEffect(() => {
    const handleHashChange = (): void => {
      setRoutePath(getHashRoutePath());
    };

    if (!window.location.hash) {
      window.location.hash = buildHashHref(appConfig.defaultRoutePath);
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = resolveRoute(routePath);

  const canAccessRoute = React.useCallback((): boolean => {
    if (route.key === 'customerCreate') {
      return permissions.canAccessModule(route.moduleKey) && permissions.canCreateCustomer;
    }

    if (route.key === 'salesOrderCreate') {
      return permissions.canAccessModule(route.moduleKey) && permissions.canCreateSalesOrder;
    }

    return permissions.canAccessModule(route.moduleKey);
  }, [permissions, route.key, route.moduleKey]);

  const handleNavigate = React.useCallback((path: string): void => {
    const href = buildHashHref(path);

    if (window.location.hash === href) {
      setRoutePath(path);
      return;
    }

    window.location.hash = href;
  }, []);

  const renderRoute = (): React.ReactNode => {
    if (route.key === 'customers') {
      return (
        <CustomerPage
          canCreateCustomer={permissions.canCreateCustomer}
          customerService={customerService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'customerCreate') {
      return (
        <CustomerCreatePage
          customerService={customerService}
          masterDataService={masterDataService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'customerDetail') {
      return (
        <CustomerDetailPage
          customerId={route.params.id || ''}
          customerService={customerService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'events') {
      return <EventPage eventService={eventService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'eventDetail') {
      return <EventDetailPage eventId={route.params.id || ''} eventService={eventService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'salespersons') {
      return <SalespersonPage salespersonService={salespersonService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'salespersonDetail') {
      return (
        <SalespersonDetailPage
          salespersonId={route.params.id || ''}
          salespersonService={salespersonService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'invoices') {
      return <InvoicePage invoiceService={invoiceService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'invoiceDetail') {
      return <InvoiceDetailPage invoiceId={route.params.id || ''} invoiceService={invoiceService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'salesOrders') {
      return (
        <SalesOrderPage
          canCreateSalesOrder={permissions.canCreateSalesOrder}
          salesOrderService={salesOrderService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrderCreate') {
      return (
        <SalesOrderCreatePage
          customerService={customerService}
          eventService={eventService}
          itemMasterService={itemMasterService}
          masterDataService={masterDataService}
          salesOrderService={salesOrderService}
          salespersonService={salespersonService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrderDetail') {
      return (
        <SalesOrderDetailPage
          salesOrderId={route.params.id || ''}
          salesOrderService={salesOrderService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'settings') {
      return (
        <PermissionSettingsPage
          masterDataService={masterDataService}
          permissionService={permissionService}
          onPermissionsChanged={permissions.refresh}
        />
      );
    }

    return <PlaceholderModulePage route={route} />;
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className={styles.app}>
          <AppLayout
            activeRouteKey={route.key}
            canAccessModule={permissions.canAccessModule}
            routeTransitionKey={`${route.key}:${routePath}`}
            userDisplayName={userDisplayName}
            onNavigate={handleNavigate}
          >
            {isLoading || permissions.loading ? (
              <AppLoader label="Loading workspace" />
            ) : canAccessRoute() ? (
              renderRoute()
            ) : (
              <AccessDenied />
            )}
          </AppLayout>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};
