import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/calls/:path*",
    "/upload/:path*",
    "/leaderboard/:path*",
    "/team/:path*",
    "/roleplay/:path*",
    "/training/:path*",
    "/highlights/:path*",
    "/settings/:path*",
    "/notifications/:path*",
    "/onboarding/:path*",
  ],
};
