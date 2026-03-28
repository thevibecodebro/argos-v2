const PROTECTED_PATH_PREFIXES = ["/dashboard"] as const;

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
