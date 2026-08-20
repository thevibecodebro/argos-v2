import {
  exchangeGoogleCode,
  getGoogleUserProfile,
} from "@argos-v2/google-workspace-client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { organizationHasManagedCapability } from "@/lib/access/managed-capabilities-server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  decodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveGoogleMeetRedirectUri,
  timingSafeNonceMatch,
} from "@/lib/integrations/oauth";
import { isGoogleMeetIntegrationConfigured } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

function settingsRedirect(
  request: Request,
  key: string,
  value: string,
  clearNonce = false,
) {
  const target = new URL("/settings/integrations", getRequestOrigin(request));
  target.searchParams.set(key, value);
  const response = NextResponse.redirect(target);

  if (clearNonce) {
    response.cookies.set(integrationOAuthCookieNames.google_meet, "", {
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
    return settingsRedirect(request, "google_meet_error", oauthError, true);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return settingsRedirect(request, "google_meet_error", "missing_params");
  }
  if (!isGoogleMeetIntegrationConfigured()) {
    return settingsRedirect(request, "google_meet_error", "not_configured", true);
  }

  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return settingsRedirect(request, "google_meet_error", "no_session");
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);
  if (!viewer?.org) {
    return settingsRedirect(request, "google_meet_error", "not_provisioned", true);
  }
  if (!(await organizationHasManagedCapability(viewer.org.id, "integration_google_meet"))) {
    return settingsRedirect(request, "google_meet_error", "feature_unavailable", true);
  }
  if (viewer.role !== "admin") {
    return settingsRedirect(request, "google_meet_error", "forbidden", true);
  }

  const cookieStore = await cookies();
  const cookieValue =
    cookieStore.get(integrationOAuthCookieNames.google_meet)?.value ?? null;
  const decoded = decodeIntegrationOAuthState(state);
  if (!cookieValue || !decoded) {
    return settingsRedirect(request, "google_meet_error", "invalid_state", true);
  }

  const cookieMatches =
    timingSafeNonceMatch(cookieValue, state) ||
    timingSafeNonceMatch(cookieValue, decoded.nonce);
  if (
    !cookieMatches ||
    decoded.userId !== viewer.id ||
    decoded.orgId !== viewer.org.id
  ) {
    return settingsRedirect(request, "google_meet_error", "state_mismatch", true);
  }

  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return settingsRedirect(request, "google_meet_error", "not_configured", true);
  }

  try {
    const tokens = await exchangeGoogleCode({
      clientId,
      clientSecret,
      code,
      redirectUri: resolveGoogleMeetRedirectUri(getRequestOrigin(request)),
    });
    const profile = await getGoogleUserProfile({
      accessToken: tokens.accessToken,
    });

    if (!profile.id || !profile.email) {
      throw new Error("Google profile is missing organizer identity");
    }

    await repository.upsertGoogleMeetIntegration({
      ...tokens,
      connectedUserId: viewer.id,
      googleEmail: profile.email,
      googleUserId: profile.id,
      orgId: viewer.org.id,
    });

    return settingsRedirect(
      request,
      "google_meet_connected",
      "true",
      true,
    );
  } catch {
    return settingsRedirect(
      request,
      "google_meet_error",
      "callback_failed",
      true,
    );
  }
}
