import * as React from 'react';
import type { AadHttpClientFactory, HttpClient } from '@microsoft/sp-http';
import { appConfig } from '../../config/appConfig';
import { ErrorBoundary } from '../common/errorState/ErrorBoundary';
import { AppLoader } from '../common/loaders/AppLoader';
import { ToastProvider } from '../common/toast/ToastProvider';
import { AppLayout } from '../Layout/AppLayout';
import { PlaceholderModulePage } from '../modules/PlaceholderModulePage';
import { CustomerCreatePage, CustomerDetailPage, CustomerPage } from '../modules/customers';
import { EventDetailPage, EventPage } from '../modules/events';
import { InvoiceDetailPage, InvoicePage } from '../modules/invoices';
import { SalespersonDetailPage, SalespersonPage } from '../modules/salespersons';
import { ApiClient } from '../../services/api/apiClient';
import { AuthClient } from '../../services/api/authClient';
import { CustomerService } from '../../services/customers/customerService';
import { EventService } from '../../services/events/eventService';
import { InvoiceService } from '../../services/invoices/invoiceService';
import { SalespersonService } from '../../services/salespersons/salespersonService';
import { buildHashHref, getHashRoutePath, resolveRoute } from '../../utils/routeUtils';
import styles from './App.module.scss';

export interface IAppProps {
  userDisplayName: string;
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
}

export const App: React.FC<IAppProps> = ({ aadHttpClientFactory, httpClient, userDisplayName }) => {
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
  const salespersonService = React.useMemo(() => new SalespersonService(apiClient), [apiClient]);

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
      return <CustomerPage customerService={customerService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'customerCreate') {
      return <CustomerCreatePage customerService={customerService} onNavigate={handleNavigate} />;
    }

    if (route.key === 'customerDetail') {
      return <CustomerDetailPage customerId={route.params.id || ''} onNavigate={handleNavigate} />;
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

    return <PlaceholderModulePage route={route} />;
  };

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className={styles.app}>
          <AppLayout activeRouteKey={route.key} userDisplayName={userDisplayName} onNavigate={handleNavigate}>
            {isLoading ? <AppLoader label="Loading workspace" /> : renderRoute()}
          </AppLayout>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};
