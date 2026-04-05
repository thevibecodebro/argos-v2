import { NextResponse } from "next/server";
import { createAccessRepository } from "@/lib/access/create-repository";
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
    const accessRepository = createAccessRepository();
    const [managerDashboard, repDashboard, badges] = await Promise.all([
      getManagerDashboard(repository, authUser.id, new Date(), accessRepository),
      getRepDashboard(repository, authUser.id, repId, new Date(), accessRepository),
      getRepBadges(repository, authUser.id, repId, accessRepository),
    ]);

    if (!managerDashboard || !repDashboard || !badges) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 });
    }

    const managerCard = managerDashboard.reps.find((entry) => entry.id === repId);
    const viewer = await repository.findCurrentUserByAuthId(authUser.id);
    const orgUsers = viewer?.org ? await repository.findOrgUsersByOrgId(viewer.org.id) : [];
    const repRecord = orgUsers.find((entry) => entry.id === repId);
    const latestCall = repDashboard.recentCalls[0];
    const member = managerCard ?? (
      repRecord || latestCall
        ? {
            id: repId,
            firstName: repRecord?.firstName ?? latestCall?.repFirstName ?? null,
            lastName: repRecord?.lastName ?? latestCall?.repLastName ?? null,
            profileImageUrl: repRecord?.profileImageUrl ?? null,
            compositeScore: repDashboard.monthlyAvgScore,
            weekOverWeekDelta: null,
            needsCoaching: false,
            callCount: repDashboard.recentCalls.length,
          }
        : null
    );

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
