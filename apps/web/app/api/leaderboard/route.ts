import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createProductRepository } from "@/lib/product/create-repository";
import { getLeaderboard } from "@/lib/product/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
