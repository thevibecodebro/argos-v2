import { NextResponse } from "next/server";
import { SupabaseProvisioningRepository } from "@/lib/provisioning/repository";
import { ensureUserProvisioned } from "@/lib/provisioning/service";
import { isRetryableSupabaseAuthError } from "@/lib/supabase/auth-errors";
import { logAuthTransportFailure } from "@/lib/supabase/auth-observability";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRequestOrigin } from "@/lib/security/trusted-origins";
import {
  getOrglessProtectedDestination,
  getPlatformStaffDestination,
  getSafeNextPath,
  isProtectedPath,
} from "@/lib/auth-routing";
import { getPlatformStaffAfterProvisioning } from "@/lib/platform/auth";
import { createPlatformRepository } from "@/lib/platform/create-repository";

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
        let isActivePlatformStaff = false;
        const platformRepository = createPlatformRepository();
        const platformStaff = await getPlatformStaffAfterProvisioning(
          platformRepository,
          user,
        );

        isActivePlatformStaff = platformStaff?.status === "active";

        if (isActivePlatformStaff && isProtectedPath(next)) {
          return NextResponse.redirect(
            `${origin}${getPlatformStaffDestination(next)}`,
          );
        }

        if (provisionedUser?.orgId === null && isProtectedPath(next)) {
          return NextResponse.redirect(
            `${origin}${getOrglessProtectedDestination(next, isActivePlatformStaff)}`,
          );
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
