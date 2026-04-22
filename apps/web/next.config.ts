import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  transpilePackages: ["@argos-v2/db", "@argos-v2/ui"],
  serverExternalPackages: ["pg", "pg-connection-string"],
};

export default nextConfig;
