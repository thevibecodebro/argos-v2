import { describe, expect, it } from "vitest";
import { validatePlatformJsonMutation } from "./platform-mutation";

function request(headers: Record<string, string>) {
  return new Request("http://localhost:3000/api/platform/organizations", {
    body: "{}",
    headers,
    method: "POST",
  });
}

describe("validatePlatformJsonMutation", () => {
  it("accepts same-origin JSON browser mutations", () => {
    expect(
      validatePlatformJsonMutation(
        request({
          "content-type": "application/json; charset=utf-8",
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects cross-origin JSON mutations", () => {
    expect(
      validatePlatformJsonMutation(
        request({
          "content-type": "application/json",
          origin: "https://attacker.example",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Cross-origin platform mutation rejected",
      status: 403,
    });
  });

  it("rejects non-JSON mutation bodies", () => {
    expect(
      validatePlatformJsonMutation(
        request({
          "content-type": "text/plain",
          origin: "http://localhost:3000",
        }),
      ),
    ).toEqual({
      ok: false,
      error: "Platform mutations require an application/json request",
      status: 415,
    });
  });
});
