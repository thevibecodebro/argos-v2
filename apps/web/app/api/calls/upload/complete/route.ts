import { requireAuthenticatedManagedCapability } from "@/lib/access/managed-capabilities-server";
import { consumeManualCallUploadTarget, getManualCallUploadTargetStatus } from "@/lib/calls/ingestion-service";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { completeUploadedCall, findCompletedManualUpload } from "@/lib/calls/service";
import {
  validateUploadFile,
  type UploadErrorPayload,
} from "@/lib/calls/upload-contract";
import {
  UPLOAD_CALL_ERROR_CODES,
  uploadCallErrorJson,
} from "@/lib/calls/upload-errors";
import {
  checkRateLimitForPolicy,
  rateLimitExceededResponse,
} from "@/lib/rate-limit/service";
import { createEffectiveTenantRepository } from "@/lib/platform/effective-request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CompleteUploadBody = {
  orgId?: string;
  callTopic?: string | null;
  consentConfirmed?: boolean;
  contentType?: string | null;
  fileName?: string;
  fileSizeBytes?: number;
  storagePath?: string;
};

export async function POST(request: Request) {
  try {
    const capabilityAccess = await requireAuthenticatedManagedCapability("call_upload");
    if (!capabilityAccess.ok) return capabilityAccess.response;
    const authUser = capabilityAccess.user;

    const rateLimit = await checkRateLimitForPolicy("uploadComplete", {
      type: "user",
      id: authUser.id,
    });

    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
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

    if (body.orgId !== undefined && body.orgId !== capabilityAccess.orgId) {
      return uploadCallErrorJson(UPLOAD_CALL_ERROR_CODES.invalidUpload,
        "Return to the original workspace before retrying this upload.", 400);
    }

    const repository = await createEffectiveTenantRepository(createCallsRepository(), authUser.id);
    const existing = await findCompletedManualUpload(repository, authUser.id, body.storagePath, capabilityAccess.orgId);
    if (existing) {
      return Response.json(existing.ok ? existing.data : { code: existing.code, error: existing.error }, {
        status: existing.ok ? 200 : existing.status,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    const targetStatus = await getManualCallUploadTargetStatus({ authUserId: authUser.id, orgId: capabilityAccess.orgId, storagePath: body.storagePath });
    // Expired metadata may already have been pruned by prepare. Renew a missing
    // target only when the browser retained and supplied its original workspace.
    if (targetStatus === "expired" || (targetStatus === "missing" && body.orgId === capabilityAccess.orgId)) {
      return uploadCallErrorJson("upload_target_expired", "This upload target has expired. Retry to start a new upload in this workspace.", 400, { details: { orgId: capabilityAccess.orgId } });
    }
    if (targetStatus !== "valid") {
      return uploadCallErrorJson(UPLOAD_CALL_ERROR_CODES.invalidUpload,
        "This upload target is unavailable in this workspace. Return to its original workspace to retry.", 400);
    }

    const bucket = createSupabaseAdminClient().storage.from("call-recordings");
    const storageVerification = await verifyUploadedRecordingObject(bucket, {
      storagePath: body.storagePath,
      expectedContentType: body.contentType ?? null,
      expectedSizeBytes: body.fileSizeBytes,
    });

    if (storageVerification) {
      return storageVerification;
    }

    const result = await completeUploadedCall(repository, authUser.id, {
      callTopic: typeof body.callTopic === "string" ? body.callTopic : null,
      fileName: body.fileName,
      fileSizeBytes: body.fileSizeBytes,
      sourceAsset: {
        storageBucket: "call-recordings",
        storagePath: body.storagePath,
        contentType: body.contentType ?? null,
        fileSizeBytes: body.fileSizeBytes,
      },
    }, {
      callUploadCapability: {
        authUserId: authUser.id,
        orgId: capabilityAccess.orgId,
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

    await consumeManualCallUploadTarget({
      authUserId: authUser.id,
      storagePath: body.storagePath,
    });

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

async function verifyUploadedRecordingObject(
  bucket: {
    info: (path: string) => Promise<{
      data: { size?: number | null; contentType?: string | null } | null;
      error: { message?: string } | null;
    }>;
  },
  input: {
    storagePath: string;
    expectedContentType: string | null;
    expectedSizeBytes: number;
  },
) {
  const { data, error } = await bucket.info(input.storagePath);

  if (error || !data) {
    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.invalidUpload,
      "The uploaded recording could not be verified.",
      400,
      {
        details: {
          reason: error?.message ?? "Storage object not found",
        },
      },
    );
  }

  const details: Record<string, string | number> = {};

  if (typeof data.size !== "number") {
    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.invalidUpload,
      "The uploaded recording could not be verified.",
      400,
      {
        details: {
          reason: "Storage object size metadata is missing",
        },
      },
    );
  }

  if (data.size !== input.expectedSizeBytes) {
    details.expectedSizeBytes = input.expectedSizeBytes;
    details.actualSizeBytes = data.size;
  }

  const actualContentType = normalizeContentType(data.contentType ?? null);
  const expectedContentType = normalizeContentType(input.expectedContentType);

  if (!actualContentType) {
    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.invalidUpload,
      "The uploaded recording could not be verified.",
      400,
      {
        details: {
          reason: "Storage object content type metadata is missing",
        },
      },
    );
  }

  if (
    actualContentType &&
    expectedContentType &&
    actualContentType !== expectedContentType
  ) {
    details.expectedContentType = expectedContentType;
    details.actualContentType = actualContentType;
  }

  if (Object.keys(details).length > 0) {
    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.invalidUpload,
      "The uploaded recording could not be verified.",
      400,
      { details },
    );
  }

  return null;
}

function normalizeContentType(contentType: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() || null;
}
