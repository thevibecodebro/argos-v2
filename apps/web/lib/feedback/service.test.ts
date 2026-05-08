import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeFeedbackPayload,
  sendFeedbackEmail,
  type FeedbackEmailClient,
} from "./service";

function makeFeedbackInput() {
  return {
    feedback: {
      category: "bug" as const,
      message: "The upload page fails after I retry the same recording.",
      pagePath: "/upload",
      subject: "Upload retry issue",
    },
    request: {
      userAgent: "Mozilla/5.0 Test Browser",
    },
    user: {
      email: "jared@acme.com",
      fullName: "Jared Newman",
      id: "user-1",
      orgName: "Acme",
      role: "manager" as const,
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("feedback service", () => {
  it("normalizes valid bug and feedback submissions", () => {
    expect(
      normalizeFeedbackPayload({
        category: "bug",
        message: "  The upload page fails after I retry the same recording.  ",
        pagePath: "/upload?mode=direct",
        subject: "  Upload retry issue  ",
      }),
    ).toEqual({
      ok: true,
      data: {
        category: "bug",
        message: "The upload page fails after I retry the same recording.",
        pagePath: "/upload?mode=direct",
        subject: "Upload retry issue",
      },
    });

    expect(
      normalizeFeedbackPayload({
        category: "feedback",
        message: "It would help if highlights had a saved filter.",
      }),
    ).toMatchObject({
      ok: true,
      data: {
        category: "feedback",
        subject: null,
      },
    });
  });

  it("rejects unsafe or too-short feedback payloads", () => {
    expect(normalizeFeedbackPayload({ category: "bug", message: "short" })).toEqual({
      code: "invalid_feedback",
      error: "Feedback must be at least 10 characters.",
      ok: false,
      status: 400,
    });

    expect(
      normalizeFeedbackPayload({
        category: "sales",
        message: "This has enough characters but the category is wrong.",
      }),
    ).toEqual({
      code: "invalid_feedback",
      error: "Choose bug, feedback, or question.",
      ok: false,
      status: 400,
    });

    expect(
      normalizeFeedbackPayload({
        category: "question",
        message: "x".repeat(4001),
      }),
    ).toEqual({
      code: "invalid_feedback",
      error: "Feedback must be 4000 characters or less.",
      ok: false,
      status: 400,
    });
  });

  it("sends feedback with configured Resend routing and reply-to context", async () => {
    const client: FeedbackEmailClient = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: "email-1" },
          error: null,
        }),
      },
    };

    await sendFeedbackEmail(makeFeedbackInput(), {
      client,
      env: {
        ARGOS_FEEDBACK_FROM: "Argos Feedback <feedback@app.argos.ai>",
        ARGOS_FEEDBACK_TO: "founder@argos.ai",
        RESEND_API_KEY: "re_test",
      },
    });

    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Argos Feedback <feedback@app.argos.ai>",
        html: expect.stringContaining("The upload page fails after I retry"),
        replyTo: "jared@acme.com",
        subject: "[Argos] Bug: Upload retry issue",
        text: expect.stringContaining("Jared Newman <jared@acme.com>"),
        to: "founder@argos.ai",
      }),
    );
    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Mozilla/5.0 Test Browser"),
        text: expect.stringContaining("/upload"),
      }),
    );
  });

  it("escapes user-controlled text before building the HTML email", async () => {
    const client: FeedbackEmailClient = {
      emails: {
        send: vi.fn().mockResolvedValue({
          data: { id: "email-1" },
          error: null,
        }),
      },
    };

    await sendFeedbackEmail(
      {
        ...makeFeedbackInput(),
        feedback: {
          category: "bug",
          message: "<script>alert('bad')</script>",
          pagePath: "/calls/<id>",
          subject: "HTML <subject>",
        },
      },
      {
        client,
        env: {
          ARGOS_FEEDBACK_FROM: "Argos Feedback <feedback@app.argos.ai>",
          ARGOS_FEEDBACK_TO: "founder@argos.ai",
          RESEND_API_KEY: "re_test",
        },
      },
    );

    expect(client.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("&lt;script&gt;alert(&#39;bad&#39;)&lt;/script&gt;"),
        subject: "[Argos] Bug: HTML <subject>",
      }),
    );
  });

  it("requires the feedback recipient environment variable", async () => {
    const client: FeedbackEmailClient = {
      emails: {
        send: vi.fn(),
      },
    };

    await expect(
      sendFeedbackEmail(makeFeedbackInput(), {
        client,
        env: {
          ARGOS_FEEDBACK_FROM: "Argos Feedback <feedback@app.argos.ai>",
          RESEND_API_KEY: "re_test",
        },
      }),
    ).rejects.toThrow("Missing required environment variable: ARGOS_FEEDBACK_TO");
    expect(client.emails.send).not.toHaveBeenCalled();
  });

  it("requires the feedback sender environment variable", async () => {
    const client: FeedbackEmailClient = {
      emails: {
        send: vi.fn(),
      },
    };

    await expect(
      sendFeedbackEmail(makeFeedbackInput(), {
        client,
        env: {
          ARGOS_FEEDBACK_TO: "founder@argos.ai",
          RESEND_API_KEY: "re_test",
        },
      }),
    ).rejects.toThrow("Missing required environment variable: ARGOS_FEEDBACK_FROM");
    expect(client.emails.send).not.toHaveBeenCalled();
  });
});
