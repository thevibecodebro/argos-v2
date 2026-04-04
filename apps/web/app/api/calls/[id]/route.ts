import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { getCallDetail, renameCall } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { id } = await params;
    const result = await getCallDetail(createCallsRepository(), authUser.id, id);
    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to load call detail", error);
    return Response.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const body = (await request.json()) as { callTopic?: unknown };

    if ("callTopic" in body && body.callTopic !== null && typeof body.callTopic !== "string") {
      return Response.json({ error: "callTopic must be a string" }, { status: 400 });
    }

    const { id } = await params;
    const result = await renameCall(
      createCallsRepository(),
      authUser.id,
      id,
      typeof body.callTopic === "string" ? body.callTopic : null,
    );

    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to rename call", error);
    return Response.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
