import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is previewed through a per-session HTTPS reverse proxy
  // (https://<port>-<sandbox>.e2b.app). Next.js dev would otherwise treat
  // that host as cross-site and 403 HMR/dev assets, breaking interactivity.
  allowedDevOrigins: ["*.e2b.app"],
};

export default nextConfig;
