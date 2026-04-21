import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { completeUploadedCall } from "@/lib/calls/service";
import {
  validateUploadFile,
  type UploadErrorPayload,
} from "@/lib/calls/upload-contract";
import {
  UPLOAD_CALL_ERROR_CODES,
  uploadCallErrorJson,
} from "@/lib/calls/upload-errors";
import { unauthorizedJson } from "@/lib/http";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CompleteUploadBody = {
  callTopic?: string | null;
  consentConfirmed?: boolean;
  contentType?: string | null;
  fileName?: string;
  fileSizeBytes?: number;
  storagePath?: string;
};

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const body = (await request.json().catch(() => null)) as CompleteUploadBody | null;

    if (
      !body ||
      typeof body.fileName !== "string" ||
      typeof body.fileSizeBytes !== "number" ||
      !Number.isFinite(body.fileSizeBytes) ||
      typeof body.storagePath !== "string"
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

    if (!body.consentConfirmed) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.consentRequired,
        "Confirm call consent before uploading the recording.",
        400,
      );
    }

    if (!isScopedManualUploadPath(body.storagePath, authUser.id, body.fileName)) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.invalidUpload,
        "The uploaded recording could not be verified.",
        400,
      );
    }

    const bucket = createSupabaseAdminClient().storage.from("call-recordings");
    const { data } = bucket.getPublicUrl(body.storagePath);
    const result = await completeUploadedCall(createCallsRepository(), authUser.id, {
      callTopic: typeof body.callTopic === "string" ? body.callTopic : null,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      sourceAsset: {
        storagePath: body.storagePath,
        publicUrl: data.publicUrl,
        contentType: body.contentType ?? null,
      },
    });

    if (!result.ok) {
      return Response.json(
        {
          code: result.code,
          error: result.error,
        },
        { status: result.status },
      );
    }

    return Response.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Failed to complete call upload", error);

    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.processingFailed,
      "The call upload could not be queued for processing.",
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

function isScopedManualUploadPath(
  storagePath: string,
  authUserId: string,
  fileName: string,
) {
  const prefix = `recordings/manual-uploads/${authUserId}/`;
  return storagePath.startsWith(prefix) && storagePath.endsWith(`/${fileName}`);
}
