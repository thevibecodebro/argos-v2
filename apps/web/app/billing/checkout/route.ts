import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getBillingPlan, getBillingPlanQuantity } from "@/lib/billing/plans";
import {
  createStripeCheckoutSession,
  StripeCheckoutConfigurationError,
} from "@/lib/billing/stripe-checkout";
import { getRequestOrigin } from "@/lib/integrations/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const plan = getBillingPlan(requestUrl.searchParams.get("plan"));
  const origin = getRequestOrigin(request);

  if (!plan) {
    return landingRedirect(origin, {
      checkout_error: "invalid_plan",
    });
  }

  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("next", `${requestUrl.pathname}${requestUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    const successUrl = new URL("/dashboard", origin);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("plan", plan.id);

    const cancelUrl = new URL("/", origin);
    cancelUrl.searchParams.set("checkout", "cancelled");
    cancelUrl.searchParams.set("plan", plan.id);
    cancelUrl.hash = "access";

    const session = await createStripeCheckoutSession({
      authUserId: authUser.id,
      cancelUrl: cancelUrl.toString(),
      customerEmail: authUser.email,
      plan,
      quantity: getBillingPlanQuantity(
        plan,
        parseSeatQuantity(requestUrl.searchParams.get("seats")),
      ),
      successUrl: successUrl.toString(),
    });

    return NextResponse.redirect(session.url);
  } catch (error) {
    if (error instanceof StripeCheckoutConfigurationError) {
      return landingRedirect(origin, {
        checkout_error: "stripe_not_configured",
        plan: plan.id,
      });
    }

    console.error("Failed to create Stripe checkout session", error);

    return landingRedirect(origin, {
      checkout_error: "checkout_failed",
      plan: plan.id,
    });
  }
}

function parseSeatQuantity(value: string | null) {
  if (!value) {
    return null;
  }

  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : null;
}

function landingRedirect(origin: string, params: Record<string, string>) {
  const url = new URL("/", origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.hash = "access";

  return NextResponse.redirect(url);
}
