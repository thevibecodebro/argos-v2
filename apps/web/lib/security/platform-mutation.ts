import { getSafeRequestOrigin } from "./trusted-origins";

export type PlatformMutationValidation =
  | { ok: true }
  | { ok: false; error: string; status: 403 | 415 };

function normalizeOrigin(value: string | null) {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function validatePlatformJsonMutation(
  request: Request,
): PlatformMutationValidation {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.startsWith("application/json")) {
    return {
      ok: false,
      error: "Platform mutations require an application/json request",
      status: 415,
    };
  }

  const requestOrigin = normalizeOrigin(request.headers.get("origin"));
  const trustedRequestOrigin = getSafeRequestOrigin(request);
  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase();

  if (
    !requestOrigin ||
    requestOrigin !== trustedRequestOrigin ||
    (fetchSite && fetchSite !== "same-origin")
  ) {
    return {
      ok: false,
      error: "Cross-origin platform mutation rejected",
      status: 403,
    };
  }

  return { ok: true };
}
