import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { getDashboardSummary } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("call_analytics");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const repository = await createEffectiveTenantRepository(createDashboardRepository(), authUser.id);
    const summary = await getDashboardSummary(repository, authUser.id);

    if (!summary) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to load dashboard summary", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
