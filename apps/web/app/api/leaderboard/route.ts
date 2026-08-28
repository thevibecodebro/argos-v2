import { NextResponse } from "next/server";
import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { createProductRepository } from "@/lib/product/create-repository";
import { getLeaderboard } from "@/lib/product/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("leaderboard");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const leaderboard = await getLeaderboard(createProductRepository(), authUser.id);

    return NextResponse.json(
      { leaderboard },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load leaderboard", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
