import { NextResponse } from "next/server";
import { SupabaseProvisioningRepository } from "@/lib/provisioning/repository";
import { ensureUserProvisioned } from "@/lib/provisioning/service";
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
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

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
