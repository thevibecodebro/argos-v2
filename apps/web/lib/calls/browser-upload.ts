import {
  createUploadError,
  normalizeUploadErrorPayload,
  type UploadSuccessPayload,
} from "./upload-contract";
import { uploadToAuthenticatedResumableUrl } from "./resumable-upload";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type UploadTargetPayload = {
  orgId?: string;
  path: string;
};

type BrowserUploadDependencies = {
  fetchImpl?: typeof fetch;
  getAccessToken?: () => Promise<string | null>;
  onProgress?: (progress: number) => void;
  uploadResumable?: typeof uploadToAuthenticatedResumableUrl;
};

type BrowserUploadInput = {
  callTopic?: string;
  file: File;
};

// Queue retries reuse the same File object. Keep the prepared target even when
// completion's response is lost; a new target would bypass source deduplication.
const uploadAttempts = new WeakMap<File, { path: string | null; orgId?: string; uploaded: boolean }>();

export async function uploadCallFromBrowser(
  input: BrowserUploadInput,
  dependencies: BrowserUploadDependencies = {},
): Promise<UploadSuccessPayload> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const getAccessToken = dependencies.getAccessToken ?? getCurrentAccessToken;
  const uploadResumable = dependencies.uploadResumable ?? uploadToAuthenticatedResumableUrl;

  dependencies.onProgress?.(15);
  let attempt = uploadAttempts.get(input.file);
  if (!attempt?.path) {
    const prepareResponse = await fetchImpl("/api/calls/upload/prepare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orgId: attempt?.orgId,
        fileName: input.file.name,
        fileSizeBytes: input.file.size,
        contentType: input.file.type || null,
      }),
    });
    const preparePayload = await readResponsePayload(prepareResponse);

    if (!prepareResponse.ok || !isUploadTargetPayload(preparePayload)) {
      throw new Error(
        normalizeUploadFailure(
          preparePayload,
          "The call upload could not be initialized.",
        ).error,
      );
    }

    attempt = { path: preparePayload.path, orgId: preparePayload.orgId ?? attempt?.orgId, uploaded: false };
    uploadAttempts.set(input.file, attempt);
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error("Your session expired. Sign in again and retry the upload.");
  }

  dependencies.onProgress?.(35);
  try {
    if (!attempt.uploaded) {
      await uploadResumable({
        file: input.file,
        getAccessToken,
        onProgress: (progress) => {
          dependencies.onProgress?.(35 + Math.round(progress / 2));
        },
        path: attempt.path!,
      });
      attempt.uploaded = true;
    }
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
      orgId: attempt.orgId,
      callTopic: input.callTopic?.trim() || null,
      consentConfirmed: true,
      contentType: input.file.type || null,
      fileName: input.file.name,
      fileSizeBytes: input.file.size,
      storagePath: attempt.path,
    }),
  });
  const completePayload = await readResponsePayload(completeResponse);

  if (!completeResponse.ok || !isUploadSuccessPayload(completePayload)) {
    if (completeResponse.status === 400 && completePayload && typeof completePayload === "object"
      && (completePayload as { code?: string }).code === "upload_target_expired") {
      // Preserve the original workspace when renewing a definitively expired
      // target. Ambiguous failures and workspace mismatches keep the old path.
      const expiryOrgId = (completePayload as { details?: { orgId?: unknown } }).details?.orgId;
      const orgId = attempt.orgId ?? (typeof expiryOrgId === "string" ? expiryOrgId : undefined);
      if (orgId) uploadAttempts.set(input.file, { path: null, orgId, uploaded: false });
    }

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

async function getCurrentAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error("Your session could not be verified. Sign in again and retry the upload.");
  }

  return session?.access_token ?? null;
}

function isUploadTargetPayload(payload: unknown): payload is UploadTargetPayload {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof (payload as UploadTargetPayload).path === "string",
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
