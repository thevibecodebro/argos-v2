import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail } from "@/lib/calls/service";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id } = await params;
  const result = await getCallDetail(createCallsRepository(), authUser.id, id);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json(
    { highlights: result.data.moments.filter((moment) => moment.isHighlight) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
