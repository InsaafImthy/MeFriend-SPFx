export type AppRouteKey =
  | 'customers'
  | 'customerCreate'
  | 'customerDetail'
  | 'customerRequests'
  | 'customerRequestDetail'
  | 'events'
  | 'eventDetail'
  | 'salespersons'
  | 'salespersonDetail'
  | 'invoices'
  | 'invoiceDetail'
  | 'salesOrders'
  | 'salesOrderCreate'
  | 'salesOrderDetail'
  | 'salesOrderRequests'
  | 'salesOrderRequestDetail'
  | 'settings';

export interface IAppRouteDefinition {
  key: AppRouteKey;
  path: string;
  title: string;
  moduleKey: string;
  showInNavigation: boolean;
}

export interface IResolvedRoute extends IAppRouteDefinition {
  params: IReadonlyRouteParams;
}

export interface IReadonlyRouteParams {
  readonly id?: string;
}
