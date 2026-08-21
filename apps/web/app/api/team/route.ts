import { NextResponse } from "next/server";
import { createAccessRepository } from "@/lib/access/create-repository";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { DashboardServiceError, getManagerDashboard } from "@/lib/dashboard/service";
import {
  createEffectiveTenantAccessRepository,
  createEffectiveTenantRepository,
} from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("call_analytics");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const [repository, accessRepository] = await Promise.all([
      createEffectiveTenantRepository(createDashboardRepository(), authUser.id),
      createEffectiveTenantAccessRepository(createAccessRepository(), authUser.id),
    ]);
    const dashboard = await getManagerDashboard(repository, authUser.id, new Date(), accessRepository);

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
