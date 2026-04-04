import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { createAnnotation, listAnnotations } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

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
  const result = await listAnnotations(createCallsRepository(), authUser.id, id);
  return fromServiceResult(result);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const body = (await request.json()) as { note?: unknown; timestampSeconds?: unknown };

  if (typeof body.note !== "string") {
    return Response.json({ error: "note is required" }, { status: 400 });
  }

  if (
    body.timestampSeconds !== undefined &&
    body.timestampSeconds !== null &&
    typeof body.timestampSeconds !== "number"
  ) {
    return Response.json({ error: "timestampSeconds must be a number" }, { status: 400 });
  }

  const { id } = await params;
  const result = await createAnnotation(createCallsRepository(), authUser.id, id, {
    note: body.note,
    timestampSeconds: typeof body.timestampSeconds === "number" ? body.timestampSeconds : null,
  });

  return fromServiceResult(result);
}
