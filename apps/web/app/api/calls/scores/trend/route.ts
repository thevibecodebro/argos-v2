import { type NextRequest } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getScoreTrend } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const searchParams = request.nextUrl.searchParams;
  const days = searchParams.get("days");

  const result = await getScoreTrend(createCallsRepository(), authUser.id, {
    repId: searchParams.get("repId") ?? undefined,
    days: days ? Number(days) : undefined,
  });

  return fromServiceResult(result);
}
