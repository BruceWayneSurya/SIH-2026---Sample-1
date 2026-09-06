import { DatabaseConfigurationError, resolveDatabaseConfig, type DatabaseEnvironment } from "../db/config";

export function assertDeploymentConfig(env: DatabaseEnvironment = process.env): void {
  if (env.VERCEL !== "1") return;
  resolveDatabaseConfig(env);
  const secret = env.SESSION_SECRET?.trim();
  if (!secret || secret.length < 32 || secret.startsWith("replace-") || secret === "vidyasetu-sih-demo-secret") {
    throw new DatabaseConfigurationError("Set SESSION_SECRET to a long random value (at least 32 characters) in Vercel Environment Variables, then redeploy. Do not use the public demo secret.");
  }
}
