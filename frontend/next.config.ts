import type { NextConfig } from "next";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3001";

const nextConfig: NextConfig = {
  // Preview is served from https://{port}-{sandbox}.e2b.app, not localhost.
  allowedDevOrigins: ["*.e2b.app"],
  // The backend is a separate REST API server. The SPA calls the API through
  // these same-origin rewrites so the browser never needs to reach a different
  // origin (no CORS in the browser, cookies flow naturally). Set API_BASE_URL
  // to point at the deployed backend in production.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_BASE}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_BASE}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
