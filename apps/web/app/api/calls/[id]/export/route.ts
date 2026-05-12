import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { exportCallData } from "@/lib/calls/service";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

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
    const result = await exportCallData(createCallsRepository(), authUser.id, id);

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
      headers: {
        ...noStoreHeaders,
        "Content-Disposition": `attachment; filename="argos-call-${id}.json"`,
      },
    });
  } catch (error) {
    console.error("Failed to export call data", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}

