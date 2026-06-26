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

export function getSafeNextPath(value: string | null, fallback = "/dashboard") {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getAuthenticatedEntryHref(
  hasOrganization: boolean,
  options: { isActivePlatformStaff?: boolean } = {},
): string {
  if (!hasOrganization && options.isActivePlatformStaff) {
    return "/platform/dashboard";
  }

  return hasOrganization ? "/dashboard" : "/onboarding";
}

export function getOrglessProtectedDestination(
  next: string,
  isActivePlatformStaff: boolean,
) {
  if (isActivePlatformStaff && (next === "/platform" || next.startsWith("/platform/"))) {
    return next === "/platform" ? "/platform/dashboard" : next;
  }

  return getAuthenticatedEntryHref(false, { isActivePlatformStaff });
}

export function getPlatformStaffDestination(next: string) {
  if (next === "/platform") {
    return "/platform/dashboard";
  }

  if (next.startsWith("/platform/")) {
    return next;
  }

  return "/platform/dashboard";
}
