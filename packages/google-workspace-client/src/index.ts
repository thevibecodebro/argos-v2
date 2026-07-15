import { readResponseArrayBufferWithLimit } from "@argos-v2/call-processing";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/drive.meet.readonly",
] as const;

export const DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS = 30_000;
export const DEFAULT_GOOGLE_API_TIMEOUT_MS = 120_000;

export type GoogleTokenSet = {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
};

export type GoogleUserProfile = {
  id: string | null;
  email: string | null;
};

export type GoogleConferenceRecord = {
  name: string;
  space: string | null;
  startTime: string | null;
  endTime: string | null;
};

export type GoogleMeetRecording = {
  name: string;
  state: string | null;
  startTime: string | null;
  endTime: string | null;
  driveDestination: {
    file: string | null;
    exportUri: string | null;
  } | null;
};

export type GoogleMeetSpace = {
  name: string;
  meetingCode: string | null;
};

export type GoogleCalendarConferenceData = {
  conferenceId: string | null;
  conferenceSolutionKeyType: string | null;
  entryPoints: Array<{
    entryPointType: string | null;
    uri: string | null;
    label: string | null;
  }>;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string | null;
  hangoutLink: string | null;
  conferenceData: GoogleCalendarConferenceData | null;
  start: GoogleCalendarDateTime | null;
  end: GoogleCalendarDateTime | null;
};

export type GoogleDriveFileMetadata = {
  id: string | null;
  name: string | null;
  mimeType: string | null;
  size: number | null;
};

type GoogleCalendarDateTime = {
  date: string | null;
  dateTime: string | null;
  timeZone: string | null;
};

type RequestRuntime = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
};

type TimedRequestRuntime = RequestRuntime & {
  now?: () => Date;
};

export class GoogleWorkspaceApiError extends Error {
  constructor(
    readonly operation: string,
    readonly status: number,
  ) {
    super(`Google ${operation} failed with HTTP status ${status}`);
    this.name = "GoogleWorkspaceApiError";
  }
}

export class GoogleWorkspaceTimeoutError extends Error {
  constructor(
    readonly operation: string,
    readonly timeoutMs: number,
  ) {
    super(`Google ${operation} timed out after ${timeoutMs}ms`);
    this.name = "GoogleWorkspaceTimeoutError";
  }
}

export function buildGoogleOAuthUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes?: readonly string[];
}) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", (input.scopes ?? GOOGLE_OAUTH_SCOPES).join(" "));
  url.searchParams.set("state", input.state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeGoogleCode(input: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
} & TimedRequestRuntime): Promise<GoogleTokenSet> {
  const payload = await requestJson("OAuth token exchange", "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      grant_type: "authorization_code",
      redirect_uri: input.redirectUri,
    }).toString(),
  }, input, DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS);

  const accessToken = readString(payload.access_token);
  const refreshToken = readString(payload.refresh_token);
  const expiresIn = readPositiveNumber(payload.expires_in);

  if (!accessToken || !refreshToken || expiresIn === null) {
    throw new Error("Google OAuth token exchange returned an invalid token set");
  }

  return buildTokenSet(accessToken, refreshToken, expiresIn, input.now);
}

export async function refreshGoogleToken(input: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
} & TimedRequestRuntime): Promise<GoogleTokenSet> {
  const retainedRefreshToken = readString(input.refreshToken);
  if (!retainedRefreshToken) {
    throw new Error("Google OAuth token refresh requires a refresh token");
  }

  const payload = await requestJson("OAuth token refresh", "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      grant_type: "refresh_token",
      refresh_token: retainedRefreshToken,
    }).toString(),
  }, input, DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS);

  const accessToken = readString(payload.access_token);
  const refreshToken = readString(payload.refresh_token) ?? retainedRefreshToken;
  const expiresIn = readPositiveNumber(payload.expires_in);

  if (!accessToken || expiresIn === null) {
    throw new Error("Google OAuth token refresh returned an invalid token set");
  }

  return buildTokenSet(accessToken, refreshToken, expiresIn, input.now);
}

