export const appConfig = {
  appName: 'MeFriend',
  defaultCurrencyCode: 'INR',
  defaultCountryCode: 'IN',
  defaultRoutePath: 'customers',
  environmentLabel: 'Local',
  backendApiBaseUrl: 'https://4.188.243.158:7082',
  backendApi: {
    baseUrl: 'https://4.188.243.158:7082',
    anonymous: true,
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
