import type { AadHttpClientFactory, HttpClient } from '@microsoft/sp-http';

export interface IMefrienddynamicsProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  aadHttpClientFactory?: AadHttpClientFactory;
  httpClient?: HttpClient;
}
