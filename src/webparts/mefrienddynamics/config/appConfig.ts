export const appConfig = {
  appName: 'MeFriend',
  defaultCurrencyCode: 'INR',
  defaultCountryCode: 'IN',
  defaultRoutePath: 'customers',
  environmentLabel: 'Local',
  backendApiBaseUrl: '',
  backendApi: {
    baseUrl: '',
    useAadHttpClient: false,
    aadResourceUrl: ''
  },
  featureFlags: {
    enableCustomerCreate: true,
    enableSalesOrderCreate: true,
    enableInvoiceDetails: true,
    enableRelatedInvoices: true
  },
  sharePointSettings: {
    settingsListName: 'MeFriend App Settings',
    auditLogListName: 'MeFriend Audit Logs'
  }
};
