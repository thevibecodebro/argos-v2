import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { logAuthTransportFailure } from "./auth-observability";

describe("logAuthTransportFailure", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeEach(() => {
    warnSpy.mockClear();
  });

  afterEach(() => {
    warnSpy.mockClear();
  });

  it("logs sanitized auth transport metadata without dumping the raw error", () => {
    const error = Object.assign(new Error("fetch failed"), {
      __isAuthError: true,
      status: 0,
      code: "UND_ERR_CONNECT_TIMEOUT",
    });

    logAuthTransportFailure({
      source: "middleware",
      path: "/login",
      error,
    });

    expect(warnSpy).toHaveBeenCalledWith("[auth] transport failure", {
      source: "middleware",
      path: "/login",
      message: "fetch failed",
      status: 0,
      code: "UND_ERR_CONNECT_TIMEOUT",
      isAuthError: true,
    });
    expect(warnSpy.mock.calls[0]?.[1]).not.toHaveProperty("stack");
    expect(warnSpy.mock.calls[0]?.[1]).not.toHaveProperty("cause");
  });
});
