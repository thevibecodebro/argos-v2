import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { assertSafeStorageFileName, readBlobArrayBufferWithLimit } from "@argos-v2/call-processing";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getWorkerEnv, type WorkerEnv } from "../env";

type StorageClient = Pick<SupabaseClient, "storage">;

type DownloadSourceAssetInput = {
  storagePath: string;
  bucket?: string;
  targetPath: string;
};

type DownloadSourceAssetDependencies = {
  env?: WorkerEnv;
  supabase?: StorageClient;
  writeFile?: typeof writeFile;
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
  const persistFile = dependencies.writeFile ?? writeFile;
  const { data, error } = await supabase.storage
    .from(input.bucket ?? "call-recordings")
    .download(input.storagePath);

  if (error || !data) {
    throw new Error(`Failed to download source asset: ${error?.message ?? "missing blob"}`);
  }

  const bytes = Buffer.from(await readBlobArrayBufferWithLimit(data, env.maxSourceBytes));

  await mkdir(dirname(input.targetPath), { recursive: true });
  await persistFile(input.targetPath, bytes);

  return input.targetPath;
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
