import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { getTrainingAiStatus } from "@/lib/training/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const status = getTrainingAiStatus();
  return NextResponse.json({ available: status.available });
}
