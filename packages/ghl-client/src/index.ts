export const LEADCONNECTOR_BASE_URL = "https://services.leadconnectorhq.com";
export const LEADCONNECTOR_API_VERSION = "2021-07-28";
export const DEFAULT_LEADCONNECTOR_TIMEOUT_MS = 30_000;
export const LEADCONNECTOR_RECORDING_TIMEOUT_MS = 120_000;

export type LeadConnectorMessage = {
  id: string;
  conversationId: string | null;
  contactId: string | null;
  userId: string | null;
  direction: string | null;
  type: string | null;
  dateAdded: string | null;
};

export type LeadConnectorRecording = {
  bytes: Buffer;
  contentType: string | null;
  fileName: string;
};

type LeadConnectorClientInput = {
  accessToken: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
};

export class LeadConnectorApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LeadConnectorApiError";
  }
}

export function createLeadConnectorClient(input: LeadConnectorClientInput) {
  const baseUrl = input.baseUrl ?? LEADCONNECTOR_BASE_URL;
  const fetcher = input.fetcher ?? fetch;
  const timeoutMs = input.timeoutMs ?? DEFAULT_LEADCONNECTOR_TIMEOUT_MS;

  async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await request(path, options);

    if (!response.ok) {
      throw new LeadConnectorApiError(
        `LeadConnector request failed with status ${response.status}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  async function requestArrayBuffer(path: string, options: RequestOptions = {}) {
    const response = await request(path, options);

    if (!response.ok) {
      throw new LeadConnectorApiError(
        `LeadConnector request failed with status ${response.status}`,
        response.status,
      );
    }

    return {
      arrayBuffer: await response.arrayBuffer(),
      contentType: response.headers.get("content-type"),
      contentDisposition: response.headers.get("content-disposition"),
    };
  }

  async function request(path: string, options: RequestOptions = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? timeoutMs,
    );

    try {
      return await fetcher(buildUrl(baseUrl, path, options.query), {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          Version: LEADCONNECTOR_API_VERSION,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    getMessage: async (messageId: string) => normalizeMessage(
      await requestJson<Record<string, unknown>>(`/conversations/messages/${encodeURIComponent(messageId)}`),
    ),
    listConversationMessages: (conversationId: string) =>
      requestJson<Record<string, unknown>>(`/conversations/${encodeURIComponent(conversationId)}/messages`),
    listLocationUsers: (locationId: string) =>
      requestJson<Record<string, unknown>>("/users/", { query: { locationId } }),
    searchConversations: (query: Record<string, string | number | boolean | null | undefined>) =>
      requestJson<Record<string, unknown>>("/conversations/search", { query }),
    downloadMessageRecording: async (recordingInput: {
      locationId: string;
      messageId: string;
    }): Promise<LeadConnectorRecording> => {
      const recording = await requestArrayBuffer(
        `/conversations/messages/${encodeURIComponent(recordingInput.messageId)}/locations/${encodeURIComponent(recordingInput.locationId)}/recording`,
        { timeoutMs: LEADCONNECTOR_RECORDING_TIMEOUT_MS },
      );

      return {
        bytes: Buffer.from(recording.arrayBuffer),
        contentType: recording.contentType ?? "audio/x-wav",
        fileName: parseFileName(recording.contentDisposition) ?? `${recordingInput.messageId}.wav`,
      };
    },
    downloadMessageTranscription: (input: { locationId: string; messageId: string }) =>
      requestJson<Record<string, unknown>>(
        `/conversations/messages/${encodeURIComponent(input.messageId)}/locations/${encodeURIComponent(input.locationId)}/transcription`,
      ),
  };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: Record<string, string | number | boolean | null | undefined> | undefined,
) {
  const url = new URL(path, baseUrl);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined) {
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

function normalizeMessage(payload: Record<string, unknown>): LeadConnectorMessage {
  const message = isRecord(payload.message)
    ? payload.message
    : isRecord(payload.data)
      ? payload.data
      : payload;

  return {
    id: readString(message.id) ?? readString(message.messageId) ?? "",
    conversationId: readString(message.conversationId),
    contactId: readString(message.contactId),
    userId: readString(message.userId) ?? readString(message.user_id),
    direction: readString(message.direction),
    type: readString(message.type) ?? readString(message.messageType),
    dateAdded: readString(message.dateAdded) ?? readString(message.date_added),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFileName(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  return match?.[1] ?? null;
}
