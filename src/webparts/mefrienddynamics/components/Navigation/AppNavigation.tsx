import * as React from 'react';
import { moduleDefinitions, routeDefinitions } from '../../config/moduleConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import { buildHashHref } from '../../utils/routeUtils';
import styles from './AppNavigation.module.scss';

export interface IAppNavigationProps {
  activeRouteKey: AppRouteKey;
  onNavigate: (path: string) => void;
}

export const AppNavigation: React.FC<IAppNavigationProps> = ({ activeRouteKey, onNavigate }) => {
  const navigationModules = moduleDefinitions
    .filter(moduleItem => moduleItem.visible)
    .slice()
    .sort((firstModule, secondModule) => firstModule.order - secondModule.order);
  const activeRoute = routeDefinitions.filter(route => route.key === activeRouteKey)[0];

  return (
    <nav className={styles.navigation} aria-label="MeFriend modules">
      {navigationModules.map(moduleItem => {
        const isActive = activeRoute ? moduleItem.key === activeRoute.moduleKey : false;

        return (
          <a
            key={moduleItem.key}
            className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
            href={buildHashHref(moduleItem.route)}
            aria-current={isActive ? 'page' : undefined}
            onClick={event => {
              event.preventDefault();
              onNavigate(moduleItem.route);
            }}
          >
            {moduleItem.title}
          </a>
        );
      })}
    </nav>
  );
};
