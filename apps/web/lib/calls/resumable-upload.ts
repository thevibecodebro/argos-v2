import { Upload, type UploadOptions } from "tus-js-client";
import { getBrowserWebEnv } from "@/lib/env";

const TUS_CHUNK_SIZE_BYTES = 6 * 1024 * 1024;

type ResumableUploadInput = {
  file: File;
  onProgress: (progress: number) => void;
  path: string;
  token: string;
};

type TusUpload = {
  start: () => void;
};

type ResumableUploadDependencies = {
  createUpload?: (file: File, options: UploadOptions) => TusUpload;
  supabaseUrl?: string;
};

export function buildResumableUploadEndpoint(supabaseUrl: string) {
  const url = new URL(supabaseUrl);

  if (url.hostname.endsWith(".supabase.co") && !url.hostname.endsWith(".storage.supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }

  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export function uploadToSignedResumableUrl(
  input: ResumableUploadInput,
  dependencies: ResumableUploadDependencies = {},
) {
  const supabaseUrl = dependencies.supabaseUrl ?? getBrowserWebEnv().supabaseUrl;
  const createUpload =
    dependencies.createUpload
    ?? ((file: File, options: UploadOptions) => new Upload(file, options));

  return new Promise<void>((resolve, reject) => {
    const upload = createUpload(input.file, {
      chunkSize: TUS_CHUNK_SIZE_BYTES,
      endpoint: buildResumableUploadEndpoint(supabaseUrl),
      headers: {
        "x-signature": input.token,
      },
      metadata: {
        bucketName: "call-recordings",
        cacheControl: "3600",
        contentType: input.file.type || "application/octet-stream",
        objectName: input.path,
      },
      onError: (error) => reject(error),
      onProgress: (bytesUploaded, bytesTotal) => {
        const progress = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
        input.onProgress(progress);
      },
      onSuccess: () => resolve(),
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 3_000, 5_000, 10_000, 20_000],
      storeFingerprintForResuming: false,
      uploadDataDuringCreation: true,
    });

    upload.start();
  });
}
