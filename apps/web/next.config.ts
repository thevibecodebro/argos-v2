import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@argos-v2/db", "@argos-v2/ui"],
  serverExternalPackages: ["pg", "pg-connection-string"],
};

export default nextConfig;