export async function revokeGoogleToken(input: {
  token: string;
} & RequestRuntime): Promise<void> {
  const token = readString(input.token);
  if (!token) {
    throw new Error("Google OAuth token revocation requires a token");
  }

  await request(
    "OAuth token revocation",
    "https://oauth2.googleapis.com/revoke",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
    },
    input,
    DEFAULT_GOOGLE_OAUTH_TIMEOUT_MS,
    async (response) => {
      if (response.ok) {
        await response.arrayBuffer();
        return;
      }

      const payload = await response.json().catch(() => null) as unknown;
      if (isRecord(payload) && readString(payload.error) === "invalid_token") {
        return;
      }

      throw new GoogleWorkspaceApiError("OAuth token revocation", response.status);
    },
    (response) => response.ok || response.status === 400,
  );
}

export async function getGoogleUserProfile(input: {
  accessToken: string;
} & RequestRuntime): Promise<GoogleUserProfile> {
  const payload = await requestJson(
    "OpenID userinfo",
    "https://openidconnect.googleapis.com/v1/userinfo",
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    id: readString(payload.sub),
    email: readString(payload.email),
  };
}

export async function listConferenceRecords(input: {
  accessToken: string;
  startTime: Date;
  endTime: Date;
  pageToken?: string | null;
} & RequestRuntime) {
  const [startTime, endTime] = boundedIsoWindow(input.startTime, input.endTime);
  const url = new URL("https://meet.googleapis.com/v2/conferenceRecords");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("filter", `end_time>=\"${startTime}\" AND end_time<=\"${endTime}\"`);
  setOptionalQuery(url, "pageToken", input.pageToken);

  const payload = await requestJson(
    "Meet conferenceRecords.list",
    url,
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    conferenceRecords: readRecordArray(payload.conferenceRecords).map(normalizeConferenceRecord),
    nextPageToken: readString(payload.nextPageToken),
  };
}

export async function listConferenceRecordings(input: {
  accessToken: string;
  conferenceRecordName: string;
  pageToken?: string | null;
} & RequestRuntime) {
  const resource = encodeResourceName(input.conferenceRecordName, "conferenceRecords");
  const url = new URL(`https://meet.googleapis.com/v2/${resource}/recordings`);
  url.searchParams.set("pageSize", "100");
  setOptionalQuery(url, "pageToken", input.pageToken);

  const payload = await requestJson(
    "Meet recordings.list",
    url,
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    recordings: readRecordArray(payload.recordings).map(normalizeRecording),
    nextPageToken: readString(payload.nextPageToken),
  };
}

export async function getMeetingSpace(input: {
  accessToken: string;
  spaceResource: string;
} & RequestRuntime): Promise<GoogleMeetSpace> {
  const resource = encodeResourceName(input.spaceResource, "spaces");
  const payload = await requestJson(
    "Meet spaces.get",
    `https://meet.googleapis.com/v2/${resource}`,
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    name: readString(payload.name) ?? "",
    meetingCode: readString(payload.meetingCode),
  };
}

export async function listPrimaryCalendarEvents(input: {
  accessToken: string;
  timeMin: Date;
  timeMax: Date;
  pageToken?: string | null;
} & RequestRuntime) {
  const [timeMin, timeMax] = boundedIsoWindow(input.timeMin, input.timeMax);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", timeMin);
  url.searchParams.set("timeMax", timeMax);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("showDeleted", "false");
  url.searchParams.set("maxResults", "2500");
  setOptionalQuery(url, "pageToken", input.pageToken);

  const payload = await requestJson(
    "Calendar events.list",
    url,
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    events: readRecordArray(payload.items).map(normalizeCalendarEvent),
    nextPageToken: readString(payload.nextPageToken),
  };
}

export async function getDriveFileMetadata(input: {
  accessToken: string;
  fileId: string;
} & RequestRuntime): Promise<GoogleDriveFileMetadata> {
  const url = driveFileUrl(input.fileId);
  url.searchParams.set("fields", "id,name,mimeType,size");
  const payload = await requestJson(
    "Drive files.get",
    url,
    authorizedRequest(input.accessToken),
    input,
  );

  return {
    id: readString(payload.id),
    name: readString(payload.name),
    mimeType: readString(payload.mimeType),
    size: readNonNegativeInteger(payload.size),
  };
}

