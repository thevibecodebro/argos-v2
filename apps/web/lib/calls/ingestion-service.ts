import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SourceAsset = {
  storagePath: string;
  publicUrl: string;
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

  const { data } = supabase.storage.from("call-recordings").getPublicUrl(storagePath);

  return {
    storagePath,
    publicUrl: data.publicUrl,
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
