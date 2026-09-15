export const normalizePortalPath = (path: string): string =>
  path.replace(/^#\/?/, '').replace(/^\/+/, '').replace(/\/+$/, '');

export const buildPortalHref = (path: string): string => {
  const normalized = normalizePortalPath(path);
  return normalized ? `#/${normalized}` : '#/';
};
