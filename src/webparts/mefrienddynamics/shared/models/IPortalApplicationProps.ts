import type { PageContext } from '@microsoft/sp-page-context';
import type { AadHttpClientFactory, HttpClient, SPHttpClient } from '@microsoft/sp-http';

export interface IPortalApplicationProps {
  routePath: string;
  userDisplayName: string;
  onPortalNavigate?: (path: string) => void;
  onPortalReady?: () => void;
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}
