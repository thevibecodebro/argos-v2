import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { createCallRecordingSignedUrl } from "@/lib/calls/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: noStoreHeaders },
      );
    }

    const { id } = await params;
    const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
    const result = await createCallRecordingSignedUrl(
      repository,
      authUser.id,
      id,
    );

    if (!result.ok) {
      return Response.json(
        {
          code: result.code,
          error: result.error,
        },
        {
          status: result.status,
          headers: noStoreHeaders,
        },
      );
    }

    return Response.json(result.data, {
      headers: noStoreHeaders,
    });
  } catch (error) {
    console.error("Failed to create call recording URL", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