export async function downloadDriveFile(input: {
  accessToken: string;
  fileId: string;
  maxBytes: number;
} & RequestRuntime) {
  const url = driveFileUrl(input.fileId);
  url.searchParams.set("alt", "media");
  const download = await request(
    "Drive files.download",
    url,
    authorizedRequest(input.accessToken),
    input,
    DEFAULT_GOOGLE_API_TIMEOUT_MS,
    async (response) => ({
      arrayBuffer: await readResponseArrayBufferWithLimit(response, input.maxBytes),
      contentType: response.headers.get("content-type") ?? "video/mp4",
    }),
  );

  return {
    bytes: Buffer.from(download.arrayBuffer),
    contentType: download.contentType,
  };
}

export function findCalendarEventTitleByMeetingCode(
  meetingCodeOrUrl: string,
  events: readonly GoogleCalendarEvent[],
) {
  const meetingCode = normalizeMeetingCode(meetingCodeOrUrl);
  if (!meetingCode) {
    return null;
  }

  for (const event of events) {
    if (!calendarEventMeetingCodes(event).has(meetingCode)) {
      continue;
    }

    const summary = readString(event.summary);
    if (summary) {
      return summary;
    }
  }

  return null;
}

function buildTokenSet(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
  now: (() => Date) | undefined,
): GoogleTokenSet {
  const nowDate = now?.() ?? new Date();
  const nowMs = nowDate.getTime();
  if (!Number.isFinite(nowMs)) {
    throw new Error("Google OAuth token timing received an invalid current time");
  }

  return {
    accessToken,
    refreshToken,
    tokenExpiresAt: new Date(nowMs + Math.max(0, expiresInSeconds * 1000 - 60_000)),
  };
}

function authorizedRequest(accessToken: string): RequestInit {
  return { headers: { authorization: `Bearer ${accessToken}` } };
}

async function requestJson(
  operation: string,
  url: string | URL,
  init: RequestInit,
  runtime: RequestRuntime,
  defaultTimeoutMs = DEFAULT_GOOGLE_API_TIMEOUT_MS,
) {
  const payload = await request(
    operation,
    url,
    init,
    runtime,
    defaultTimeoutMs,
    async (response) => {
      try {
        return await response.json() as unknown;
      } catch {
        throw new InvalidGoogleJsonError(operation);
      }
    },
  );

  if (!isRecord(payload)) {
    throw new Error(`Google ${operation} returned invalid JSON`);
  }
  return payload;
}

