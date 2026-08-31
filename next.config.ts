import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["*.trycloudflare.com", "*.z-agent.ccwu.cc", "idea.z-agent.ccwu.cc"],
  serverExternalPackages: ["@libsql/client"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
