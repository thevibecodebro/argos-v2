import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardLeaderboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leaderboard = await getDashboardLeaderboard(createDashboardRepository(), authUser.id);

    if (!leaderboard) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(leaderboard, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to load dashboard leaderboard", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
