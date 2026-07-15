import { describe, expect, it, vi } from "vitest";
import {
  GOOGLE_OAUTH_SCOPES,
  GoogleWorkspaceApiError,
  buildGoogleOAuthUrl,
  downloadDriveFile,
  exchangeGoogleCode,
  findCalendarEventTitleByMeetingCode,
  getDriveFileMetadata,
  getGoogleUserProfile,
  getMeetingSpace,
  listConferenceRecordings,
  listConferenceRecords,
  listPrimaryCalendarEvents,
  refreshGoogleToken,
} from "./index";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function stalledBodyResponse(contentType: string) {
  const body = new ReadableStream<Uint8Array>({
    start() {},
  });
  return new Response(body, { status: 200, headers: { "content-type": contentType } });
}

async function settleBeforeWatchdog<T>(promise: Promise<T>, label: string) {
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    watchdog = setTimeout(() => reject(new Error(`${label} did not settle`)), 200);
  });

  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(watchdog);
  }
}

describe("Google OAuth", () => {
  it("requests the complete fixed scope set and offline consent parameters", () => {
    expect(GOOGLE_OAUTH_SCOPES).toEqual([
      "openid",
      "email",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/drive.meet.readonly",
    ]);

    const url = new URL(
      buildGoogleOAuthUrl({
        clientId: "google-client",
        redirectUri: "https://app.argos.ai/google/callback",
        state: "oauth-state",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("google-client");
    expect(url.searchParams.get("redirect_uri")).toBe("https://app.argos.ai/google/callback");
    expect(url.searchParams.get("state")).toBe("oauth-state");
    expect(url.searchParams.get("scope")?.split(" ")).toEqual(GOOGLE_OAUTH_SCOPES);
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
  });

  it("exchanges and validates tokens with injected fetch and time", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 3600 }),
    );

    const tokens = await exchangeGoogleCode({
      clientId: "client-id",
      clientSecret: "client-secret",
      code: "auth-code",
      redirectUri: "https://app.argos.ai/google/callback",
      fetcher,
      now: () => new Date("2026-07-10T12:00:00.000Z"),
      timeoutMs: 1234,
    });

    expect(tokens).toEqual({
      accessToken: "access-1",
      refreshToken: "refresh-1",
      tokenExpiresAt: new Date("2026-07-10T12:59:00.000Z"),
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(String(init.body)).toContain("grant_type=authorization_code");
    expect(String(init.body)).toContain("code=auth-code");

    await expect(
      exchangeGoogleCode({
        clientId: "client-id",
        clientSecret: "client-secret",
        code: "auth-code",
        redirectUri: "https://app.argos.ai/google/callback",
        fetcher: vi.fn().mockResolvedValue(jsonResponse({ access_token: " ", expires_in: 3600 })),
      }),
    ).rejects.toThrow("Google OAuth token exchange returned an invalid token set");
  });

  it("retains the existing refresh token when Google omits it", async () => {
    const tokens = await refreshGoogleToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "existing-refresh-token",
      fetcher: vi.fn().mockResolvedValue(
        jsonResponse({ access_token: "access-2", expires_in: 1800 }),
      ),
      now: () => new Date("2026-07-10T12:00:00.000Z"),
    });

    expect(tokens.refreshToken).toBe("existing-refresh-token");
    expect(tokens.tokenExpiresAt).toEqual(new Date("2026-07-10T12:29:00.000Z"));
  });

  it("normalizes the Google user profile", async () => {
    const profile = await getGoogleUserProfile({
      accessToken: "access-token",
      fetcher: vi.fn().mockResolvedValue(
        jsonResponse({ sub: " user-123 ", email: " person@example.com " }),
      ),
    });

    expect(profile).toEqual({ id: "user-123", email: "person@example.com" });
  });

  it("keeps the timeout active while consuming a JSON response body", async () => {
    const fetcher = vi.fn(async () => stalledBodyResponse("application/json"));

    const profile = getGoogleUserProfile({
      accessToken: "access-token",
      fetcher,
      timeoutMs: 10,
    });

    await expect(settleBeforeWatchdog(profile, "JSON body"))
      .rejects.toThrow("Google OpenID userinfo timed out after 10ms");
  });
});

