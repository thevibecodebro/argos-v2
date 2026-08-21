type AuthenticationMethodReference =
  | string
  | { method?: unknown; timestamp?: unknown };

type AuthClaims = {
  amr?: AuthenticationMethodReference[];
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  };
};

export function isGoogleOAuthSession(claims: unknown): boolean {
  if (!claims || typeof claims !== "object") {
    return false;
  }

  const { amr, app_metadata: appMetadata } = claims as AuthClaims;
  const providers = Array.isArray(appMetadata?.providers)
    ? appMetadata.providers.filter((provider): provider is string => typeof provider === "string")
    : [];
  const isGoogleProvider =
    appMetadata?.provider === "google" &&
    providers.includes("google") &&
    providers.every((provider) => provider === "email" || provider === "google");
  const usedOAuth =
    Array.isArray(amr) &&
    amr.some((entry) =>
      typeof entry === "string" ? entry === "oauth" : entry.method === "oauth",
    );

  return isGoogleProvider && usedOAuth;
}