async function request<T>(
  operation: string,
  url: string | URL,
  init: RequestInit,
  runtime: RequestRuntime,
  defaultTimeoutMs: number,
  consumeResponse: (response: Response) => Promise<T>,
  isAcceptedResponse: (response: Response) => boolean = (response) => response.ok,
): Promise<T> {
  const fetcher = runtime.fetcher ?? fetch;
  const timeoutMs = runtime.timeoutMs ?? defaultTimeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new Error("Google request timeout must be a positive safe integer");
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new GoogleWorkspaceTimeoutError(operation, timeoutMs));
    }, timeoutMs);
  });
  let responseReceived = false;
  const operationPromise = (async () => {
    try {
      const response = await fetcher(url, { ...init, signal: controller.signal });
      responseReceived = true;

      if (!isAcceptedResponse(response)) {
        throw new GoogleWorkspaceApiError(operation, response.status);
      }

      return await consumeResponse(response);
    } catch (error) {
      if (error instanceof GoogleWorkspaceApiError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new GoogleWorkspaceTimeoutError(operation, timeoutMs);
      }
      if (responseReceived) {
        throw error;
      }
      throw new Error(`Google ${operation} request failed`);
    }
  })();

  try {
    return await Promise.race([operationPromise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

class InvalidGoogleJsonError extends Error {
  constructor(operation: string) {
    super(`Google ${operation} returned invalid JSON`);
    this.name = "InvalidGoogleJsonError";
  }
}

function normalizeConferenceRecord(value: Record<string, unknown>): GoogleConferenceRecord {
  return {
    name: readString(value.name) ?? "",
    space: readString(value.space),
    startTime: readString(value.startTime),
    endTime: readString(value.endTime),
  };
}

function normalizeRecording(value: Record<string, unknown>): GoogleMeetRecording {
  const destination = isRecord(value.driveDestination) ? value.driveDestination : null;
  return {
    name: readString(value.name) ?? "",
    state: readString(value.state),
    startTime: readString(value.startTime),
    endTime: readString(value.endTime),
    driveDestination: destination
      ? {
          file: readString(destination.file),
          exportUri: readString(destination.exportUri),
        }
      : null,
  };
}

function normalizeCalendarEvent(value: Record<string, unknown>): GoogleCalendarEvent {
  return {
    id: readString(value.id) ?? "",
    summary: readString(value.summary),
    hangoutLink: readString(value.hangoutLink),
    conferenceData: normalizeConferenceData(value.conferenceData),
    start: normalizeCalendarDateTime(value.start),
    end: normalizeCalendarDateTime(value.end),
  };
}

function normalizeConferenceData(value: unknown): GoogleCalendarConferenceData | null {
  if (!isRecord(value)) {
    return null;
  }
  const solution = isRecord(value.conferenceSolution) ? value.conferenceSolution : null;
  const key = solution && isRecord(solution.key) ? solution.key : null;
  return {
    conferenceId: readString(value.conferenceId),
    conferenceSolutionKeyType: key ? readString(key.type) : null,
    entryPoints: readRecordArray(value.entryPoints).map((entryPoint) => ({
      entryPointType: readString(entryPoint.entryPointType),
      uri: readString(entryPoint.uri),
      label: readString(entryPoint.label),
    })),
  };
}

function normalizeCalendarDateTime(value: unknown): GoogleCalendarDateTime | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    date: readString(value.date),
    dateTime: readString(value.dateTime),
    timeZone: readString(value.timeZone),
  };
}

function calendarEventMeetingCodes(event: GoogleCalendarEvent) {
  const candidates = [
    event.hangoutLink,
    event.conferenceData?.conferenceId,
    ...(event.conferenceData?.entryPoints.map((entryPoint) => entryPoint.uri) ?? []),
  ];
  return new Set(candidates.map((candidate) => normalizeMeetingCode(candidate)).filter(isString));
}

function normalizeMeetingCode(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) {
    return null;
  }

  if (isValidMeetingCode(candidate)) {
    return candidate.toLowerCase();
  }

  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:"
      || url.hostname.toLowerCase() !== "meet.google.com"
      || url.username
      || url.password
      || url.port
    ) {
      return null;
    }
    const match = url.pathname.match(/^\/([^/]+)\/?$/);
    const meetingCode = match?.[1];
    return meetingCode && isValidMeetingCode(meetingCode)
      ? meetingCode.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function isValidMeetingCode(value: string) {
  return value.length <= 128 && /^[a-z]+-[a-z]+-[a-z]+$/i.test(value);
}

function boundedIsoWindow(start: Date, end: Date): [string, string] {
  const startMs = start.getTime();
  const endMs = end.getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs >= endMs) {
    throw new Error("Google API time window must have valid increasing bounds");
  }
  return [start.toISOString(), end.toISOString()];
}

function encodeResourceName(value: string, prefix: string) {
  const parts = value.trim().split("/");
  if (parts.length !== 2 || parts[0] !== prefix || !parts[1]) {
    throw new Error(`Google resource must use the ${prefix}/<id> format`);
  }
  return `${prefix}/${encodeURIComponent(parts[1])}`;
}

function driveFileUrl(fileId: string) {
  const normalizedFileId = readString(fileId);
  if (!normalizedFileId) {
    throw new Error("Google Drive file ID is required");
  }
  return new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(normalizedFileId)}`);
}

function setOptionalQuery(url: URL, key: string, value: string | null | undefined) {
  const normalized = readString(value);
  if (normalized) {
    url.searchParams.set(key, normalized);
  }
}

function readRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readPositiveNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function readNonNegativeInteger(value: unknown) {
  const numericValue = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  return typeof numericValue === "number"
    && Number.isSafeInteger(numericValue)
    && numericValue >= 0
    ? numericValue
    : null;
}

function isString(value: string | null): value is string {
  return value !== null;
}
