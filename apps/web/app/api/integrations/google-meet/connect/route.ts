import { buildGoogleOAuthUrl } from "@argos-v2/google-workspace-client";
import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  createIntegrationNonce,
  encodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveGoogleMeetRedirectUri,
} from "@/lib/integrations/oauth";
import { isGoogleMeetIntegrationConfigured } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, error: string) {
  const target = new URL("/settings/integrations", getRequestOrigin(request));
  target.searchParams.set("google_meet_error", error);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();
  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = await createEffectiveTenantRepository(
    createIntegrationsRepository(),
    authUser.id,
  );
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return settingsRedirect(request, "not_provisioned");
  }
  if (viewer.role !== "admin") {
    return settingsRedirect(request, "forbidden");
  }
  if (!isGoogleMeetIntegrationConfigured()) {
    return settingsRedirect(request, "not_configured");
  }

  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  if (!clientId) {
    return settingsRedirect(request, "not_configured");
  }

  const redirectUri = resolveGoogleMeetRedirectUri(getRequestOrigin(request));
  const state = encodeIntegrationOAuthState({
    nonce: createIntegrationNonce(),
    orgId: viewer.org.id,
    userId: viewer.id,
  });
  const response = NextResponse.redirect(
    buildGoogleOAuthUrl({ clientId, redirectUri, state }),
  );

  response.cookies.set(integrationOAuthCookieNames.google_meet, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
  });

  return response;
}
