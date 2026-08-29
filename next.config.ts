import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Preview is served from https://{port}-{sandbox}.e2b.app, not localhost.
  allowedDevOrigins: ["*.e2b.app"],
  // sql.js bundles its own .wasm and is fine through the Next bundler; no
  // serverExternalPackages entry is needed.
};

export default nextConfig;
