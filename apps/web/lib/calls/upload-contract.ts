export const CALL_UPLOAD_MAX_BYTES = 500 * 1024 * 1024;

export const CALL_UPLOAD_ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "audio/mp3",
] as const;

export const CALL_UPLOAD_ACCEPTED_EXTENSIONS = [
  ".m4a",
  ".mp3",
  ".mp4",
  ".wav",
  ".webm",
] as const;

export const UPLOAD_ERROR_CODES = [
  "consent_required",
  "file_too_large",
  "interrupted_upload",
  "invalid_upload",
  "missing_file",
  "processing_failed",
  "unsupported_file_type",
  "upload_canceled",
] as const;

export type UploadErrorCode =
  (typeof UPLOAD_ERROR_CODES)[number];

export type UploadErrorPayload = {
  code: UploadErrorCode;
  error: string;
  retryable?: boolean;
  action?: string;
  details?: Record<string, string | number | boolean | string[] | null | undefined>;
};

export type UploadSuccessPayload = {
  id: string;
  status: string;
  createdAt: string;
};

type UploadFileLike = {
  name: string;
  size: number;
  type: string;
};

export function formatUploadLimit(bytes: number) {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function isAcceptedUploadFile(file: UploadFileLike) {
  if (CALL_UPLOAD_ACCEPTED_TYPES.includes(file.type as (typeof CALL_UPLOAD_ACCEPTED_TYPES)[number])) {
    return true;
  }

  const normalizedName = file.name.toLowerCase();
  return CALL_UPLOAD_ACCEPTED_EXTENSIONS.some((extension) => normalizedName.endsWith(extension));
}

export function validateUploadFile(file: UploadFileLike): UploadErrorPayload | null {
  if (!isAcceptedUploadFile(file)) {
    return {
      code: "unsupported_file_type",
      error: "This recording format is not supported.",
      retryable: true,
      action: "Use MP3, WAV, M4A, MP4, or WebM and try again.",
      details: {
        allowedTypes: [...CALL_UPLOAD_ACCEPTED_TYPES],
      },
    };
  }

  if (file.size > CALL_UPLOAD_MAX_BYTES) {
    return {
      code: "file_too_large",
      error: `This file is larger than the ${formatUploadLimit(CALL_UPLOAD_MAX_BYTES)} limit.`,
      retryable: true,
      action: "Trim the recording or choose a smaller file, then retry the upload.",
      details: {
        maxBytes: CALL_UPLOAD_MAX_BYTES,
      },
    };
  }

  return null;
}

export function createUploadError(
  code: UploadErrorCode,
  overrides: Partial<UploadErrorPayload> = {},
): UploadErrorPayload {
  const defaults: Record<UploadErrorCode, UploadErrorPayload> = {
    missing_file: {
      code: "missing_file",
      error: "No recording was attached to the upload request.",
      retryable: true,
      action: "Choose a recording file and try again.",
    },
    unsupported_file_type: {
      code: "unsupported_file_type",
      error: "This recording format is not supported.",
      retryable: true,
      action: "Use MP3, WAV, M4A, MP4, or WebM and try again.",
    },
    file_too_large: {
      code: "file_too_large",
      error: `This file is larger than the ${formatUploadLimit(CALL_UPLOAD_MAX_BYTES)} limit.`,
      retryable: true,
      action: "Trim the recording or choose a smaller file, then retry the upload.",
      details: { maxBytes: CALL_UPLOAD_MAX_BYTES },
    },
    consent_required: {
      code: "consent_required",
      error: "Recording consent must be confirmed before uploading.",
      retryable: true,
      action: "Confirm consent, then retry the upload.",
    },
    invalid_upload: {
      code: "invalid_upload",
      error: "The upload request could not be read.",
      retryable: true,
      action: "Refresh the page and try the upload again.",
    },
    interrupted_upload: {
      code: "interrupted_upload",
      error: "The upload was interrupted before it finished.",
      retryable: true,
      action: "Check your connection and retry the upload.",
    },
    upload_canceled: {
      code: "upload_canceled",
      error: "The upload was canceled.",
      retryable: true,
      action: "Retry the upload when you're ready.",
    },
    processing_failed: {
      code: "processing_failed",
      error: "The recording uploaded, but Argos could not finish analyzing it.",
      retryable: true,
      action: "Retry the upload. If it keeps failing, try a smaller recording.",
    },
  };

  return {
    ...defaults[code],
    ...overrides,
    details: {
      ...defaults[code].details,
      ...overrides.details,
    },
  };
}

export function normalizeUploadErrorPayload(
  payload: Partial<UploadErrorPayload> | null | undefined,
): UploadErrorPayload {
  if (payload?.code && isUploadErrorCode(payload.code)) {
    return createUploadError(payload.code, payload);
  }

  return createUploadError("invalid_upload", {
    error: payload?.error ?? "The upload request failed.",
  });
}

function isUploadErrorCode(value: string): value is UploadErrorCode {
  return (UPLOAD_ERROR_CODES as readonly string[]).includes(value);
}
