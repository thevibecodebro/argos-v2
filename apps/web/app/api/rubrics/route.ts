import { NextResponse } from "next/server";
import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";
import {
  RUBRIC_IMPORT_LIMITS,
  parseCsvRubricImport,
  parseJsonRubricImport,
} from "@/lib/rubrics/import";
import { createRubricsRepository } from "@/lib/rubrics/create-repository";
import {
  createDraftRubric,
  getActiveRubric,
  getRubricById,
  loadRubricHistory,
  validateRubricInput,
} from "@/lib/rubrics/service";
import { createEffectiveTenantUsersRepository } from "@/lib/platform/effective-request";
import { createUsersRepository } from "@/lib/users/create-repository";

export const dynamic = "force-dynamic";

const MAX_RUBRIC_POST_BODY_BYTES = RUBRIC_IMPORT_LIMITS.maxContentBytes + 64 * 1024;

type AdminContext =
  | { ok: true; authUserId: string; orgId: string }
  | { ok: false; response: Response };

type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; response: Response };

async function requireAdminContext(): Promise<AdminContext> {
  const authUser = await getAuthenticatedSupabaseUser();

  if (!authUser) {
    return { ok: false, response: unauthorizedJson() };
  }

  const usersRepository = await createEffectiveTenantUsersRepository(
    createUsersRepository(),
    authUser.id,
  );
  const caller = await usersRepository.findCurrentUserByAuthId(authUser.id);

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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getUtf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function requestBodyTooLargeJson() {
  return NextResponse.json({ error: "Rubric request body is too large" }, { status: 413 });
}

function importPreviewTooLargeJson() {
  return NextResponse.json({ error: "Rubric import preview is too large" }, { status: 413 });
}

async function readBoundedJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bodyBytes = Number(contentLength);
    if (Number.isFinite(bodyBytes) && bodyBytes > MAX_RUBRIC_POST_BODY_BYTES) {
      return { ok: false, response: requestBodyTooLargeJson() };
    }
  }

  if (!request.body) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_RUBRIC_POST_BODY_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, response: requestBodyTooLargeJson() };
    }

    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, body: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    };
  }
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

    const parsed = await readBoundedJsonBody(request);
    if (!parsed.ok) {
      return parsed.response;
    }

    const parsedBody = parsed.body;

    if (!isObjectRecord(parsedBody)) {
      return NextResponse.json({ error: "JSON body must be an object" }, { status: 400 });
    }

    const body = parsedBody;

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

      if (getUtf8ByteLength(content) > RUBRIC_IMPORT_LIMITS.maxContentBytes) {
        return importPreviewTooLargeJson();
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
