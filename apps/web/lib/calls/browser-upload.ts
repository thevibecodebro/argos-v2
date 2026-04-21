import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  createUploadError,
  normalizeUploadErrorPayload,
  type UploadSuccessPayload,
} from "./upload-contract";

type SignedUploadPayload = {
  path: string;
  token: string;
};

type BrowserUploadDependencies = {
  fetchImpl?: typeof fetch;
  onProgress?: (progress: number) => void;
  supabase?: Pick<ReturnType<typeof createSupabaseBrowserClient>, "storage">;
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
  const supabase = dependencies.supabase ?? createSupabaseBrowserClient();

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
  const uploadResult = await supabase.storage
    .from("call-recordings")
    .uploadToSignedUrl(preparePayload.path, preparePayload.token, input.file, {
      contentType: input.file.type || "application/octet-stream",
    });

  if (uploadResult.error) {
    throw new Error(`Failed to upload recording: ${uploadResult.error.message}`);
  }

  dependencies.onProgress?.(85);
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
