import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assertSafeStorageFileName } from "@argos-v2/call-processing";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getWorkerEnv, type WorkerEnv } from "../env";

type StorageClient = Pick<SupabaseClient, "storage">;

type DownloadSourceAssetInput = {
  storagePath: string;
  bucket?: string;
  expectedSizeBytes?: number | null;
  targetPath: string;
};

type DownloadSourceAssetDependencies = {
  createFileStream?: typeof createWriteStream;
  env?: WorkerEnv;
  fetchImpl?: typeof fetch;
  pipelineImpl?: typeof pipeline;
  supabase?: StorageClient;
};

type StoreSourceAssetInput = {
  callId: string;
  bytes: Buffer;
  contentType: string | null;
  fileName: string;
};

export async function downloadSourceAsset(
  input: DownloadSourceAssetInput,
  dependencies: DownloadSourceAssetDependencies = {},
) {
  const env = dependencies.env ?? getWorkerEnv();
  const supabaseUrl = env.supabaseUrl;
  const supabaseServiceRoleKey = env.supabaseServiceRoleKey;

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = dependencies.supabase ?? createClient(supabaseUrl, supabaseServiceRoleKey);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const bucket = supabase.storage.from(input.bucket ?? "call-recordings");
  const { data, error } = await bucket.createSignedUrl(input.storagePath, 60 * 60);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to sign source asset download: ${error?.message ?? "missing URL"}`);
  }

  if (input.expectedSizeBytes !== null && input.expectedSizeBytes !== undefined) {
    if (!Number.isSafeInteger(input.expectedSizeBytes) || input.expectedSizeBytes < 0) {
      throw new Error("Queued source asset size is invalid.");
    }

    if (input.expectedSizeBytes > env.maxSourceBytes) {
      throw new Error(`Response body exceeds ${env.maxSourceBytes} bytes`);
    }
  }

  const response = await fetchImpl(data.signedUrl);

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download source asset: HTTP ${response.status}`);
  }

  const contentLength = readContentLength(response.headers);
  if (contentLength !== null && contentLength > env.maxSourceBytes) {
    throw new Error(`Response body exceeds ${env.maxSourceBytes} bytes`);
  }

  if (
    contentLength !== null
    && input.expectedSizeBytes !== null
    && input.expectedSizeBytes !== undefined
    && contentLength !== input.expectedSizeBytes
  ) {
    throw new Error("Stored source asset changed after upload completion.");
  }

  await mkdir(dirname(input.targetPath), { recursive: true });
  const receivedBytes = await streamResponseBodyToFile(
    response,
    input.targetPath,
    env.maxSourceBytes,
    {
      createFileStream: dependencies.createFileStream,
      pipelineImpl: dependencies.pipelineImpl,
    },
  );

  if (
    input.expectedSizeBytes !== null
    && input.expectedSizeBytes !== undefined
    && receivedBytes !== input.expectedSizeBytes
  ) {
    throw new Error("Stored source asset changed after upload completion.");
  }

  return input.targetPath;
}

export async function streamResponseBodyToFile(
  response: Pick<Response, "body">,
  targetPath: string,
  maxBytes: number,
  dependencies: {
    createFileStream?: typeof createWriteStream;
    pipelineImpl?: typeof pipeline;
  } = {},
) {
  if (!response.body) {
    throw new Error("Source asset response body is missing.");
  }

  const createFileStream = dependencies.createFileStream ?? createWriteStream;
  const pipelineImpl = dependencies.pipelineImpl ?? pipeline;
  let receivedBytes = 0;
  const limitStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        callback(new Error(`Response body exceeds ${maxBytes} bytes`));
        return;
      }

      callback(null, chunk);
    },
  });

  await pipelineImpl(
    Readable.fromWeb(response.body as never),
    limitStream,
    createFileStream(targetPath),
  );

  return receivedBytes;
}

function readContentLength(headers: Headers) {
  const raw = headers.get("content-length");
  if (!raw || !/^\d+$/.test(raw)) return null;

  const parsed = Number.parseInt(raw, 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export async function storeCallSourceAsset(
  input: StoreSourceAssetInput,
  dependencies: {
    env?: WorkerEnv;
    supabase?: StorageClient;
  } = {},
) {
  const env = dependencies.env ?? getWorkerEnv();
  const supabaseUrl = env.supabaseUrl;
  const supabaseServiceRoleKey = env.supabaseServiceRoleKey;

  if (!supabaseUrl) {
    throw new Error("Missing required environment variable: SUPABASE_URL");
  }

  if (!supabaseServiceRoleKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = dependencies.supabase ?? createClient(supabaseUrl, supabaseServiceRoleKey);
  const fileName = assertSafeStorageFileName(input.fileName);
  const storagePath = `recordings/${input.callId}/source/${fileName}`;
  const { error } = await supabase.storage.from("call-recordings").upload(storagePath, input.bytes, {
    contentType: input.contentType ?? "application/octet-stream",
    upsert: true,
  });

  if (error) {
    throw new Error(`Failed to store source recording: ${error.message}`);
  }

  return {
    storageBucket: "call-recordings" as const,
    storagePath,
    contentType: input.contentType,
    fileSizeBytes: input.bytes.length,
  };
}
