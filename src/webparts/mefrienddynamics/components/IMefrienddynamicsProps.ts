import type { AadHttpClientFactory, HttpClient } from '@microsoft/sp-http';
import type { PageContext } from '@microsoft/sp-page-context';
import type { SPHttpClient } from '@microsoft/sp-http';

export interface IMefrienddynamicsProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
  pageContext?: PageContext;
  spHttpClient?: SPHttpClient;
}
