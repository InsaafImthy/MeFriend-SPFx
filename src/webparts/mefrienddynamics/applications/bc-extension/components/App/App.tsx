import * as React from 'react';
import type { IPortalApplicationProps } from '../../../../shared/models/IPortalApplicationProps';
import { appConfig } from '../../config/appConfig';
import { bcCompanies, getBcCompanyLabel, getBcCompanyRequestHeaders, type BcCompany } from '../../config/bcCompanies';
import { filterAuthorizedBcCompanies } from '../../config/companyAccess';
import { BcCompanyProvider, useBcCompany } from '../../context/BcCompanyContext';
import { ErrorBoundary } from '../../../../shared/components/errorState/ErrorBoundary';
import { AccessDenied } from '../../../../shared/components/errorState/AccessDenied';
import { AppLoader } from '../../../../shared/components/loaders/AppLoader';
import { ToastProvider } from '../../../../shared/components/toast/ToastProvider';
import { AppLayout } from '../Layout/AppLayout';
import { BcCompanySelector } from '../CompanySelector/BcCompanySelector';
import { PlaceholderModulePage } from '../modules/PlaceholderModulePage';
import { ApprovalDetailPage, MyApprovalsPage } from '../modules/approvals';
import { CustomerCreatePage, CustomerDetailPage, CustomerPage, CustomerRequestDetailPage, CustomerRequestsPage } from '../modules/customers';
import { EventDetailPage, EventPage } from '../modules/events';
import { InvoiceDetailPage, InvoicePage } from '../modules/invoices';
import { SalesOrderCreatePage, SalesOrderDetailPage, SalesOrderPage, SalesOrderRequestDetailPage, SalesOrderRequestsPage } from '../modules/salesOrders';
import { SalespersonDetailPage, SalespersonPage } from '../modules/salespersons';
import { PermissionSettingsPage } from '../modules/settings';
import { ApiClient } from '../../../../shared/api/apiClient';
import { AuthClient } from '../../../../shared/api/authClient';
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
import { useAppAccess, type IUseAppAccessResult } from '../../hooks/useAppAccess';
import { buildHashHref, resolveRoute } from '../../utils/routeUtils';
import styles from './App.module.scss';

interface IAppWorkspaceProps extends IPortalApplicationProps {
  access: IUseAppAccessResult;
  appAccessService: AppAccessService;
  selectedCompany: BcCompany;
  onChangeCompany: () => void;
}

