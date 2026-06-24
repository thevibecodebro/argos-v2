import path from "node:path";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(), payment=()",
  },
] as const;

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: ["@argos-v2/db", "@argos-v2/runtime-identity", "@argos-v2/ui"],
  serverExternalPackages: ["pg", "pg-connection-string"],
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@argos-v2/runtime-identity": path.join(
        __dirname,
        "../../packages/runtime-identity/src/index.ts",
      ),
    };

    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [...securityHeaders],
      },
    ];
  },
};

export default nextConfig;
