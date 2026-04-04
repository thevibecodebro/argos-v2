import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { unauthorizedJson } from "@/lib/http";
import { getRoleplayPersonas } from "@/lib/roleplay/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  return NextResponse.json(
    { personas: getRoleplayPersonas() },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
