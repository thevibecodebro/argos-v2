import {
  createUploadError,
  normalizeUploadErrorPayload,
  validateUploadFile,
  type UploadErrorPayload,
  type UploadSuccessPayload,
} from "./upload-contract";

export type UploadPhase = "processing" | "uploading";

export type UploadRequest = {
  cancel: () => void;
  promise: Promise<UploadSuccessPayload>;
};

type UploadCallRequestInput = {
  callTopic?: string;
  consentConfirmed: boolean;
  file: File;
  onPhaseChange?: (phase: UploadPhase) => void;
  onUploadProgress?: (percent: number) => void;
};

export class UploadRequestError extends Error {
  code: UploadErrorPayload["code"];
  action?: string;
  details?: UploadErrorPayload["details"];
  retryable?: boolean;

  constructor(payload: UploadErrorPayload) {
    super(payload.error);
    this.name = "UploadRequestError";
    this.code = payload.code;
    this.action = payload.action;
    this.details = payload.details;
    this.retryable = payload.retryable;
  }
}

export function uploadCallWithProgress(input: UploadCallRequestInput): UploadRequest {
  const validationError = validateUploadFile(input.file);

  if (validationError) {
    return {
      cancel: () => undefined,
      promise: Promise.reject(new UploadRequestError(validationError)),
    };
  }

  if (!input.consentConfirmed) {
    return {
      cancel: () => undefined,
      promise: Promise.reject(new UploadRequestError(createUploadError("consent_required"))),
    };
  }

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/calls/upload");
  xhr.responseType = "json";

  const form = new FormData();
  form.append("recording", input.file);
  form.append("consentConfirmed", "true");

  if (input.callTopic?.trim()) {
    form.append("callTopic", input.callTopic.trim());
  }

  const promise = new Promise<UploadSuccessPayload>((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      input.onPhaseChange?.("uploading");
      input.onUploadProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };

    xhr.upload.onload = () => {
      input.onUploadProgress?.(100);
      input.onPhaseChange?.("processing");
    };

    xhr.onerror = () => {
      reject(new UploadRequestError(createUploadError("interrupted_upload")));
    };

    xhr.onabort = () => {
      reject(new UploadRequestError(createUploadError("upload_canceled")));
    };

    xhr.onload = () => {
      const payload = parseUploadResponse(xhr);

      if (xhr.status >= 200 && xhr.status < 300 && payload && "id" in payload && typeof payload.id === "string") {
        resolve(payload as UploadSuccessPayload);
        return;
      }

      reject(new UploadRequestError(normalizeUploadErrorPayload(payload)));
    };

    xhr.send(form);
  });

  return {
    cancel: () => xhr.abort(),
    promise,
  };
}

function parseUploadResponse(xhr: XMLHttpRequest): Partial<UploadSuccessPayload & UploadErrorPayload> | null {
  if (xhr.response && typeof xhr.response === "object") {
    return xhr.response as Partial<UploadSuccessPayload & UploadErrorPayload>;
  }

  if (!xhr.responseText) {
    return null;
  }

  try {
    return JSON.parse(xhr.responseText) as Partial<UploadSuccessPayload & UploadErrorPayload>;
  } catch {
    return { error: xhr.responseText };
  }
}
