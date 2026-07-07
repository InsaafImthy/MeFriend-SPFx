export type AppRouteKey =
  | 'customers'
  | 'events'
  | 'salespersons'
  | 'invoices'
  | 'invoiceDetail'
  | 'salesOrders'
  | 'salesOrderCreate'
  | 'salesOrderDetail';

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
