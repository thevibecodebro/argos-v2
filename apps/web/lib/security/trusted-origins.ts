type EnvSource = Partial<Record<string, string | undefined>>;

type SafeRequestOriginOptions = {
  env?: EnvSource;
  nodeEnv?: string;
};

const DEFAULT_LOCAL_ORIGIN = "http://localhost:3000";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);
const SITE_ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "VERCEL_URL",
] as const;
const VERCEL_PREVIEW_ORIGIN_ENV_KEYS = [
  "NEXT_PUBLIC_VERCEL_BRANCH_URL",
  "VERCEL_BRANCH_URL",
  "NEXT_PUBLIC_VERCEL_URL",
  "VERCEL_URL",
] as const;

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function normalizeProtocol(value: string | null) {
  const protocol = value?.trim().toLowerCase().replace(/:$/, "");

  if (protocol !== "http" && protocol !== "https") {
    return null;
  }

  return protocol;
}

function hasUnsafeForwardedHostCharacters(value: string) {
  return /[\s/@\\?#]/.test(value);
}

function normalizeOrigin(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);

    if ((url.protocol !== "http:" && url.protocol !== "https:") || !url.hostname) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getConfiguredSiteOrigin(env: EnvSource) {
  for (const key of SITE_ORIGIN_ENV_KEYS) {
    const origin = normalizeOrigin(env[key]);

    if (origin) {
      return origin;
    }
  }

  return null;
}

function getTrustedSiteOrigin(env: EnvSource, nodeEnv: string | undefined) {
  const siteOrigin = getConfiguredSiteOrigin(env);

  if (siteOrigin) {
    return siteOrigin;
  }

  if (nodeEnv === "production") {
    throw new Error("Missing trusted production site origin");
  }

  return DEFAULT_LOCAL_ORIGIN;
}

function isVercelPreviewEnvironment(env: EnvSource) {
  return env.VERCEL_ENV === "preview" || env.NEXT_PUBLIC_VERCEL_ENV === "preview";
}

function getVercelPreviewOrigins(env: EnvSource) {
  if (!isVercelPreviewEnvironment(env)) {
    return [];
  }

  return VERCEL_PREVIEW_ORIGIN_ENV_KEYS.map((key) => env[key]);
}

function getForwardedOrigin(request: Request) {
  const forwardedHost = firstHeaderValue(request.headers.get("x-forwarded-host"));

  if (!forwardedHost || hasUnsafeForwardedHostCharacters(forwardedHost)) {
    return null;
  }

  const forwardedProtocol = normalizeProtocol(
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? "https",
  );

  if (!forwardedProtocol) {
    return null;
  }

  return normalizeOrigin(`${forwardedProtocol}://${forwardedHost}`);
}

function hasForwardedOriginHeaders(request: Request) {
  return Boolean(
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
      firstHeaderValue(request.headers.get("x-forwarded-proto")),
  );
}

function isLocalOrigin(origin: string) {
  const normalized = normalizeOrigin(origin);

  if (!normalized) {
    return false;
  }

  const hostname = new URL(normalized).hostname;
  return LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost");
}

export function getTrustedOrigins(env: EnvSource = process.env) {
  const origins = [
    getConfiguredSiteOrigin(env),
    ...getVercelPreviewOrigins(env),
    ...(env.ARGOS_ALLOWED_ORIGINS?.split(",") ?? []),
  ];
  const trustedOrigins: string[] = [];

  for (const origin of origins) {
    const normalized = normalizeOrigin(origin);

    if (normalized && !trustedOrigins.includes(normalized)) {
      trustedOrigins.push(normalized);
    }
  }

  return trustedOrigins;
}

export function isTrustedOrigin(origin: string, env: EnvSource = process.env) {
  const normalized = normalizeOrigin(origin);

  return Boolean(normalized && getTrustedOrigins(env).includes(normalized));
}

export function getSafeRequestOrigin(
  request: Request,
  options: SafeRequestOriginOptions = {},
) {
  const env = options.env ?? process.env;
  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV;
  const requestOrigin =
    normalizeOrigin(new URL(request.url).origin) ?? getTrustedSiteOrigin(env, nodeEnv);
  const forwardedOrigin = getForwardedOrigin(request);

  if (nodeEnv !== "production") {
    if (isLocalOrigin(requestOrigin)) {
      return requestOrigin;
    }

    return forwardedOrigin ?? requestOrigin;
  }

  if (forwardedOrigin && isTrustedOrigin(forwardedOrigin, env)) {
    return forwardedOrigin;
  }

  if (hasForwardedOriginHeaders(request)) {
    return getTrustedSiteOrigin(env, nodeEnv);
  }

  if (isTrustedOrigin(requestOrigin, env)) {
    return requestOrigin;
  }

  return getTrustedSiteOrigin(env, nodeEnv);
}
