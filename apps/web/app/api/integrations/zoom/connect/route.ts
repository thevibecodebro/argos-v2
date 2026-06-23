import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  buildZoomOAuthUrl,
  createIntegrationNonce,
  encodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveZoomRedirectUri,
} from "@/lib/integrations/oauth";
import { unauthorizedJson } from "@/lib/http";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/settings?zoom_error=${error}`, getRequestOrigin(request)));
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

  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return settingsRedirect(request, "not_configured");
  }

  const origin = getRequestOrigin(request);
  const redirectUri = resolveZoomRedirectUri(origin);
  const nonce = createIntegrationNonce();
  const state = encodeIntegrationOAuthState({
    nonce,
    orgId: viewer.org.id,
    userId: viewer.id,
  });

  const response = NextResponse.redirect(
    buildZoomOAuthUrl({
      clientId: process.env.ZOOM_CLIENT_ID,
      redirectUri,
      state,
    }),
  );

  response.cookies.set(integrationOAuthCookieNames.zoom, nonce, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
  });

  return response;
}
