import { DatabaseConfigurationError, resolveDatabaseConfig, type DatabaseEnvironment } from "../db/config";

/** Public fallbacks that must never sign a production session. */
const PUBLIC_DEMO_SECRETS = new Set([
  "vidyasetu-sih-demo-secret",
  "pragyan-dev-fallback-secret",
]);

export function assertDeploymentConfig(env: DatabaseEnvironment = process.env): void {
  if (env.VERCEL !== "1") return;
  resolveDatabaseConfig(env);
  const secret = env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32 || secret.startsWith("replace-") || PUBLIC_DEMO_SECRETS.has(secret)) {
    throw new DatabaseConfigurationError("Set SESSION_SECRET to a long random value (at least 32 characters) in Vercel Environment Variables, then redeploy. Do not use the public demo secret.");
  }
}
