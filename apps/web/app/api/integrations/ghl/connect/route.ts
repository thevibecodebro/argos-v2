import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  buildGhlOAuthUrl,
  createIntegrationNonce,
  encodeIntegrationOAuthState,
  getRequestOrigin,
  integrationOAuthCookieNames,
  resolveGhlRedirectUri,
} from "@/lib/integrations/oauth";
import { isGhlIntegrationConfigured } from "@/lib/integrations/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/settings?ghl_error=${error}`, getRequestOrigin(request)));
}

export async function GET(request: Request) {
  const capabilityAccess = await requireAuthenticatedManagedCapability("integration_ghl");
  if (!capabilityAccess.ok) return capabilityAccess.response;
  const authUser = capabilityAccess.user;

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

  if (!isGhlIntegrationConfigured()) {
    return settingsRedirect(request, "not_configured");
  }

  const clientId = process.env.GHL_CLIENT_ID;
  if (!clientId) {
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

  let oauthUrl: string;
  try {
    oauthUrl = buildGhlOAuthUrl({
      clientId,
      installUrl: process.env.GHL_INSTALL_URL,
      redirectUri,
      state,
    });
  } catch {
    return settingsRedirect(request, "invalid_install_url");
  }

  const response = NextResponse.redirect(oauthUrl);

  response.cookies.set(integrationOAuthCookieNames.ghl, state, {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax",
    secure: redirectUri.startsWith("https://"),
  });

  return response;
}
