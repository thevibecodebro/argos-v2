import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import {
  createStripeBillingPortalSession,
  StripeBillingPortalConfigurationError,
} from "@/lib/billing/stripe-portal";
import { getRequestOrigin } from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = getRequestOrigin(request);

  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    if (!authUser.email) {
      return settingsRedirect(origin, {
        billing_error: "portal_not_available",
      });
    }

    const returnUrl = new URL("/settings", origin);
    const session = await createStripeBillingPortalSession({
      customerEmail: authUser.email,
      returnUrl: returnUrl.toString(),
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    if (error instanceof StripeBillingPortalConfigurationError) {
      return settingsRedirect(origin, {
        billing_error: "portal_not_available",
      });
    }

    console.error("Failed to create Stripe billing portal session", error);

    return settingsRedirect(origin, {
      billing_error: "portal_failed",
    });
  }
}

function settingsRedirect(origin: string, params: Record<string, string>) {
  const url = new URL("/settings", origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url);
}
