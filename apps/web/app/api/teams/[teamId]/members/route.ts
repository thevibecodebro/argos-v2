import { NextResponse } from "next/server";
import { unauthorizedJson } from "@/lib/http";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";

export const dynamic = "force-dynamic";

export async function POST() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  return NextResponse.json(
    {
      error: "Team membership management is not implemented yet.",
    },
    { status: 501 },
  );
}
