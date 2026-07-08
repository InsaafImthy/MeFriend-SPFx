import * as React from 'react';
import { Icon } from '@fluentui/react';
import { moduleDefinitions, routeDefinitions } from '../../config/moduleConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import { buildHashHref } from '../../utils/routeUtils';
import styles from './AppNavigation.module.scss';

export interface IAppNavigationProps {
  activeRouteKey: AppRouteKey;
  canAccessModule: (moduleKey: string) => boolean;
  isCollapsed?: boolean;
  onNavigate: (path: string) => void;
}

const moduleIconNames: { readonly [moduleKey: string]: string } = {
  customers: 'ContactCard',
  events: 'Calendar',
  salespersons: 'People',
  invoices: 'Invoice',
  salesOrders: 'ShoppingCart',
  settings: 'Settings'
};

export const AppNavigation: React.FC<IAppNavigationProps> = ({ activeRouteKey, canAccessModule, isCollapsed = false, onNavigate }) => {
  const navigationModules = moduleDefinitions
    .filter(moduleItem => moduleItem.key !== 'settings' && moduleItem.visible && canAccessModule(moduleItem.key))
    .slice()
    .sort((firstModule, secondModule) => firstModule.order - secondModule.order);
  const activeRoute = routeDefinitions.filter(route => route.key === activeRouteKey)[0];

  return (
    <nav className={isCollapsed ? `${styles.navigation} ${styles.collapsed}` : styles.navigation} aria-label="MeFriend modules">
      {navigationModules.map(moduleItem => {
        const isActive = activeRoute ? moduleItem.key === activeRoute.moduleKey : false;

        return (
          <a
            key={moduleItem.key}
            className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
            href={buildHashHref(moduleItem.route)}
            aria-current={isActive ? 'page' : undefined}
            title={isCollapsed ? moduleItem.title : undefined}
            onClick={event => {
              event.preventDefault();
              onNavigate(moduleItem.route);
            }}
          >
            <Icon className={styles.navIcon} iconName={moduleIconNames[moduleItem.key] || moduleItem.icon} aria-hidden="true" />
            <span className={styles.navLabel}>{moduleItem.title}</span>
          </a>
        );
      })}
    </nav>
  );
};
