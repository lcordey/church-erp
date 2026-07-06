import type { NextConfig } from "next";

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  process.env.NEXT_PUBLIC_APP_VERSION ??
  `local-${Date.now()}`;

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.178.22"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
