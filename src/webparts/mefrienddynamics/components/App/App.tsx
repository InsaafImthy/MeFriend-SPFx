import * as React from 'react';
import { appConfig } from '../../config/appConfig';
import { ErrorBoundary } from '../common/errorState/ErrorBoundary';
import { AppLoader } from '../common/loaders/AppLoader';
import { ToastProvider } from '../common/toast/ToastProvider';
import { AppLayout } from '../Layout/AppLayout';
import { PlaceholderModulePage } from '../modules/PlaceholderModulePage';
import { buildHashHref, getHashRoutePath, resolveRoute } from '../../utils/routeUtils';
import styles from './App.module.scss';

export interface IAppProps {
  userDisplayName: string;
}

export const App: React.FC<IAppProps> = ({ userDisplayName }) => {
  const [routePath, setRoutePath] = React.useState<string>(getHashRoutePath);
  const [isLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    const handleHashChange = (): void => {
      setRoutePath(getHashRoutePath());
    };

    if (!window.location.hash) {
      window.location.hash = buildHashHref(appConfig.defaultRoutePath);
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = resolveRoute(routePath);

  const handleNavigate = React.useCallback((path: string): void => {
    const href = buildHashHref(path);

    if (window.location.hash === href) {
      setRoutePath(path);
      return;
    }

    window.location.hash = href;
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className={styles.app}>
          <AppLayout activeRouteKey={route.key} userDisplayName={userDisplayName} onNavigate={handleNavigate}>
            {isLoading ? <AppLoader label="Loading workspace" /> : <PlaceholderModulePage route={route} />}
          </AppLayout>
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
};
