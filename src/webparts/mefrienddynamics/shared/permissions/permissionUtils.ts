export const hasPermission = (permissions: readonly string[], requiredPermission: string): boolean =>
  permissions.indexOf(requiredPermission) !== -1;

export const hasAnyPermission = (permissions: readonly string[], requiredPermissions: readonly string[]): boolean =>
  requiredPermissions.some(permission => hasPermission(permissions, permission));
