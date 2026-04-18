import { NextResponse } from "next/server";
import { createUploadError, type UploadErrorCode, type UploadErrorPayload } from "./upload-contract";

export const UPLOAD_CALL_ERROR_CODES = {
  consentRequired: "consent_required",
  fileTooLarge: "file_too_large",
  invalidUpload: "invalid_upload",
  missingFile: "missing_file",
  processingFailed: "processing_failed",
  unsupportedFileType: "unsupported_file_type",
} as const;

export const uploadProcessingFailedMessage =
  "The call upload could not be queued for processing.";

export function uploadCallErrorJson(
  code: UploadErrorCode,
  message: string,
  status: number,
  overrides: Partial<UploadErrorPayload> = {},
) {
  return NextResponse.json(
    createUploadError(code, {
      ...overrides,
      error: message,
    }),
    { status },
  );
}
