import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompliancePanel } from "../components/settings/compliance-panel";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const initial = { acknowledgedAt: null, acknowledgedByName: null, consentMode: null, recordingEnabled: false };

describe("CompliancePanel", () => {
  it("shows an unacknowledged policy and inactive imports without inventing recording settings", () => {
    const html = renderToStaticMarkup(createElement(CompliancePanel, initial));
    expect(html).toContain('data-settings-compliance="true"');
    expect(html).toContain("Recording consent not yet acknowledged");
    expect(html).toContain("Acknowledge consent policy");
    expect(html).toContain("Automatic call imports are not running.");
    expect(html).toContain("Acknowledging this policy alone does not enable imports.");
    expect(html).not.toContain("Consent mode");
    expect(html).not.toContain("Acknowledged by");
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain('type="checkbox"');
  });

  it("keeps inactive imports inactive after a saved policy acknowledgment", () => {
    const html = renderToStaticMarkup(createElement(CompliancePanel, { ...initial, acknowledgedAt: "2026-11-01T12:00:00Z" }));
    expect(html).toContain("Recording consent acknowledged");
    expect(html).toContain("Re-acknowledge consent policy");
    expect(html).toContain("Automatic call imports are not running.");
    expect(html).not.toContain("Recordings are being ingested automatically.");
  });

  it("shows supplied consent metadata and active status when both conditions are satisfied", () => {
    const html = renderToStaticMarkup(createElement(CompliancePanel, { ...initial, acknowledgedAt: "2026-11-01T12:00:00Z", acknowledgedByName: "Riley Stone", consentMode: "all participants", recordingEnabled: true }));
    expect(html).toContain("Acknowledged by Riley Stone on");
    expect(html).toContain("all participants");
    expect(html).toContain("Recordings are being ingested automatically.");
  });
});
