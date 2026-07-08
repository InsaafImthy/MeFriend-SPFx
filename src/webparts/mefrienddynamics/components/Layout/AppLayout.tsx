import * as React from 'react';
import { Icon } from '@fluentui/react';
import { appConfig } from '../../config/appConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import mefriendLogo from '../../assets/unnamed.webp';
import { AppNavigation } from '../Navigation/AppNavigation';
import styles from './AppLayout.module.scss';

export interface IAppLayoutProps {
  activeRouteKey: AppRouteKey;
  userDisplayName: string;
  canAccessModule: (moduleKey: string) => boolean;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const getInitials = (displayName: string): string => {
  const nameParts = displayName
    .split(' ')
    .map(part => part.trim())
    .filter(part => part.length > 0);

  if (nameParts.length === 0) {
    return 'MF';
  }

  if (nameParts.length === 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }

  return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
};

export const AppLayout: React.FC<IAppLayoutProps> = ({ activeRouteKey, canAccessModule, userDisplayName, onNavigate, children }) => {
  const userInitials = getInitials(userDisplayName);

  return (
    <div className={styles.appLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarPanel}>
          <div className={styles.brand}>
            <img className={styles.brandMark} src={mefriendLogo} alt="MeFriend" />
            <div className={styles.brandText}>
              <h1>{appConfig.appName}</h1>
              <p>{appConfig.appSubtitle}</p>
            </div>
          </div>
          <AppNavigation activeRouteKey={activeRouteKey} canAccessModule={canAccessModule} onNavigate={onNavigate} />
          <div className={styles.userPanel}>
            <span className={styles.userAvatar} aria-hidden="true">
              {userInitials}
            </span>
            <div className={styles.userMeta}>
              <span>Signed in</span>
              <strong>{userDisplayName}</strong>
            </div>
            <Icon className={styles.userIcon} iconName="ChevronRight" aria-hidden="true" />
          </div>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
};
