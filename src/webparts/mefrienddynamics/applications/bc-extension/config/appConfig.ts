export const appConfig = {
  appName: 'Madhyamam MeFriend',
  defaultCurrencyCode: 'INR',
  defaultCountryCode: 'IN',
  defaultRoutePath: 'customers',
  environmentLabel: 'Local',
  backendApiBaseUrl: 'https://localhost:5044',
  backendApi: {
    baseUrl: 'https://localhost:5044',
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
    auditLogListName: 'MeFriend Audit Logs',
    masterDataWebUrl: 'https://madhyamamgroup.sharepoint.com/sites/Me-Friend'
  }
};
