import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import {
  CALL_UPLOAD_ACCEPTED_TYPES,
  CALL_UPLOAD_MAX_BYTES,
  isAcceptedUploadFile,
} from "@/lib/calls/upload-contract";
import { uploadCallErrorJson, UPLOAD_CALL_ERROR_CODES } from "@/lib/calls/upload-errors";
import { uploadCall } from "@/lib/calls/service";
import { unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.invalidUpload,
        "The upload request could not be read.",
        400,
      );
    }

    const recording = formData.get("recording");
    const consentConfirmed = formData.get("consentConfirmed");
    const callTopic = formData.get("callTopic");

    if (!(recording instanceof File)) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.missingFile,
        "Upload a call recording before submitting the form.",
        400,
      );
    }

    if (!isAcceptedUploadFile(recording)) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.unsupportedFileType,
        "This recording format is not supported.",
        415,
        {
          action: "Use MP3, WAV, M4A, MP4, or WebM and try again.",
          details: {
            allowedTypes: [...CALL_UPLOAD_ACCEPTED_TYPES],
            receivedType: recording.type || null,
          },
        },
      );
    }

    if (recording.size > CALL_UPLOAD_MAX_BYTES) {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.fileTooLarge,
        "Call recordings must be 500 MB or smaller.",
        413,
        {
          details: {
            maxBytes: CALL_UPLOAD_MAX_BYTES,
            fileSizeBytes: recording.size,
          },
        },
      );
    }

    if (consentConfirmed !== "true") {
      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.consentRequired,
        "Confirm call consent before uploading the recording.",
        400,
      );
    }

    try {
      const result = await uploadCall(createCallsRepository(), authUser.id, {
        callTopic: typeof callTopic === "string" ? callTopic : null,
        fileName: recording.name,
        fileSizeBytes: recording.size,
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
      console.error("Failed to upload call", error);

      return uploadCallErrorJson(
        UPLOAD_CALL_ERROR_CODES.processingFailed,
        "The call uploaded, but Argos could not finish analyzing it.",
        500,
        {
          action: "Retry the upload. If it keeps failing, try a smaller recording.",
          details: {
            reason: error instanceof Error ? error.message : "Internal server error",
          },
        },
      );
    }
  } catch (error) {
    console.error("Failed to upload call", error);

    return uploadCallErrorJson(
      UPLOAD_CALL_ERROR_CODES.processingFailed,
      "The call upload could not be completed.",
      500,
      {
        details: {
          reason: error instanceof Error ? error.message : "Internal server error",
        },
      },
    );
  }
}
