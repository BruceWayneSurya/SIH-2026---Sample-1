import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preview is served from https://{port}-{sandbox}.e2b.app, not localhost.
  allowedDevOrigins: ["*.e2b.app"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
