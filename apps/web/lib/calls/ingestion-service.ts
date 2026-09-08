import { randomUUID } from "node:crypto";
import { assertSafeStorageFileName } from "@argos-v2/call-processing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SourceAsset = {
  storageBucket: "call-recordings";
  storagePath: string;
  contentType: string | null;
  fileSizeBytes: number;
};

export type ManualCallUploadTarget = Pick<SourceAsset, "storageBucket" | "storagePath">;

const MANUAL_UPLOAD_TARGET_TTL_MS = 24 * 60 * 60 * 1000;

type CallSourceInput = {
  callId: string;
  bytes: Buffer;
  contentType: string | null;
  fileName: string;
};

type StoreCallSourceDependencies = {
  supabase?: ReturnType<typeof createSupabaseAdminClient>;
};

type CreateManualCallUploadTargetDependencies = {
  createId?: () => string;
  now?: () => Date;
  supabase?: ReturnType<typeof createSupabaseAdminClient>;
};

export async function storeCallSourceAsset(
  input: CallSourceInput,
  dependencies: StoreCallSourceDependencies = {},
): Promise<SourceAsset> {
  const supabase = dependencies.supabase ?? createSupabaseAdminClient();
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
    storageBucket: "call-recordings",
    storagePath,
    contentType: input.contentType,
    fileSizeBytes: input.bytes.length,
  };
}

export async function createManualCallUploadTarget(
  input: {
    authUserId: string;
    fileName: string;
    orgId: string;
  },
  dependencies: CreateManualCallUploadTargetDependencies = {},
): Promise<ManualCallUploadTarget> {
  const createId = dependencies.createId ?? randomUUID;
  const now = dependencies.now?.() ?? new Date();
  const fileName = assertSafeStorageFileName(input.fileName);
  const storagePath = `recordings/manual-uploads/${input.authUserId}/${createId()}/${fileName}`;
  const supabase = dependencies.supabase ?? createSupabaseAdminClient();
  const client: any = supabase;

  await client
    .from("manual_recording_upload_targets")
    .delete()
    .lt("expires_at", now.toISOString());

  const { error } = await client
    .from("manual_recording_upload_targets")
    .insert({
      auth_user_id: input.authUserId,
      expires_at: new Date(now.getTime() + MANUAL_UPLOAD_TARGET_TTL_MS).toISOString(),
      storage_path: storagePath,
      target_org_id: input.orgId,
    });

  if (error) {
    throw new Error(`Failed to create source upload target: ${error.message}`);
  }

  return {
    storageBucket: "call-recordings",
    storagePath,
  };
}

export async function consumeManualCallUploadTarget(
  input: {
    authUserId: string;
    storagePath: string;
  },
  dependencies: StoreCallSourceDependencies = {},
) {
  const supabase = dependencies.supabase ?? createSupabaseAdminClient();
  const client: any = supabase;
  const { error } = await client
    .from("manual_recording_upload_targets")
    .delete()
    .eq("storage_path", input.storagePath)
    .eq("auth_user_id", input.authUserId);

  if (error) {
    console.error("Failed to consume manual upload target", error);
  }
}

export async function storeManualCallSource(
  input: CallSourceInput,
  dependencies: StoreCallSourceDependencies = {},
): Promise<SourceAsset> {
  return storeCallSourceAsset(input, dependencies);
}

export async function storeZoomCallSource(
  input: CallSourceInput,
  dependencies: StoreCallSourceDependencies = {},
): Promise<SourceAsset> {
  return storeCallSourceAsset(input, dependencies);
}
