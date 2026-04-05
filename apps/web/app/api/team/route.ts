import { NextResponse } from "next/server";
import { createAccessRepository } from "@/lib/access/create-repository";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { DashboardServiceError, getManagerDashboard } from "@/lib/dashboard/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dashboard = await getManagerDashboard(
      createDashboardRepository(),
      authUser.id,
      new Date(),
      createAccessRepository(),
    );

    if (!dashboard) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(
      { team: dashboard.reps },
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

    console.error("Failed to load team directory", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
