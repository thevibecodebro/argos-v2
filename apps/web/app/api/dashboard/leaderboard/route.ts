import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const repository = await createEffectiveTenantRepository(createDashboardRepository(), authUser.id);
    const leaderboard = await getDashboardLeaderboard(repository, authUser.id);

    if (!leaderboard) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    // Leaderboard visibility is intentionally org-wide. Drilldown stays scoped elsewhere.
    // Leaderboard visibility is org-wide by product rule. Rep drilldown stays scoped elsewhere.
    return NextResponse.json({ leaderboard }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to load dashboard leaderboard", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
