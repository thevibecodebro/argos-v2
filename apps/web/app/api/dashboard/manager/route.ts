import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { DashboardServiceError, getManagerDashboard } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("call_analytics");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const repository = await createEffectiveTenantRepository(createDashboardRepository(), authUser.id);
    const dashboard = await getManagerDashboard(repository, authUser.id);

    if (!dashboard) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(dashboard, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load manager dashboard", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
