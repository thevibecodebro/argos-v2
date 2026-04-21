import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createManualCallUploadTarget } from "@/lib/calls/ingestion-service";
import {
  validateUploadFile,
  type UploadErrorPayload,
} from "@/lib/calls/upload-contract";
import {
  UPLOAD_CALL_ERROR_CODES,
  uploadCallErrorJson,
} from "@/lib/calls/upload-errors";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

type PrepareUploadBody = {
  contentType?: string | null;
  fileName?: string;
  fileSizeBytes?: number;
};

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const body = (await request.json().catch(() => null)) as PrepareUploadBody | null;

    if (
      !body ||
      typeof body.fileName !== "string" ||
      typeof body.fileSizeBytes !== "number" ||
      !Number.isFinite(body.fileSizeBytes)
    ) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.invalidUpload,
        "The upload request could not be read.",
        400,
      );
    }

    const validation = validateUploadFile({
      name: body.fileName,
      size: body.fileSizeBytes,
      type: body.contentType ?? "",
    });

    if (validation) {
      return Response.json(validation, {
        status: getUploadErrorStatus(validation),
      });
    }

    const target = await createManualCallUploadTarget({
      authUserId: authUser.id,
      fileName: body.fileName,
    });

    return Response.json(
      {
        path: target.storagePath,
        token: target.token,
      },
      {
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  } catch (error) {
    console.error("Failed to prepare call upload", error);

    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.processingFailed,
      "The call upload could not be initialized.",
      500,
      {
        action: "Retry the upload. If it keeps failing, contact support.",
        details: {
          reason: error instanceof Error ? error.message : "Internal server error",
        },
      },
    );
  }
}

function getUploadErrorStatus(payload: UploadErrorPayload) {
  switch (payload.code) {
    case "file_too_large":
      return 413;
    case "unsupported_file_type":
      return 415;
    default:
      return 400;
  }
}
