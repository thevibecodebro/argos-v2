import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { getBillingPlan, getBillingPlanQuantity } from "@/lib/billing/plans";
import { DrizzleBillingRepository } from "@/lib/billing/repository";
import {
  createStripeCheckoutSession,
  StripeCheckoutConfigurationError,
} from "@/lib/billing/stripe-checkout";
import { getRequestOrigin } from "@/lib/integrations/oauth";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { createUsersRepository } from "@/lib/users/create-repository";
import { getCurrentUserDetails, type CurrentUserDetails } from "@/lib/users/service";

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

    const currentUser = await getCurrentUserDetails(createUsersRepository(), authUser.id);

    if (!currentUser.ok) {
      return landingRedirect(origin, {
        checkout_error: "billing_not_available",
        plan: plan.id,
      });
    }

    if (!canStartBillingCheckout(currentUser.data)) {
      return landingRedirect(origin, {
        checkout_error: "admin_required",
        plan: plan.id,
      });
    }

    const billingRepository = new DrizzleBillingRepository();
    const activeAccess = await billingRepository.findActiveSoftwareAccess({
      orgId: currentUser.data.orgId,
      userId: currentUser.data.id,
    });

    if (
      plan.mode === "subscription" &&
      activeAccess?.sourceType === "coaching_contract"
    ) {
      return landingRedirect(origin, {
        checkout_error: "coaching_access_active",
        plan: plan.id,
      });
    }

    const rateLimit = await checkRateLimitForPolicy("billingCheckout", {
      type: "user",
      id: authUser.id,
    });

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }

    const returnPath = getSafeBillingReturnPath(
      requestUrl.searchParams.get("return_to"),
      plan.mode === "payment" ? "/settings" : "/dashboard",
    );
    const successUrl = new URL(returnPath, origin);
    successUrl.searchParams.set("checkout", "success");
    successUrl.searchParams.set("plan", plan.id);

    const cancelUrl = new URL(returnPath, origin);
    cancelUrl.searchParams.set("checkout", "cancelled");
    cancelUrl.searchParams.set("plan", plan.id);
    const billingCustomer = await billingRepository.findBillingCustomerForScope({
      orgId: currentUser.data.orgId,
      userId: currentUser.data.id,
    });

    const session = await createStripeCheckoutSession({
      authUserId: authUser.id,
      cancelUrl: cancelUrl.toString(),
      customerId: billingCustomer?.stripeCustomerId ?? null,
      customerEmail: currentUser.data.email,
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

function canStartBillingCheckout(user: CurrentUserDetails) {
  return !user.org || user.role === "admin";
}

function getSafeBillingReturnPath(
  value: string | null,
  fallback: "/dashboard" | "/settings",
) {
  return value === "/roleplay" || value === "/settings" ? value : fallback;
}

function landingRedirect(origin: string, params: Record<string, string>) {
  const url = new URL("/", origin);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.hash = "access";

  return NextResponse.redirect(url);
}
