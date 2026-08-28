import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { DashboardServiceError, getSetupStatus } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const analyticsAccess = await requireAuthenticatedManagedCapability("call_analytics");
    if (!analyticsAccess.ok) return analyticsAccess.response;
    const reportingAccess = await requireAuthenticatedManagedCapability("practice_reporting");
    if (!reportingAccess.ok) return reportingAccess.response;
    const authUser = analyticsAccess.user;

    const repository = await createEffectiveTenantRepository(createDashboardRepository(), authUser.id);
    const status = await getSetupStatus(repository, authUser.id);

    if (!status) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(status, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load setup status", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
