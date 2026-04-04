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

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = createIntegrationsRepository();
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return NextResponse.redirect(new URL("/settings?zoom_error=not_provisioned", request.url));
  }

  if (!viewer.role || !["admin", "manager", "executive"].includes(viewer.role)) {
    return NextResponse.redirect(new URL("/settings?zoom_error=forbidden", request.url));
  }

  if (!process.env.ZOOM_CLIENT_ID || !process.env.ZOOM_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/settings?zoom_error=not_configured", request.url));
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
