import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { deleteAnnotation } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return unauthorizedJson();
  }

  const { id, annotationId } = await params;
  const result = await deleteAnnotation(createCallsRepository(), authUser.id, id, annotationId);
  return fromServiceResult(result);
}
