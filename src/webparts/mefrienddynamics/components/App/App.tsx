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
import { ApprovalDetailPage, MyApprovalsPage } from '../modules/approvals';
import { CustomerCreatePage, CustomerDetailPage, CustomerPage, CustomerRequestDetailPage, CustomerRequestsPage } from '../modules/customers';
import { EventDetailPage, EventPage } from '../modules/events';
import { InvoiceDetailPage, InvoicePage } from '../modules/invoices';
import { SalesOrderCreatePage, SalesOrderDetailPage, SalesOrderPage, SalesOrderRequestDetailPage, SalesOrderRequestsPage } from '../modules/salesOrders';
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
import { AppAccessService } from '../../services/sharepoint/appAccessService';
import { ApprovalProcessingService } from '../../services/sharepoint/approvalProcessingService';
import { ApprovalTaskService } from '../../services/sharepoint/approvalTaskService';
import { ApprovalWorkflowService } from '../../services/sharepoint/approvalWorkflowService';
import { BCIntegrationQueueService } from '../../services/sharepoint/bcIntegrationQueueService';
import { CustomerRequestService } from '../../services/sharepoint/customerRequestService';
import { RequestSubmissionService } from '../../services/sharepoint/requestSubmissionService';
import { SalesOrderRequestService } from '../../services/sharepoint/salesOrderRequestService';
import { useAppAccess } from '../../hooks/useAppAccess';
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
  const sharePointWebAbsoluteUrl = appConfig.sharePointSettings.masterDataWebUrl;
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
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const appAccessService = React.useMemo(
    () =>
      new AppAccessService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const approvalTaskService = React.useMemo(
    () =>
      new ApprovalTaskService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const approvalProcessingService = React.useMemo(
    () =>
      new ApprovalProcessingService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const approvalWorkflowService = React.useMemo(
    () =>
      new ApprovalWorkflowService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const customerRequestService = React.useMemo(
    () =>
      new CustomerRequestService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const salesOrderRequestService = React.useMemo(
    () =>
      new SalesOrderRequestService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const requestSubmissionService = React.useMemo(
    () =>
      new RequestSubmissionService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl
      }),
    [pageContext, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const bcIntegrationQueueService = React.useMemo(
    () =>
      new BCIntegrationQueueService({
        pageContext,
        spHttpClient,
        webAbsoluteUrl: sharePointWebAbsoluteUrl,
        customerService,
        salesOrderService
      }),
    [customerService, pageContext, salesOrderService, sharePointWebAbsoluteUrl, spHttpClient]
  );
  const access = useAppAccess(appAccessService);

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

  const canAccessModule = React.useCallback((moduleKey: string): boolean => {
    if (moduleKey === 'approvals') {
      return access.canView('approvals') || access.canApprove('approvals') || access.canApprove('customers') || access.canApprove('salesOrders');
    }

    return access.canView(moduleKey);
  }, [access]);

  const canAccessRoute = React.useCallback((): boolean => {
    if (!access.isAuthorized) {
      return false;
    }

    if (route.key === 'customerCreate') {
      return access.canView(route.moduleKey) && access.canCreate(route.moduleKey);
    }

    if (route.key === 'salesOrderCreate') {
      return access.canView(route.moduleKey) && access.canCreate(route.moduleKey);
    }

    return canAccessModule(route.moduleKey);
  }, [access, canAccessModule, route.key, route.moduleKey]);

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
          canCreateCustomer={access.canCreate('customers')}
          customerService={customerService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'customerCreate') {
      return (
        <CustomerCreatePage
          approvalProcessingService={approvalProcessingService}
          customerService={customerService}
          masterDataService={masterDataService}
          requestSubmissionService={requestSubmissionService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'customerRequestResubmit') {
      return (
        <CustomerCreatePage
          approvalProcessingService={approvalProcessingService}
          customerService={customerService}
          masterDataService={masterDataService}
          requestSubmissionService={requestSubmissionService}
          resubmitRequestId={route.params.id || ''}
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

    if (route.key === 'customerRequests') {
      return (
        <CustomerRequestsPage
          canCreateCustomer={access.canCreate('customers')}
          customerRequestService={customerRequestService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'customerRequestDetail') {
      return (
        <CustomerRequestDetailPage
          bcIntegrationQueueService={bcIntegrationQueueService}
          canManageCustomerRequests={access.canManage('customers')}
          canPostToBC={access.canPostToBC('customers')}
          currentUserEmail={access.signedInEmail}
          requestId={route.params.id || ''}
          requestSubmissionService={requestSubmissionService}
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
          canCreateSalesOrder={access.canCreate('salesOrders')}
          salesOrderService={salesOrderService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrderCreate') {
      return (
        <SalesOrderCreatePage
          approvalProcessingService={approvalProcessingService}
          customerService={customerService}
          eventService={eventService}
          itemMasterService={itemMasterService}
          masterDataService={masterDataService}
          requestSubmissionService={requestSubmissionService}
          salespersonService={salespersonService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrderRequestResubmit') {
      return (
        <SalesOrderCreatePage
          approvalProcessingService={approvalProcessingService}
          customerService={customerService}
          eventService={eventService}
          itemMasterService={itemMasterService}
          masterDataService={masterDataService}
          requestSubmissionService={requestSubmissionService}
          resubmitRequestId={route.params.id || ''}
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

    if (route.key === 'salesOrderRequests') {
      return (
        <SalesOrderRequestsPage
          canCreateSalesOrder={access.canCreate('salesOrders')}
          salesOrderRequestService={salesOrderRequestService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrderRequestDetail') {
      return (
        <SalesOrderRequestDetailPage
          bcIntegrationQueueService={bcIntegrationQueueService}
          canManageSalesOrderRequests={access.canManage('salesOrders')}
          canPostToBC={access.canPostToBC('salesOrders')}
          currentUserEmail={access.signedInEmail}
          requestId={route.params.id || ''}
          requestSubmissionService={requestSubmissionService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'approvals') {
      return (
        <MyApprovalsPage
          approvalTaskService={approvalTaskService}
          currentUserEmail={access.signedInEmail}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'approvalDetail') {
      return (
        <ApprovalDetailPage
          taskId={route.params.id || ''}
          approvalProcessingService={approvalProcessingService}
          approvalTaskService={approvalTaskService}
          bcIntegrationQueueService={bcIntegrationQueueService}
          canApprove={access.canApprove('approvals')}
          canPostCustomerToBC={access.canPostToBC('customers')}
          canPostSalesOrderToBC={access.canPostToBC('salesOrders')}
          requestSubmissionService={requestSubmissionService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'settings') {
      return (
        <PermissionSettingsPage
          access={access}
          appAccessService={appAccessService}
          approvalWorkflowService={approvalWorkflowService}
          masterDataService={masterDataService}
          onPermissionsChanged={access.refreshAccess}
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
            canAccessModule={canAccessModule}
            routeTransitionKey={`${route.key}:${routePath}`}
            userDisplayName={userDisplayName}
            onNavigate={handleNavigate}
          >
            {isLoading || access.loading ? (
              <AppLoader label="Loading workspace" />
            ) : canAccessRoute() ? (
              renderRoute()
            ) : (
              <AccessDenied
                message={
                  access.accessError ||
                  `The signed-in account ${access.signedInEmail || 'unknown user'} is not allowed to access this area.`
                }
              />
            )}
          </AppLayout>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};
