import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getZoomOAuthCapability } from "@/lib/capabilities/service";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import { INTEGRATIONS_SETTINGS_PATH } from "@/lib/integrations/settings";
import {
  buildZoomOAuthUrl,
  createIntegrationNonce,
  encodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveZoomRedirectUri,
} from "@/lib/integrations/oauth";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = createIntegrationsRepository();
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return NextResponse.redirect(new URL(`${INTEGRATIONS_SETTINGS_PATH}?zoom_error=not_provisioned`, request.url));
  }

  if (viewer.role !== "admin") {
    return NextResponse.redirect(new URL(`${INTEGRATIONS_SETTINGS_PATH}?zoom_error=forbidden`, request.url));
  }

  const capability = getZoomOAuthCapability();

  if (!capability.available) {
    return NextResponse.redirect(new URL(`${INTEGRATIONS_SETTINGS_PATH}?zoom_error=not_configured`, request.url));
  }

  const origin = getRequestOrigin(request);
  const redirectUri = resolveZoomRedirectUri(origin);
  const nonce = createIntegrationNonce();
  const clientId = process.env.ZOOM_CLIENT_ID!;
  const state = encodeIntegrationOAuthState({
    nonce,
    orgId: viewer.org.id,
    userId: viewer.id,
  });

  const response = NextResponse.redirect(
    buildZoomOAuthUrl({
      clientId,
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
