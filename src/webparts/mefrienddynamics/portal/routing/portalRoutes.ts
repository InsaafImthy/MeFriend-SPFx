import { applications, type IPortalApplication } from '../config/applications';
import { normalizePortalPath } from './paths';

export interface IApplicationRoute {
  type: 'application';
  application: IPortalApplication;
  routePath: string;
}

export type PortalRoute = { type: 'home' } | IApplicationRoute | { type: 'notFound' };

export const getPortalPath = (): string => normalizePortalPath(window.location.hash);

export const resolvePortalRoute = (path: string): PortalRoute => {
  const normalized = normalizePortalPath(path);
  if (!normalized || normalized === 'apps') {
    return { type: 'home' };
  }

  // Longest prefix wins when future applications have nested route names.
  const application = applications
    .filter(item => item.enabled && (normalized === item.route || normalized.indexOf(`${item.route}/`) === 0))
    .sort((first, second) => second.route.length - first.route.length)[0];

  if (application) {
    return {
      type: 'application',
      application,
      routePath: normalized === application.route
        ? application.defaultPath
        : normalized.substring(application.route.length + 1)
    };
  }

  return { type: 'notFound' };
};

// Applications may declare old top-level paths for bookmark migration.
export const migrateLegacyApplicationPath = (path: string): string | undefined => {
  const normalized = normalizePortalPath(path);
  const firstSegment = normalized.split('/')[0];
  const application = applications.filter(item => item.enabled && !!item.legacyPathRoots && item.legacyPathRoots.indexOf(firstSegment) >= 0)[0];

  return application ? `${application.route}/${normalized}` : undefined;
};
