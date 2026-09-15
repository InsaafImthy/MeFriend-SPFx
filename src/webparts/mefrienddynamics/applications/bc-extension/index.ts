import { App } from './components/App/App';
import { appConfig } from './config/appConfig';
import { bcApplicationConfig } from './config/applicationConfig';
import { moduleDefinitions } from './config/moduleConfig';

export const bcExtensionApplication = {
  ...bcApplicationConfig,
  defaultPath: appConfig.defaultRoutePath,
  enabled: true,
  legacyPathRoots: moduleDefinitions.map(moduleDefinition => moduleDefinition.route),
  component: App
};