describe("Google Meet and Calendar resources", () => {
  it("constructs a bounded conference-record window and maps space resources", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        conferenceRecords: [{
          name: "conferenceRecords/record-1",
          space: "spaces/space-1",
          startTime: "2026-07-10T10:00:00Z",
          endTime: "2026-07-10T11:00:00Z",
        }],
        nextPageToken: "next-record-page",
      }),
    );

    const page = await listConferenceRecords({
      accessToken: "access-token",
      startTime: new Date("2026-07-10T00:00:00Z"),
      endTime: new Date("2026-07-11T00:00:00Z"),
      pageToken: "record-page",
      fetcher,
    });

    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.origin + url.pathname).toBe("https://meet.googleapis.com/v2/conferenceRecords");
    expect(url.searchParams.get("filter")).toBe(
      'end_time>="2026-07-10T00:00:00.000Z" AND end_time<="2026-07-11T00:00:00.000Z"',
    );
    expect(url.searchParams.get("pageSize")).toBe("100");
    expect(url.searchParams.get("pageToken")).toBe("record-page");
    expect(page).toEqual({
      conferenceRecords: [{
        name: "conferenceRecords/record-1",
        space: "spaces/space-1",
        startTime: "2026-07-10T10:00:00Z",
        endTime: "2026-07-10T11:00:00Z",
      }],
      nextPageToken: "next-record-page",
    });
  });

  it("constructs recording pagination and returns normalized recording fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        recordings: [{
          name: "conferenceRecords/record-1/recordings/recording-1",
          state: "FILE_GENERATED",
          driveDestination: { file: "drive-file-1", exportUri: "https://drive.google.com/file/1" },
        }],
        nextPageToken: "next-recording-page",
      }),
    );

    const page = await listConferenceRecordings({
      accessToken: "access-token",
      conferenceRecordName: "conferenceRecords/record-1",
      pageToken: "recording-page",
      fetcher,
    });

    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/v2/conferenceRecords/record-1/recordings");
    expect(url.searchParams.get("pageSize")).toBe("100");
    expect(url.searchParams.get("pageToken")).toBe("recording-page");
    expect(page.nextPageToken).toBe("next-recording-page");
    expect(page.recordings[0]?.driveDestination?.file).toBe("drive-file-1");
  });

  it("loads a meeting space and maps its meeting code", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ name: "spaces/space-1", meetingCode: "abc-defg-hij" }),
    );

    await expect(
      getMeetingSpace({
        accessToken: "access-token",
        spaceResource: "spaces/space-1",
        fetcher,
      }),
    ).resolves.toEqual({ name: "spaces/space-1", meetingCode: "abc-defg-hij" });
    expect(new URL(fetcher.mock.calls[0]![0]).pathname).toBe("/v2/spaces/space-1");
  });

  it("constructs primary-calendar pagination and maps title and conference fields", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [{
          id: "event-1",
          summary: "  Weekly Pipeline Review  ",
          hangoutLink: "https://meet.google.com/abc-defg-hij",
          conferenceData: {
            conferenceId: "abc-defg-hij",
            conferenceSolution: { key: { type: "hangoutsMeet" } },
            entryPoints: [{
              entryPointType: "video",
              uri: "https://meet.google.com/abc-defg-hij?authuser=0",
              label: "meet.google.com/abc-defg-hij",
            }],
          },
          start: { dateTime: "2026-07-10T10:00:00Z" },
          end: { dateTime: "2026-07-10T11:00:00Z" },
        }],
        nextPageToken: "next-calendar-page",
      }),
    );
    const page = await listPrimaryCalendarEvents({
      accessToken: "access-token",
      timeMin: new Date("2026-07-10T00:00:00Z"),
      timeMax: new Date("2026-07-11T00:00:00Z"),
      pageToken: "calendar-page",
      fetcher,
    });

    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/calendar/v3/calendars/primary/events");
    expect(url.searchParams.get("timeMin")).toBe("2026-07-10T00:00:00.000Z");
    expect(url.searchParams.get("timeMax")).toBe("2026-07-11T00:00:00.000Z");
    expect(url.searchParams.get("pageToken")).toBe("calendar-page");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("showDeleted")).toBe("false");
    expect(page.events[0]).toMatchObject({
      id: "event-1",
      summary: "Weekly Pipeline Review",
      hangoutLink: "https://meet.google.com/abc-defg-hij",
      conferenceData: {
        conferenceId: "abc-defg-hij",
        conferenceSolutionKeyType: "hangoutsMeet",
      },
    });
    expect(page.nextPageToken).toBe("next-calendar-page");
  });

  it("matches only exact normalized meeting codes and returns a nonblank trimmed title", () => {
    const events = [
      {
        id: "blank-title",
        summary: "   ",
        hangoutLink: "https://meet.google.com/abc-defg-hij",
        conferenceData: null,
        start: null,
        end: null,
      },
      {
        id: "right-code",
        summary: "  Exact Match Title  ",
        hangoutLink: null,
        conferenceData: {
          conferenceId: "ABC-DEFG-HIJ",
          conferenceSolutionKeyType: "hangoutsMeet",
          entryPoints: [],
        },
        start: null,
        end: null,
      },
      {
        id: "similar-code",
        summary: "Wrong Similar Match",
        hangoutLink: "https://meet.google.com/abc-defg-hik",
        conferenceData: null,
        start: null,
        end: null,
      },
    ];

    expect(findCalendarEventTitleByMeetingCode("https://meet.google.com/abc-defg-hij?authuser=1", events))
      .toBe("Exact Match Title");
    expect(findCalendarEventTitleByMeetingCode("abc-defg-hix", events)).toBeNull();
    expect(findCalendarEventTitleByMeetingCode("not a meet code", events)).toBeNull();
  });

  it("accepts documented alphabetic three-segment codes with variable segment lengths", () => {
    const events = [{
      id: "variable-code",
      summary: "Variable Code Meeting",
      hangoutLink: null,
      conferenceData: {
        conferenceId: "alpha-b-charlie",
        conferenceSolutionKeyType: "hangoutsMeet",
        entryPoints: [],
      },
      start: null,
      end: null,
    }];

    expect(findCalendarEventTitleByMeetingCode("  ALPHA-B-CHARLIE  ", events))
      .toBe("Variable Code Meeting");
    expect(findCalendarEventTitleByMeetingCode(
      "https://meet.google.com/ALPHA-B-CHARLIE?authuser=1",
      events,
    )).toBe("Variable Code Meeting");
  });

  it("accepts 128-character codes and rejects boundary and path-confused invalid forms", () => {
    const maxLengthCode = `a-b-${"c".repeat(124)}`;
    const overLengthCode = `a-b-${"c".repeat(125)}`;
    expect(maxLengthCode).toHaveLength(128);
    expect(overLengthCode).toHaveLength(129);

    const events = [{
      id: "max-code",
      summary: "Maximum Code Meeting",
      hangoutLink: null,
      conferenceData: {
        conferenceId: maxLengthCode,
        conferenceSolutionKeyType: "hangoutsMeet",
        entryPoints: [],
      },
      start: null,
      end: null,
    }];

    expect(findCalendarEventTitleByMeetingCode(maxLengthCode.toUpperCase(), events))
      .toBe("Maximum Code Meeting");
    expect(findCalendarEventTitleByMeetingCode(`https://meet.google.com/${maxLengthCode}`, events))
      .toBe("Maximum Code Meeting");

    for (const invalid of [
      overLengthCode,
      "a--b",
      "a-b-c-d",
      "a-b-c/extra",
      "a-b-c?authuser=1",
      "https://meet.google.com/a-b-c/extra",
      "https://meet.google.com/?meetingCode=a-b-c",
      "https://example.com/a-b-c",
    ]) {
      expect(findCalendarEventTitleByMeetingCode(invalid, events)).toBeNull();
    }
  });
});

