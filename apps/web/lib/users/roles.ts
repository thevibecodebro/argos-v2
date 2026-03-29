export const APP_USER_ROLES = ["rep", "manager", "executive", "admin"] as const;

export type AppUserRole = (typeof APP_USER_ROLES)[number];

export function isAppUserRole(value: string | null): value is AppUserRole {
  if (!value) {
    return false;
  }

  return APP_USER_ROLES.includes(value as AppUserRole);
}

export function parseAppUserRole(value: string | null): AppUserRole | null {
  return isAppUserRole(value) ? value : null;
}
