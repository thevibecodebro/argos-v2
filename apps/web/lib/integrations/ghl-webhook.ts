import crypto from "node:crypto";

type GhlWebhookEnv = Partial<Record<"GHL_WEBHOOK_TOKEN", string | undefined>>;

export type GhlWebhookRepository = {
  deleteGhlIntegrationByLocationId(locationId: string): Promise<boolean>;
  findGhlIntegrationByLocationId(locationId: string): Promise<{
    orgId: string;
    locationId: string;
  } | null>;
  upsertGhlCallImport(input: {
    orgId: string;
    locationId: string;
    messageId: string;
    conversationId: string | null;
    contactId: string | null;
    ghlUserId: string | null;
    messageCreatedAt: Date | null;
    status: "pending";
  }): Promise<void>;
};

type GhlWebhookRequest = {
  env?: GhlWebhookEnv;
  headers: {
    token: string | null;
  };
  rawBody: string;
};

type GhlWebhookResponse = {
  status: number;
  body: Record<string, unknown>;
};

type GhlWebhookPayload = {
  type?: string;
  event?: string;
  locationId?: string;
  location_id?: string;
  messageId?: string;
  message_id?: string;
  conversationId?: string;
  conversation_id?: string;
  contactId?: string;
  contact_id?: string;
  userId?: string;
  user_id?: string;
  dateAdded?: string;
  date_added?: string;
  timestamp?: string;
  payload?: GhlWebhookPayload;
};

const MESSAGE_EVENTS = new Set(["InboundMessage", "OutboundMessage"]);
const UNINSTALL_EVENTS = new Set(["AppUninstalled", "UNINSTALL", "app.uninstalled"]);

export async function processGhlWebhookRequest(
  repository: GhlWebhookRepository,
  input: GhlWebhookRequest,
): Promise<GhlWebhookResponse> {
  const expectedToken = input.env?.GHL_WEBHOOK_TOKEN ?? process.env.GHL_WEBHOOK_TOKEN;

  if (!expectedToken || !safeTokenMatch(input.headers.token, expectedToken)) {
    return {
      status: 401,
      body: { error: "Invalid webhook token" },
    };
  }

  const parsed = safeParseJson(input.rawBody);

  if (!parsed) {
    return {
      status: 400,
      body: { error: "Invalid JSON payload" },
    };
  }

  const payload = parsed.payload ?? parsed;
  const eventType = payload.type ?? payload.event ?? parsed.type ?? parsed.event ?? null;
  const locationId = readString(payload.locationId ?? payload.location_id ?? parsed.locationId ?? parsed.location_id);

  if (!locationId) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  if (eventType && UNINSTALL_EVENTS.has(eventType)) {
    await repository.deleteGhlIntegrationByLocationId(locationId);
    return {
      status: 200,
      body: { received: true },
    };
  }

  if (!eventType || !MESSAGE_EVENTS.has(eventType)) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  const messageId = readString(payload.messageId ?? payload.message_id);

  if (!messageId) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  const integration = await repository.findGhlIntegrationByLocationId(locationId);

  if (!integration) {
    return {
      status: 200,
      body: { received: true },
    };
  }

  await repository.upsertGhlCallImport({
    orgId: integration.orgId,
    locationId,
    messageId,
    conversationId: readString(payload.conversationId ?? payload.conversation_id),
    contactId: readString(payload.contactId ?? payload.contact_id),
    ghlUserId: readString(payload.userId ?? payload.user_id),
    messageCreatedAt: parseOptionalDate(payload.dateAdded ?? payload.date_added ?? payload.timestamp),
    status: "pending",
  });

  return {
    status: 200,
    body: { received: true },
  };
}

function safeParseJson(value: string): GhlWebhookPayload | null {
  try {
    return JSON.parse(value) as GhlWebhookPayload;
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseOptionalDate(value: unknown) {
  const raw = readString(value);

  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeTokenMatch(actual: string | null, expected: string) {
  if (!actual) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}