describe("Google Drive resources and errors", () => {
  it("requests only required metadata fields and normalizes size", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ id: "file-1", name: "Call.mp4", mimeType: "video/mp4", size: "12345" }),
    );

    const metadata = await getDriveFileMetadata({
      accessToken: "secret-access-token",
      fileId: "file/with spaces",
      fetcher,
    });

    const url = new URL(fetcher.mock.calls[0]![0]);
    expect(url.pathname).toBe("/drive/v3/files/file%2Fwith%20spaces");
    expect(url.searchParams.get("fields")).toBe("id,name,mimeType,size");
    expect(metadata).toEqual({ id: "file-1", name: "Call.mp4", mimeType: "video/mp4", size: 12345 });
  });

  it("downloads files within the configured response limit", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "video/mp4", "content-length": "3" },
      }),
    );

    const download = await downloadDriveFile({
      accessToken: "secret-access-token",
      fileId: "file-1",
      maxBytes: 3,
      fetcher,
    });

    expect([...download.bytes]).toEqual([1, 2, 3]);
    expect(download.contentType).toBe("video/mp4");
    expect(new URL(fetcher.mock.calls[0]![0]).searchParams.get("alt")).toBe("media");

    await expect(
      downloadDriveFile({
        accessToken: "secret-access-token",
        fileId: "file-2",
        maxBytes: 2,
        fetcher: vi.fn().mockResolvedValue(
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-length": "3" },
          }),
        ),
      }),
    ).rejects.toThrow("Response body exceeds 2 bytes");
  });

  it("keeps the timeout active while consuming a Drive download stream", async () => {
    const fetcher = vi.fn(async () => stalledBodyResponse("video/mp4"));

    const download = downloadDriveFile({
      accessToken: "secret-access-token",
      fileId: "file-1",
      maxBytes: 10,
      fetcher,
      timeoutMs: 10,
    });

    await expect(settleBeforeWatchdog(download, "Drive body"))
      .rejects.toThrow("Google Drive files.download timed out after 10ms");
  });

  it("reports operation and status without leaking tokens or response bodies", async () => {
    const accessToken = "super-secret-token";
    const providerBody = "provider-secret-body";
    const request = getDriveFileMetadata({
      accessToken,
      fileId: "file-1",
      fetcher: vi.fn().mockResolvedValue(new Response(providerBody, { status: 403 })),
    });

    await expect(request).rejects.toMatchObject({
      name: "GoogleWorkspaceApiError",
      operation: "Drive files.get",
      status: 403,
    });
    await request.catch((error: unknown) => {
      expect(error).toBeInstanceOf(GoogleWorkspaceApiError);
      const message = String(error);
      expect(message).toContain("Drive files.get");
      expect(message).toContain("403");
      expect(message).not.toContain(accessToken);
      expect(message).not.toContain(providerBody);
    });
  });
});
