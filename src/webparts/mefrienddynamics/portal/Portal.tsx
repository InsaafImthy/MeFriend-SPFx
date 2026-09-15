import * as React from 'react';
import type { IPortalApplicationProps } from '../shared/models/IPortalApplicationProps';
import { PortalTransition } from './components/PortalTransition';
import { ApplicationsHome } from './pages/ApplicationsHome';
import { getPortalPath, migrateLegacyApplicationPath, resolvePortalRoute } from './routing/portalRoutes';
import { buildPortalHref, normalizePortalPath } from './routing/paths';
import styles from './Portal.module.scss';

interface ITransition {
  targetPath: string;
  sourcePath: string;
  label: string;
  iconName: string;
  startedAt: number;
  phase: 'leaving' | 'loading' | 'finishing';
  ready: boolean;
}

export const Portal: React.FC<Omit<IPortalApplicationProps, 'routePath'>> = props => {
  const [path, setPath] = React.useState<string>(getPortalPath);
  const [transition, setTransition] = React.useState<ITransition | undefined>(undefined);
  const navigationTimerRef = React.useRef<number | undefined>(undefined);
  const prefersReducedMotion = (): boolean =>
    !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  React.useEffect(() => {
    const onHashChange = (): void => {
      const currentPath = getPortalPath();
      const legacyPath = migrateLegacyApplicationPath(currentPath);
      if (legacyPath) {
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${buildPortalHref(legacyPath)}`);
      }
      const nextPath = legacyPath || currentPath;
      setPath(nextPath);
      setTransition(current => {
        if (!current) {
          return current;
        }
        if (normalizePortalPath(nextPath) === current.targetPath) {
          return { ...current, phase: 'loading' };
        }
        if (normalizePortalPath(nextPath) === current.sourcePath && current.phase === 'leaving') {
          return current;
        }
        if (navigationTimerRef.current) {
          window.clearTimeout(navigationTimerRef.current);
          navigationTimerRef.current = undefined;
        }
        return undefined;
      });
    };
    window.addEventListener('hashchange', onHashChange);
    onHashChange();

    return () => {
      window.removeEventListener('hashchange', onHashChange);
      if (navigationTimerRef.current) {
        window.clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  const beginNavigation = React.useCallback((target: string, label: string, iconName: string): void => {
    const targetPath = normalizePortalPath(target);
    if (normalizePortalPath(getPortalPath()) === targetPath || transition?.targetPath === targetPath) {
      return;
    }

    if (navigationTimerRef.current) {
      window.clearTimeout(navigationTimerRef.current);
    }
    setTransition({
      targetPath,
      sourcePath: normalizePortalPath(path),
      label,
      iconName,
      startedAt: Date.now(),
      phase: 'leaving',
      ready: false
    });
    navigationTimerRef.current = window.setTimeout(() => {
      window.location.hash = buildPortalHref(targetPath);
      navigationTimerRef.current = undefined;
    }, prefersReducedMotion() ? 0 : 180);
  }, [path, transition?.targetPath]);

  const markReady = React.useCallback((): void => {
    setTransition(current => {
      if (!current || current.ready || current.targetPath !== normalizePortalPath(getPortalPath())) {
        return current;
      }
      return { ...current, ready: true };
    });
  }, []);

  const route = resolvePortalRoute(path);

  React.useEffect(() => {
    if (route.type === 'home') {
      markReady();
    }
  }, [route.type, path, markReady]);

  React.useEffect(() => {
    if (!transition) {
      return undefined;
    }
    const timeout = window.setTimeout(markReady, 3800);
    return () => window.clearTimeout(timeout);
  }, [transition?.targetPath, markReady]);

  React.useEffect(() => {
    if (!transition?.ready || transition.phase === 'finishing' || transition.targetPath !== normalizePortalPath(path)) {
      return undefined;
    }
    const minDuration = prefersReducedMotion() ? 0 : 650;
    const remaining = Math.max(0, minDuration - (Date.now() - transition.startedAt));
    const timeout = window.setTimeout(() => {
      setTransition(current => current ? { ...current, phase: 'finishing' } : current);
    }, remaining);
    return () => window.clearTimeout(timeout);
  }, [transition, path]);

  React.useEffect(() => {
    if (transition?.phase !== 'finishing') {
      return undefined;
    }
    const timeout = window.setTimeout(() => setTransition(undefined), prefersReducedMotion() ? 0 : 240);
    return () => window.clearTimeout(timeout);
  }, [transition?.phase]);

  let screen: React.ReactNode;
  let screenKey: string;
  if (route.type === 'home') {
    screen = <ApplicationsHome onLaunch={application => beginNavigation(application.route, `Opening ${application.name}`, application.iconName)} />;
    screenKey = 'home';
  } else if (route.type === 'application') {
    const Application = route.application.component;
    screen = <Application {...props} routePath={route.routePath} onPortalNavigate={target => beginNavigation(target, 'Returning to All Applications', 'Home')} onPortalReady={markReady} />;
    screenKey = route.application.id;
  } else {
    screen = (
      <main className={styles.notFound}>
        <h1>Application not found</h1>
        <p>This application route is unavailable.</p>
        <a href={buildPortalHref('apps')}>All Applications</a>
      </main>
    );
    screenKey = 'notFound';
  }

  return (
    <div className={styles.portal}>
      <div aria-busy={!!transition} className={transition?.phase === 'leaving' && transition.sourcePath === normalizePortalPath(path) ? `${styles.screen} ${styles.leaving}` : styles.screen} key={screenKey}>
        {screen}
      </div>
      {transition ? <PortalTransition label={transition.label} iconName={transition.iconName} finishing={transition.phase === 'finishing'} /> : null}
    </div>
  );
};
