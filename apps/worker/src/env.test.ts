import { describe, expect, it } from "vitest";
import { getWorkerEnv } from "./env";

describe("getWorkerEnv", () => {
  it("returns defaults when optional values are missing", () => {
    expect(getWorkerEnv({})).toEqual({
      host: "0.0.0.0",
      port: 8787,
      nodeEnv: "development",
    });
  });

  it("parses a numeric port", () => {
    expect(getWorkerEnv({ PORT: "9001", NODE_ENV: "production" })).toEqual({
      host: "0.0.0.0",
      port: 9001,
      nodeEnv: "production",
    });
  });

  it("throws when PORT is invalid", () => {
    expect(() => getWorkerEnv({ PORT: "abc" })).toThrow(
      "Invalid PORT environment variable: abc",
    );
  });
});
