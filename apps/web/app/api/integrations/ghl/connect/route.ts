import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  buildGhlOAuthUrl,
  createIntegrationNonce,
  encodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveGhlRedirectUri,
} from "@/lib/integrations/oauth";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/settings?ghl_error=${error}`, getRequestOrigin(request)));
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const repository = createIntegrationsRepository();
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return settingsRedirect(request, "not_provisioned");
  }

  if (viewer.role !== "admin") {
    return settingsRedirect(request, "forbidden");
  }

  if (!process.env.GHL_CLIENT_ID || !process.env.GHL_CLIENT_SECRET) {
    return settingsRedirect(request, "not_configured");
  }

  const origin = getRequestOrigin(request);
  const redirectUri = resolveGhlRedirectUri(origin);
  const nonce = createIntegrationNonce();
  const state = encodeIntegrationOAuthState({
    nonce,
    orgId: viewer.org.id,
    userId: viewer.id,
  });

  const response = NextResponse.redirect(
    buildGhlOAuthUrl({
      clientId: process.env.GHL_CLIENT_ID,
      redirectUri,
      state,
    }),
  );

  response.cookies.set(integrationOAuthCookieNames.ghl, nonce, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
  });

  return response;
}
