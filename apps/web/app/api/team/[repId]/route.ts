import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import {
  DashboardServiceError,
  getManagerDashboard,
  getRepBadges,
  getRepDashboard,
} from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ repId: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repId } = await context.params;
    const repository = createDashboardRepository();
    const [managerDashboard, repDashboard, badges] = await Promise.all([
      getManagerDashboard(repository, authUser.id),
      getRepDashboard(repository, authUser.id, repId),
      getRepBadges(repository, authUser.id, repId),
    ]);

    if (!managerDashboard || !repDashboard || !badges) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const member = managerDashboard.reps.find((entry) => entry.id === repId);

    if (!member) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    return NextResponse.json(
      { member, dashboard: repDashboard, badges: badges.badges },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load team member", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
