import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("Next security headers", () => {
  it("adds conservative public security headers", async () => {
    const headersConfig = await nextConfig.headers?.();
    const firstRule = headersConfig?.[0];

    expect(firstRule?.source).toBe("/:path*");
    expect(firstRule?.headers).toEqual(
      expect.arrayContaining([
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(self), geolocation=(), payment=()",
        },
      ]),
    );
  });
});
