import {
  createUploadError,
  normalizeUploadErrorPayload,
  type UploadSuccessPayload,
} from "./upload-contract";
import { uploadToSignedResumableUrl } from "./resumable-upload";

type SignedUploadPayload = {
  path: string;
  token: string;
};

type BrowserUploadDependencies = {
  fetchImpl?: typeof fetch;
  onProgress?: (progress: number) => void;
  uploadResumable?: typeof uploadToSignedResumableUrl;
};

type BrowserUploadInput = {
  callTopic?: string;
  file: File;
};

export async function uploadCallFromBrowser(
  input: BrowserUploadInput,
  dependencies: BrowserUploadDependencies = {},
): Promise<UploadSuccessPayload> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const uploadResumable = dependencies.uploadResumable ?? uploadToSignedResumableUrl;

  dependencies.onProgress?.(15);
  const prepareResponse = await fetchImpl("/api/calls/upload/prepare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: input.file.name,
      fileSizeBytes: input.file.size,
      contentType: input.file.type || null,
    }),
  });
  const preparePayload = await readResponsePayload(prepareResponse);

  if (!prepareResponse.ok || !isSignedUploadPayload(preparePayload)) {
    throw new Error(
      normalizeUploadFailure(
        preparePayload,
        "The call upload could not be initialized.",
      ).error,
    );
  }

  dependencies.onProgress?.(35);
  try {
    await uploadResumable({
      file: input.file,
      onProgress: (progress) => {
        dependencies.onProgress?.(35 + Math.round(progress / 2));
      },
      path: preparePayload.path,
      token: preparePayload.token,
    });
  } catch (error) {
    throw new Error(
      `Failed to upload recording: ${error instanceof Error ? error.message : "Upload failed"}`,
    );
  }

  const completeResponse = await fetchImpl("/api/calls/upload/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callTopic: input.callTopic?.trim() || null,
      consentConfirmed: true,
      contentType: input.file.type || null,
      fileName: input.file.name,
      fileSizeBytes: input.file.size,
      storagePath: preparePayload.path,
    }),
  });
  const completePayload = await readResponsePayload(completeResponse);

  if (!completeResponse.ok || !isUploadSuccessPayload(completePayload)) {
    throw new Error(
      normalizeUploadFailure(
        completePayload,
        "The call upload could not be completed.",
      ).error,
    );
  }

  dependencies.onProgress?.(100);
  return completePayload;
}

async function readResponsePayload(
  response: Pick<Response, "text">,
): Promise<unknown | null> {
  const raw = await response.text().catch(() => "");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {
      error: raw,
    };
  }
}

function normalizeUploadFailure(payload: unknown, fallbackError: string) {
  if (payload && typeof payload === "object") {
    return normalizeUploadErrorPayload(payload as Record<string, unknown>);
  }

  return createUploadError("invalid_upload", {
    error: fallbackError,
  });
}

function isSignedUploadPayload(payload: unknown): payload is SignedUploadPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof (payload as SignedUploadPayload).path === "string" &&
      typeof (payload as SignedUploadPayload).token === "string",
  );
}

function isUploadSuccessPayload(payload: unknown): payload is UploadSuccessPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof (payload as UploadSuccessPayload).id === "string" &&
      typeof (payload as UploadSuccessPayload).status === "string" &&
      typeof (payload as UploadSuccessPayload).createdAt === "string",
  );
}
