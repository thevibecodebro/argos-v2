import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  decodeIntegrationOAuthState,
  exchangeGhlCode,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveGhlRedirectUri,
  timingSafeNonceMatch,
} from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, key: string, value: string, clearNonce = false) {
  const target = new URL("/settings", getRequestOrigin(request));
  target.searchParams.set(key, value);
  const response = NextResponse.redirect(target);

  if (clearNonce) {
    response.cookies.set(integrationOAuthCookieNames.ghl, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return settingsRedirect(request, "ghl_error", oauthError);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return settingsRedirect(request, "ghl_error", "missing_params");
  }

  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return settingsRedirect(request, "ghl_error", "no_session");
  }

  const repository = createIntegrationsRepository();
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return settingsRedirect(request, "ghl_error", "not_provisioned");
  }

  const decoded = decodeIntegrationOAuthState(state);

  if (!decoded) {
    return settingsRedirect(request, "ghl_error", "invalid_state");
  }

  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get(integrationOAuthCookieNames.ghl)?.value ?? null;

  if (!cookieNonce) {
    return settingsRedirect(request, "ghl_error", "session_expired", true);
  }

  if (
    !timingSafeNonceMatch(cookieNonce, decoded.nonce) ||
    decoded.userId !== viewer.id ||
    decoded.orgId !== viewer.org.id
  ) {
    return settingsRedirect(request, "ghl_error", "state_mismatch", true);
  }

  try {
    const redirectUri = resolveGhlRedirectUri(getRequestOrigin(request));
    const tokens = await exchangeGhlCode(code, redirectUri);

    await repository.upsertGhlIntegration({
      accessToken: tokens.accessToken,
      locationId: tokens.locationId,
      locationName: tokens.locationName,
      orgId: viewer.org.id,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
    });

    return settingsRedirect(request, "ghl_connected", "true", true);
  } catch {
    return settingsRedirect(request, "ghl_error", "callback_failed", true);
  }
}
