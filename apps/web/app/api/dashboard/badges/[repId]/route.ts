import { NextResponse } from "next/server";
import { hasManagedCapability } from "@/lib/access/managed-capabilities";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createDashboardRepository } from "@/lib/dashboard/create-repository";
import { DashboardServiceError, getRepBadges } from "@/lib/dashboard/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ repId: string }> },
) {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("call_analytics");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const { repId } = await params;
    const repository = await createEffectiveTenantRepository(createDashboardRepository(), authUser.id);
    const badges = await getRepBadges(repository, authUser.id, repId, undefined, {
      includePracticeReporting: hasManagedCapability(
        capabilityAccess.access,
        "practice_reporting",
      ),
    });

    if (!badges) {
      return NextResponse.json({ error: "User is not provisioned in the app database" }, { status: 404 });
    }

    return NextResponse.json(badges, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Failed to load rep badges", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
