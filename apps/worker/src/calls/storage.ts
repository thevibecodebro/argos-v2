import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
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

  await mkdir(dirname(input.targetPath), { recursive: true });
  await persistFile(input.targetPath, Buffer.from(await data.arrayBuffer()));

  return input.targetPath;
}
