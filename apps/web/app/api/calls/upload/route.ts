import { getAuthenticatedSupabaseUser } from "@/lib/auth/get-authenticated-user";
import { createCallsRepository } from "@/lib/calls/create-repository";
import { uploadCall } from "@/lib/calls/service";
import { fromServiceResult, unauthorizedJson } from "@/lib/http";

export const dynamic = "force-dynamic";

const ALLOWED_FILE_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "audio/mp3",
]);

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedSupabaseUser();

    if (!authUser) {
      return unauthorizedJson();
    }

    const formData = await request.formData();
    const recording = formData.get("recording");
    const consentConfirmed = formData.get("consentConfirmed");
    const callTopic = formData.get("callTopic");

    if (!(recording instanceof File)) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_FILE_TYPES.has(recording.type)) {
      return Response.json({ error: `File type not allowed: ${recording.type}` }, { status: 400 });
    }

    if (recording.size > 500 * 1024 * 1024) {
      return Response.json({ error: "File exceeds 500 MB limit" }, { status: 400 });
    }

    if (consentConfirmed !== "true") {
      return Response.json({ error: "Call consent must be confirmed before upload" }, { status: 400 });
    }

    const result = await uploadCall(createCallsRepository(), authUser.id, {
      callTopic: typeof callTopic === "string" ? callTopic : null,
      fileName: recording.name,
      fileSizeBytes: recording.size,
    });

    return fromServiceResult(result);
  } catch (error) {
    console.error("Failed to upload call", error);

    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
