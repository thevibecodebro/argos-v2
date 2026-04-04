import { type NextRequest } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { listCalls } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const searchParams = request.nextUrl.searchParams;
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const result = await listCalls(createCallsRepository(), authUser.id, {
      repId: searchParams.get("repId") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      sortBy: (searchParams.get("sortBy") as "createdAt" | "overallScore" | null) ?? undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc" | null) ?? undefined,
      minScore: minScore !== null ? Number(minScore) : undefined,
      maxScore: maxScore !== null ? Number(maxScore) : undefined,
      limit: limit !== null ? Number(limit) : undefined,
      offset: offset !== null ? Number(offset) : undefined,
    });

    if (!result.ok) {
      return fromServiceResult(result);
    }

    return fromServiceResult({
      ok: true,
      data: {
        calls: result.data.calls,
        total: result.data.total,
      },
    });
  } catch (error) {
    console.error("Failed to load call library", error);

    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
