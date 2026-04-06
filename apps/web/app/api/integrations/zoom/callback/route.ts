import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createIntegrationsRepository } from "@/lib/integrations/create-repository";
import {
  decodeIntegrationOAuthState,
  exchangeZoomCode,
  getRequestOrigin,
  integrationOAuthCookieNames,
  registerZoomWebhook,
  resolveZoomRedirectUri,
  resolveZoomWebhookUrl,
  timingSafeNonceMatch,
} from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

function settingsRedirect(request: Request, key: string, value: string, clearNonce = false) {
  const target = new URL("/settings", getRequestOrigin(request));
  target.searchParams.set(key, value);
  const response = NextResponse.redirect(target);

  if (clearNonce) {
    response.cookies.set(integrationOAuthCookieNames.zoom, "", {
      httpOnly: true,
      maxAge: 0,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

function settingsRedirectWithNotice(
  request: Request,
  params: Record<string, string>,
  clearNonce = false,
) {
  const target = new URL("/settings", getRequestOrigin(request));

  Object.entries(params).forEach(([key, value]) => {
    target.searchParams.set(key, value);
  });

  const response = NextResponse.redirect(target);

  if (clearNonce) {
    response.cookies.set(integrationOAuthCookieNames.zoom, "", {
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
    return settingsRedirect(request, "zoom_error", oauthError);
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return settingsRedirect(request, "zoom_error", "missing_params");
  }

  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return settingsRedirect(request, "zoom_error", "no_session");
  }

  const repository = createIntegrationsRepository();
  const viewer = await repository.findCurrentUserByAuthId(authUser.id);

  if (!viewer?.org) {
    return settingsRedirect(request, "zoom_error", "not_provisioned");
  }

  if (viewer.role !== "admin") {
    return settingsRedirect(request, "zoom_error", "forbidden", true);
  }

  const decoded = decodeIntegrationOAuthState(state);

  if (!decoded) {
    return settingsRedirect(request, "zoom_error", "invalid_state");
  }

  const cookieStore = await cookies();
  const cookieNonce = cookieStore.get(integrationOAuthCookieNames.zoom)?.value ?? null;

  if (!cookieNonce) {
    return settingsRedirect(request, "zoom_error", "session_expired", true);
  }

  if (
    !timingSafeNonceMatch(cookieNonce, decoded.nonce) ||
    decoded.userId !== viewer.id ||
    decoded.orgId !== viewer.org.id
  ) {
    return settingsRedirect(request, "zoom_error", "state_mismatch", true);
  }

  try {
    const redirectUri = resolveZoomRedirectUri(getRequestOrigin(request));
    const tokens = await exchangeZoomCode(code, redirectUri);
    const webhookToken = crypto.randomBytes(32).toString("hex");

    await repository.upsertZoomIntegration({
      accessToken: tokens.accessToken,
      orgId: viewer.org.id,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.tokenExpiresAt,
      webhookToken,
      zoomAccountId: tokens.zoomAccountId,
      zoomUserId: tokens.zoomUserId,
    });

    try {
      await registerZoomWebhook({
        accessToken: tokens.accessToken,
        webhookToken,
        webhookUrl: resolveZoomWebhookUrl(getRequestOrigin(request)),
        zoomAccountId: tokens.zoomAccountId,
      });
    } catch {
      return settingsRedirectWithNotice(
        request,
        {
          zoom_connected: "true",
          zoom_notice: "webhook_registration_failed",
        },
        true,
      );
    }

    return settingsRedirect(request, "zoom_connected", "true", true);
  } catch {
    return settingsRedirect(request, "zoom_error", "callback_failed", true);
  }
}
