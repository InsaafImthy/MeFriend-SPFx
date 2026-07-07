import * as React from 'react';
import { routeDefinitions } from '../../config/moduleConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import { buildHashHref } from '../../utils/routeUtils';
import styles from './AppNavigation.module.scss';

export interface IAppNavigationProps {
  activeRouteKey: AppRouteKey;
  onNavigate: (path: string) => void;
}

export const AppNavigation: React.FC<IAppNavigationProps> = ({ activeRouteKey, onNavigate }) => {
  const navigationRoutes = routeDefinitions.filter(route => route.showInNavigation);
  const activeRoute = routeDefinitions.filter(route => route.key === activeRouteKey)[0];

  return (
    <nav className={styles.navigation} aria-label="MeFriend modules">
      {navigationRoutes.map(route => {
        const isActive = activeRoute ? route.moduleKey === activeRoute.moduleKey : route.key === activeRouteKey;

        return (
          <a
            key={route.key}
            className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
            href={buildHashHref(route.path)}
            aria-current={isActive ? 'page' : undefined}
            onClick={event => {
              event.preventDefault();
              onNavigate(route.path);
            }}
          >
            {route.title}
          </a>
        );
      })}
    </nav>
  );
};
