const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/calls",
  "/upload",
  "/leaderboard",
  "/team",
  "/roleplay",
  "/training",
  "/highlights",
  "/settings",
  "/notifications",
  "/onboarding",
  "/platform",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getLoginHref(pathname: string, search = ""): string {
  const next = `${pathname}${search}`;
  const params = new URLSearchParams({ next });

  return `/login?${params.toString()}`;
}

export function getAuthenticatedEntryHref(
  hasOrganization: boolean,
  options: { isActivePlatformStaff?: boolean } = {},
): string {
  if (!hasOrganization && options.isActivePlatformStaff) {
    return "/platform";
  }

  return hasOrganization ? "/dashboard" : "/onboarding";
}
