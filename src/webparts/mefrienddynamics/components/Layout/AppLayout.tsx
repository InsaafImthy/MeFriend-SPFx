import * as React from 'react';
import { appConfig } from '../../config/appConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import { AppNavigation } from '../Navigation/AppNavigation';
import styles from './AppLayout.module.scss';

export interface IAppLayoutProps {
  activeRouteKey: AppRouteKey;
  userDisplayName: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<IAppLayoutProps> = ({ activeRouteKey, userDisplayName, onNavigate, children }) => (
  <div className={styles.appLayout}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.brandMark}>MF</span>
        <div>
          <h1>{appConfig.appName}</h1>
          <p>{appConfig.appSubtitle}</p>
        </div>
      </div>
      <AppNavigation activeRouteKey={activeRouteKey} onNavigate={onNavigate} />
    </aside>
    <main className={styles.main}>
      <div className={styles.topBar}>
        <span>Signed in as</span>
        <strong>{userDisplayName}</strong>
      </div>
      <div className={styles.content}>{children}</div>
    </main>
  </div>
);
