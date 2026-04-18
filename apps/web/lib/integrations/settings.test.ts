import { describe, expect, it } from "vitest";
import { getIntegrationSettingsNotices } from "./settings";

describe("getIntegrationSettingsNotices", () => {
  it("maps integration query params into user-facing notices", () => {
    expect(
      getIntegrationSettingsNotices({
        zoom_connected: "true",
        zoom_notice: "webhook_registration_failed",
        ghl_error: "not_configured",
      }),
    ).toEqual([
      "Zoom is connected.",
      "Zoom connected, but webhook registration failed. Recording ingest will stay unavailable until webhook setup succeeds.",
      "Go High Level is unavailable in this environment until GHL_CLIENT_ID and GHL_CLIENT_SECRET are configured.",
    ]);
  });

  it("returns no notices when no params are present", () => {
    expect(getIntegrationSettingsNotices()).toEqual([]);
  });
});
