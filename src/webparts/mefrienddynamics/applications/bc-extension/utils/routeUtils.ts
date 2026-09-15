import { appConfig } from '../config/appConfig';
import { bcApplicationConfig } from '../config/applicationConfig';
import { routeDefinitions } from '../config/moduleConfig';
import type { IAppRouteDefinition, IResolvedRoute, IReadonlyRouteParams } from '../models/common/AppRoute';

const normalizePath = (path: string): string =>
  path.replace(/^#\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '') || appConfig.defaultRoutePath;

const matchRoute = (route: IAppRouteDefinition, routePath: string): IReadonlyRouteParams | undefined => {
  const routeParts = route.path.split('/');
  const currentParts = normalizePath(routePath).split('/');

  if (routeParts.length !== currentParts.length) {
    return undefined;
  }

  const params: { id?: string } = {};

  for (let index = 0; index < routeParts.length; index++) {
    const routePart = routeParts[index];
    const currentPart = currentParts[index];

    if (routePart.charAt(0) === ':') {
      const paramName = routePart.substring(1);

      if (paramName === 'id') {
        params.id = decodeURIComponent(currentPart);
      }

      continue;
    }

    if (routePart !== currentPart) {
      return undefined;
    }
  }

  return params;
};

export const resolveRoute = (routePath: string): IResolvedRoute => {
  const normalizedRoutePath = normalizePath(routePath);

  for (const route of routeDefinitions) {
    const params = matchRoute(route, normalizedRoutePath);

    if (params) {
      return {
        ...route,
        params
      };
    }
  }

  const fallbackRoute = routeDefinitions[0];

  return {
    ...fallbackRoute,
    params: {}
  };
};

// BC module paths stay relative inside the application; the portal owns the prefix.
export const buildHashHref = (path: string): string => `#/${bcApplicationConfig.route}/${normalizePath(path)}`;
