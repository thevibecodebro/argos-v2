import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  UploadCallPanel,
  formatBytes,
  getUploadProgressLabel,
  getUploadedCallHref,
} from "../components/upload-call-panel";
import { validateUploadFile } from "../lib/calls/upload-contract";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("UploadCallPanel forge step flow", () => {
  it("renders a clear three-step upload flow with disabled guidance", () => {
    const html = renderToStaticMarkup(createElement(UploadCallPanel));

    expect(html).toContain("Choose recording");
    expect(html).toContain("Add call context");
    expect(html).toContain("Upload and analyze");
    expect(html).toContain("Choose a recording before analysis can start.");
    expect(html).toContain(`accept="${ACCEPTED_TYPES.join(",")}"`);
    expect(html).toContain("MP3, WAV, M4A, MP4, or WebM up to 500 MB");
    expect(html).toContain("disabled=\"\"");
    expect(html).toContain('data-upload-step-flow="forge"');
    expect(html).toContain('data-forge-status-panel="muted"');
    expect(html).not.toContain(">upload_file</span>");
    expect(html).not.toContain(">info</span>");
  });

  it("keeps upload validation, progress copy, and post-upload destination explicit", () => {
    expect(validateUploadFile({ name: "call.mp3", size: 42_000, type: "audio/mpeg" })).toBeNull();
    expect(validateUploadFile({ name: "call.m4a", size: 42_000, type: "" })).toBeNull();
    expect(validateUploadFile({ name: "call.pdf", size: 42_000, type: "application/pdf" })?.code).toBe(
      "unsupported_file_type",
    );
    expect(validateUploadFile({ name: "call.mp3", size: MAX_UPLOAD_BYTES + 1, type: "audio/mpeg" })?.code).toBe(
      "file_too_large",
    );
    expect(formatBytes(512_000)).toBe("500 KB");
    expect(formatBytes(12 * 1024 * 1024)).toBe("12.0 MB");
    expect(getUploadProgressLabel(80)).toContain("Keep this page open");
    expect(getUploadProgressLabel(100)).toContain("preparing the scorecard");
    expect(getUploadedCallHref("call-123")).toBe("/calls/call-123");
  });
});
