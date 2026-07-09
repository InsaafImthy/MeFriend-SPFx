import * as React from 'react';
import { Icon } from '@fluentui/react';
import { appConfig } from '../../config/appConfig';
import { settingsModuleConfig } from '../../config/moduleConfig';
import type { AppRouteKey } from '../../models/common/AppRoute';
import { buildHashHref } from '../../utils/routeUtils';
import mefriendLogo from '../../assets/unnamed.webp';
import { AppNavigation } from '../Navigation/AppNavigation';
import styles from './AppLayout.module.scss';

const userMenuAnimationDurationMs = 150;

export interface IAppLayoutProps {
  activeRouteKey: AppRouteKey;
  userDisplayName: string;
  canAccessModule: (moduleKey: string) => boolean;
  onNavigate: (path: string) => void;
  routeTransitionKey: string;
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

export const AppLayout: React.FC<IAppLayoutProps> = ({ activeRouteKey, canAccessModule, routeTransitionKey, userDisplayName, onNavigate, children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState<boolean>(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState<boolean>(false);
  const [isUserMenuVisible, setIsUserMenuVisible] = React.useState<boolean>(false);
  const [isUserMenuClosing, setIsUserMenuClosing] = React.useState<boolean>(false);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const userPanelRef = React.useRef<HTMLDivElement | null>(null);
  const userMenuCloseTimerRef = React.useRef<number | undefined>(undefined);
  const userInitials = getInitials(userDisplayName);
  const layoutClassName = isSidebarCollapsed ? `${styles.appLayout} ${styles.collapsed}` : styles.appLayout;
  const sidebarLabelId = 'mefriend-sidebar-title';
  const canAccessSettings = canAccessModule(settingsModuleConfig.key);
  const isSettingsActive = activeRouteKey === 'settings';
  const routeTransitionClassName = activeRouteKey === 'customerCreate' || activeRouteKey === 'salesOrderCreate'
    ? `${styles.routeTransition} ${styles.createRouteTransition}`
    : styles.routeTransition;

  const openUserMenu = React.useCallback((): void => {
    if (userMenuCloseTimerRef.current) {
      window.clearTimeout(userMenuCloseTimerRef.current);
      userMenuCloseTimerRef.current = undefined;
    }

    setIsUserMenuVisible(true);
    setIsUserMenuClosing(false);
    setIsUserMenuOpen(true);
  }, []);

  const closeUserMenu = React.useCallback((): void => {
    if (userMenuCloseTimerRef.current) {
      window.clearTimeout(userMenuCloseTimerRef.current);
    }

    setIsUserMenuOpen(false);
    setIsUserMenuClosing(true);
    userMenuCloseTimerRef.current = window.setTimeout(() => {
      setIsUserMenuVisible(false);
      setIsUserMenuClosing(false);
      userMenuCloseTimerRef.current = undefined;
    }, userMenuAnimationDurationMs);
  }, []);

  const toggleUserMenu = React.useCallback((): void => {
    if (isUserMenuOpen) {
      closeUserMenu();
      return;
    }

    openUserMenu();
  }, [closeUserMenu, isUserMenuOpen, openUserMenu]);

  React.useEffect(() => () => {
    if (userMenuCloseTimerRef.current) {
      window.clearTimeout(userMenuCloseTimerRef.current);
    }
  }, []);

  React.useEffect(() => {
    if (!isUserMenuVisible) {
      return undefined;
    }

    const handleDocumentMouseDown = (event: MouseEvent): void => {
      if (userPanelRef.current && event.target instanceof Node && !userPanelRef.current.contains(event.target)) {
        closeUserMenu();
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [closeUserMenu, isUserMenuVisible]);

  React.useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, left: 0 });
    }
  }, [routeTransitionKey]);

  const navigateToSettings = (event: React.MouseEvent<HTMLAnchorElement>): void => {
    event.preventDefault();
    closeUserMenu();
    onNavigate(settingsModuleConfig.route);
  };

  return (
    <div className={layoutClassName}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarPanel} aria-labelledby={sidebarLabelId}>
          <div className={styles.sidebarTopControls}>
            <button
              aria-label={isSidebarCollapsed ? 'Expand side navigation' : 'Collapse side navigation'}
              aria-pressed={isSidebarCollapsed}
              className={styles.sidebarToggle}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? 'Expand side navigation' : 'Collapse side navigation'}
              type="button"
            >
              <Icon iconName={isSidebarCollapsed ? 'DoubleChevronRight12' : 'DoubleChevronLeft12'} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.brand}>
            <img className={styles.brandMark} src={mefriendLogo} alt="MeFriend" />
            <div className={styles.brandText}>
              <h1 id={sidebarLabelId}>{appConfig.appName}</h1>
            </div>
          </div>
          <AppNavigation
            activeRouteKey={activeRouteKey}
            canAccessModule={canAccessModule}
            isCollapsed={isSidebarCollapsed}
            onNavigate={onNavigate}
          />
          <div className={styles.userPanel} ref={userPanelRef}>
            <button
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              className={isSettingsActive ? `${styles.userButton} ${styles.userButtonActive}` : styles.userButton}
              onClick={toggleUserMenu}
              title={isSidebarCollapsed ? userDisplayName : undefined}
              type="button"
            >
              <span className={styles.userAvatar} aria-hidden="true">
                {userInitials}
              </span>
              <span className={styles.userMeta}>
                <span>Signed in</span>
                <strong>{userDisplayName}</strong>
              </span>
              <Icon className={isUserMenuOpen ? `${styles.userIcon} ${styles.userIconOpen}` : styles.userIcon} iconName="ChevronDown" aria-hidden="true" />
            </button>
            {isUserMenuVisible ? (
              <div className={isUserMenuClosing ? `${styles.userMenu} ${styles.userMenuClosing}` : styles.userMenu} role="menu" aria-label="User menu">
                {canAccessSettings ? (
                  <a
                    aria-current={isSettingsActive ? 'page' : undefined}
                    className={isSettingsActive ? `${styles.userMenuItem} ${styles.userMenuItemActive}` : styles.userMenuItem}
                    href={buildHashHref(settingsModuleConfig.route)}
                    onClick={navigateToSettings}
                    role="menuitem"
                  >
                    <Icon className={styles.userMenuIcon} iconName="Settings" aria-hidden="true" />
                    <span>Settings</span>
                  </a>
                ) : null}
                {!canAccessSettings ? <span className={styles.userMenuEmpty}>No account actions available.</span> : null}
              </div>
            ) : null}
          </div>
        </div>
      </aside>
      <main className={styles.main}>
        <div className={styles.content} ref={contentRef}>
          <div className={routeTransitionClassName} key={routeTransitionKey}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
