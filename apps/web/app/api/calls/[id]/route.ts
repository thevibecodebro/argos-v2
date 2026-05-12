import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { deleteCallData, getCallDetail, renameCall } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const { id } = await params;
    const result = await deleteCallData(createCallsRepository(), authUser.id, id, {
      removeStorageObjects: removeCallStorageObjects,
    });

    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to delete call data", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function removeCallStorageObjects(objects: Array<{ bucket: string; path: string }>) {
  const supabase = createSupabaseAdminClient();
  const pathsByBucket = new Map<string, string[]>();

  for (const object of objects) {
    const current = pathsByBucket.get(object.bucket) ?? [];
    current.push(object.path);
    pathsByBucket.set(object.bucket, current);
  }

  for (const [bucket, paths] of pathsByBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) {
      throw new Error(error.message);
    }
  }
}
