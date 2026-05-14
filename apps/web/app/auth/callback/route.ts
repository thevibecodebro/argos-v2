import { NextResponse } from "next/server";
import { SupabaseProvisioningRepository } from "@/lib/provisioning/repository";
import { ensureUserProvisioned } from "@/lib/provisioning/service";
import { isRetryableSupabaseAuthError } from "@/lib/supabase/auth-errors";
import { logAuthTransportFailure } from "@/lib/supabase/auth-observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRequestOrigin } from "@/lib/security/trusted-origins";
import { getAuthenticatedEntryHref, isProtectedPath } from "@/lib/auth-routing";

function getSafeNextPath(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getSafeRequestOrigin(request);
  const code = searchParams.get("code");
  const next = getSafeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    let exchangeError = null;

    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      exchangeError = result.error;
    } catch (error) {
      if (isRetryableSupabaseAuthError(error)) {
        logAuthTransportFailure({
          source: "auth-callback",
          path: "/auth/callback",
          error,
        });
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      throw error;
    }

    if (!exchangeError) {
      let user = null;
      let userError = null;

      try {
        const result = await supabase.auth.getUser();
        user = result.data.user;
        userError = result.error;
      } catch (error) {
        if (isRetryableSupabaseAuthError(error)) {
          logAuthTransportFailure({
            source: "auth-callback",
            path: "/auth/callback",
            error,
          });
          return NextResponse.redirect(`${origin}/auth/error`);
        }

        throw error;
      }

      if (userError) {
        return NextResponse.redirect(`${origin}/auth/error`);
      }

      if (user) {
        const provisionedUser = await ensureUserProvisioned(
          new SupabaseProvisioningRepository(),
          user,
        );

        if (provisionedUser?.orgId === null && isProtectedPath(next)) {
          return NextResponse.redirect(`${origin}${getAuthenticatedEntryHref(false)}`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