const AppWorkspace: React.FC<IAppWorkspaceProps> = ({ aadHttpClientFactory, access, appAccessService, httpClient, onChangeCompany, onPortalNavigate, pageContext, routePath, selectedCompany, spHttpClient, userDisplayName }) => {
  const [isLoading] = React.useState<boolean>(false);
  const sharePointWebAbsoluteUrl = appConfig.sharePointSettings.masterDataWebUrl;
  const apiClient = React.useMemo(() => {
    const authClient = new AuthClient({
      aadHttpClientFactory,
      httpClient,
      settings: {
        baseUrl: appConfig.backendApi.baseUrl || appConfig.backendApiBaseUrl,
        anonymous: appConfig.backendApi.anonymous,
        useAadHttpClient: appConfig.backendApi.useAadHttpClient,
        aadResourceUrl: appConfig.backendApi.aadResourceUrl
      }
    });

    return new ApiClient(authClient, {
      headerProvider: () => getBcCompanyRequestHeaders(selectedCompany)
    });
  }, [aadHttpClientFactory, httpClient, selectedCompany]);
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
  const route = resolveRoute(routePath);

  const canAccessModule = React.useCallback((moduleKey: string): boolean => {
    if (moduleKey === 'settings') {
      return access.canView('settings') || access.canView('appUsers') || access.canView('approvalManagement');
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

    if (window.location.hash !== href) {
      window.location.hash = href;
    }
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
          canManageCustomerRequests={access.canManage('customers')}
          currentUserEmail={access.signedInEmail}
          currentUserId={access.currentAppUser?.userId}
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
          currentUserId={access.currentAppUser?.userId}
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
      return (
        <InvoicePage
          currentUser={access.currentAppUser}
          invoiceService={invoiceService}
          salespersonService={salespersonService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'invoiceDetail') {
      return (
        <InvoiceDetailPage
          currentUser={access.currentAppUser}
          invoiceNumber={route.params.id || ''}
          invoiceService={invoiceService}
          onNavigate={handleNavigate}
        />
      );
    }

    if (route.key === 'salesOrders') {
      return (
        <SalesOrderPage
          canCreateSalesOrder={access.canCreate('salesOrders')}
          currentUser={access.currentAppUser}
          salesOrderService={salesOrderService}
          salespersonService={salespersonService}
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
          currentUser={access.currentAppUser}
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
          canManageSalesOrderRequests={access.canManage('salesOrders')}
          currentUserEmail={access.signedInEmail}
          currentUserId={access.currentAppUser?.userId}
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
          currentUserId={access.currentAppUser?.userId}
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
          currentUserEmail={access.signedInEmail}
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

    if (route.key === 'settings') {
      return (
        <PermissionSettingsPage
          access={access}
          appAccessService={appAccessService}
          approvalWorkflowService={approvalWorkflowService}
          masterDataService={masterDataService}
          salespersonService={salespersonService}
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
            currentCompanyLabel={getBcCompanyLabel(selectedCompany)}
            onAllApplications={onPortalNavigate ? () => onPortalNavigate('apps') : undefined}
            onChangeCompany={onChangeCompany}
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

interface IBcCompanyGateProps extends IPortalApplicationProps {
  access: IUseAppAccessResult;
  appAccessService: AppAccessService;
  authorizedCompanies: readonly BcCompany[];
}

const BcCompanyGate: React.FC<IBcCompanyGateProps> = props => {
  const { clearCompany, selectCompany, selectedCompany } = useBcCompany();
  const [isChangingCompany, setIsChangingCompany] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (isChangingCompany && selectedCompany && props.routePath === appConfig.defaultRoutePath) {
      setIsChangingCompany(false);
    }
  }, [isChangingCompany, props.routePath, selectedCompany]);

  const handleChangeCompany = React.useCallback((): void => {
    setIsChangingCompany(true);
    clearCompany();
  }, [clearCompany]);

  const handleEnterCompany = React.useCallback((company: BcCompany): void => {
    if (isChangingCompany) {
      window.location.hash = buildHashHref(appConfig.defaultRoutePath);
    }

    selectCompany(company);
  }, [isChangingCompany, selectCompany]);

  if (!selectedCompany) {
    return (
      <div className={styles.app}>
        <BcCompanySelector
          companies={props.authorizedCompanies}
          onBack={props.onPortalNavigate ? () => props.onPortalNavigate?.('apps') : undefined}
          onEnter={handleEnterCompany}
        />
      </div>
    );
  }

  return (
    <AppWorkspace
      {...props}
      access={props.access}
      appAccessService={props.appAccessService}
      key={selectedCompany.id}
      onChangeCompany={handleChangeCompany}
      routePath={isChangingCompany ? appConfig.defaultRoutePath : props.routePath}
      selectedCompany={selectedCompany}
    />
  );
};

const AppAccessGate: React.FC<IPortalApplicationProps> = props => {
  const appAccessService = React.useMemo(() => new AppAccessService({
    pageContext: props.pageContext,
    spHttpClient: props.spHttpClient,
    webAbsoluteUrl: appConfig.sharePointSettings.masterDataWebUrl
  }), [props.pageContext, props.spHttpClient]);
  const access = useAppAccess(appAccessService);
  const companyAccess = React.useMemo(() => filterAuthorizedBcCompanies(
    access.currentAppUser?.companies || [],
    bcCompanies
  ), [access.currentAppUser?.companies]);

  React.useEffect(() => {
    if (!access.loading) {
      props.onPortalReady?.();
    }
  }, [access.loading, props.onPortalReady]);

  React.useEffect(() => {
    companyAccess.unmappedSharePointCompanies.forEach(company => {
      console.error(`Company access configuration error: no BC mapping exists for '${company}'.`);
    });
    companyAccess.unavailableBcCompanyNames.forEach(company => {
      console.error(`Company access configuration error: mapped BC company '${company}' is unavailable.`);
    });
  }, [companyAccess]);

  if (access.loading) {
    return <div className={styles.app}><AppLoader label="Verifying application access" /></div>;
  }

  if (!access.isAuthorized) {
    return (
      <div className={styles.app}>
        <AccessDenied message={access.accessError || 'You are not allowed to access this application.'} />
      </div>
    );
  }

  if (!companyAccess.companies.length) {
    let message = 'No company access has been assigned to your account. Please contact the administrator.';

    if (companyAccess.unmappedSharePointCompanies.length) {
      message = 'Company access configuration is incomplete. Please contact the administrator.';
    } else if (companyAccess.unavailableBcCompanyNames.length) {
      message = 'An assigned company is not available in Business Central. Please contact the administrator.';
    }

    return <div className={styles.app}><AccessDenied title="Company access unavailable" message={message} /></div>;
  }

  return (
    <BcCompanyProvider
      authorizedCompanies={companyAccess.companies}
      key={`${access.signedInEmail}:${companyAccess.companies.map(company => company.id).join('|')}`}
    >
      <BcCompanyGate
        {...props}
        access={access}
        appAccessService={appAccessService}
        authorizedCompanies={companyAccess.companies}
      />
    </BcCompanyProvider>
  );
};

export const App: React.FC<IPortalApplicationProps> = props => <AppAccessGate {...props} />;
