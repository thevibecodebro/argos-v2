import { NextResponse } from "next/server";
import { SupabaseProvisioningRepository } from "@/lib/provisioning/repository";
import { ensureUserProvisioned } from "@/lib/provisioning/service";
import { isRetryableSupabaseAuthError } from "@/lib/supabase/auth-errors";
import { logAuthTransportFailure } from "@/lib/supabase/auth-observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/dashboard";

  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

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
        await ensureUserProvisioned(new SupabaseProvisioningRepository(), user);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv || !forwardedHost) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      return NextResponse.redirect(`${forwardedProto}://${forwardedHost}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
