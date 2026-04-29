import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SourceAsset = {
  storageBucket: "call-recordings";
  storagePath: string;
  contentType: string | null;
  fileSizeBytes: number;
};

export type ManualCallUploadTarget = Pick<SourceAsset, "storageBucket" | "storagePath"> & {
  token: string;
};

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
  supabase?: ReturnType<typeof createSupabaseAdminClient>;
};

export async function storeCallSourceAsset(
  input: CallSourceInput,
  dependencies: StoreCallSourceDependencies = {},
): Promise<SourceAsset> {
  const supabase = dependencies.supabase ?? createSupabaseAdminClient();
  const storagePath = `recordings/${input.callId}/source/${input.fileName}`;

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
  },
  dependencies: CreateManualCallUploadTargetDependencies = {},
): Promise<ManualCallUploadTarget> {
  const supabase = dependencies.supabase ?? createSupabaseAdminClient();
  const createId = dependencies.createId ?? randomUUID;
  const storagePath = `recordings/manual-uploads/${input.authUserId}/${createId()}/${input.fileName}`;
  const bucket = supabase.storage.from("call-recordings");
  const { data, error } = await bucket.createSignedUploadUrl(storagePath, {
    upsert: true,
  });

  if (error || !data?.token) {
    throw new Error(
      `Failed to create source upload target: ${error?.message ?? "missing upload token"}`,
    );
  }

  return {
    storageBucket: "call-recordings",
    storagePath,
    token: data.token,
  };
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
