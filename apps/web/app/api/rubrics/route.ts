import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import { parseCsvRubricImport, parseJsonRubricImport } from "@/lib/rubrics/import";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import {
  createDraftRubric,
  getActiveRubric,
  getRubricById,
  loadRubricHistory,
  validateRubricInput,
} from "@/lib/rubrics/service";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

type AdminContext =
  | { ok: true; authUserId: string; orgId: string }
  | { ok: false; response: Response };

async function requireAdminContext(): Promise<AdminContext> {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return { ok: false, response: unauthorizedJson() };
  }

  const caller = await createUsersRepository().findCurrentUserByAuthId(authUser.id);

  if (!caller?.orgId || caller.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    authUserId: authUser.id,
    orgId: caller.orgId,
  };
}

function noStoreJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      "Cache-Control": "private, no-store",
      ...(init?.headers ?? {}),
    },
  });
}

export async function GET(request: Request) {
  try {
    const admin = await requireAdminContext();
    if (!admin.ok) {
      return admin.response;
    }

    const repository = createRubricsRepository();
    const url = new URL(request.url);
    const rubricId = url.searchParams.get("rubricId");

    if (rubricId) {
      return fromServiceResult(await getRubricById(repository, admin.orgId, rubricId));
    }

    const [activeResult, history] = await Promise.all([
      getActiveRubric(repository, admin.orgId),
      loadRubricHistory(repository, admin.orgId),
    ]);

    if (!activeResult.ok && activeResult.status !== 404) {
      return fromServiceResult(activeResult);
    }

    return noStoreJson({
      activeRubric: activeResult.ok ? activeResult.data : null,
      history,
    });
  } catch (error) {
    console.error("Failed to load rubrics", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdminContext();
    if (!admin.ok) {
      return admin.response;
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const repository = createRubricsRepository();
    const preview = body.preview === true;
    const sourceType = body.sourceType;

    if (preview) {
      if (sourceType !== "csv_import" && sourceType !== "json_import") {
        return NextResponse.json(
          { error: "sourceType must be csv_import or json_import for previews" },
          { status: 400 },
        );
      }

      const content = typeof body.content === "string" ? body.content : "";
      const fileName = typeof body.fileName === "string" ? body.fileName : "Imported rubric";

      if (!content.trim()) {
        return NextResponse.json({ error: "content is required for import previews" }, { status: 400 });
      }

      const result =
        sourceType === "csv_import"
          ? parseCsvRubricImport(content, fileName)
          : parseJsonRubricImport(content, fileName);

      return noStoreJson(result);
    }

    if (sourceType !== "manual" && sourceType !== "csv_import" && sourceType !== "json_import") {
      return NextResponse.json(
        { error: "sourceType must be manual, csv_import, or json_import" },
        { status: 400 },
      );
    }

    const validation = validateRubricInput(body.rubric);
    if (!validation.ok) {
      return fromServiceResult(validation);
    }

    const draft = await createDraftRubric(repository, {
      orgId: admin.orgId,
      createdBy: admin.authUserId,
      sourceType,
      rubric: validation.data,
    });

    return noStoreJson(draft);
  } catch (error) {
    console.error("Failed to create rubric draft", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
