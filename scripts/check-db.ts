import "dotenv/config";
import { publicDatabaseError, resolveDatabaseConfig } from "../src/db/config";

/**
 * Validates the hosted database credentials BEFORE redeploying to Vercel.
 *
 *   npm run db:check
 *
 * - No DATABASE_URL          → local mode is fine for development; Vercel is not.
 * - DATABASE_URL = file path → explains why Vercel must not use it.
 * - DATABASE_URL = libsql:// or https:// + token → opens a connection and runs
 *   `SELECT 1`, exactly like the /api/health route will after deployment.
 *
 * Never prints the URL, token, or any secret.
 */
async function main(): Promise<void> {
  const env = process.env;
  let config;
  try {
    config = resolveDatabaseConfig(env);
  } catch (error) {
    console.error(`✖ ${publicDatabaseError(error)}`);
    process.exitCode = 1;
    return;
  }

  if (config.kind === "local") {
    if (env.VERCEL === "1") {
      console.error(
        "✖ DATABASE_URL points at a local file, but this process is running on Vercel.\n" +
          "  Vercel instances share no filesystem. Set DATABASE_URL to a hosted libsql://\n" +
          "  (or https://) URL and set DATABASE_AUTH_TOKEN, then redeploy.",
      );
      process.exitCode = 1;
      return;
    }
    console.log(
      `Local SQLite mode — file: ${config.filename}\n` +
        "This is fine for local development, but Vercel needs a hosted libsql:// URL in\n" +
        "DATABASE_URL plus DATABASE_AUTH_TOKEN. See VERCEL_HOSTED_SQLITE.md.",
    );
    return;
  }

  const { createClient } = await import("@libsql/client/web");
  const client = createClient({ url: config.url, authToken: config.authToken, intMode: "number" });
  try {
    const result = await client.execute("SELECT 1 AS ok");
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected response from the database.");
    console.log(
      `✓ Hosted SQLite is reachable (${new URL(config.url).hostname}).\n` +
        "Vercel will be able to persist accounts, notes and scores on this database.\n" +
        "Next: copy DATABASE_URL and DATABASE_AUTH_TOKEN into the Vercel project's\n" +
        "Environment Variables (Production and Preview), then redeploy.",
    );
  } catch (error) {
    console.error(
      "✖ Could not reach the hosted database with these credentials.\n" +
        "  Check that DATABASE_URL points at your database (libsql://<db>-<org>.turso.io)\n" +
        "  and that DATABASE_AUTH_TOKEN belongs to it; regenerate the token if needed.\n" +
        `  Detail: ${publicDatabaseError(error)}`,
    );
    process.exitCode = 1;
  } finally {
    client.close();
  }
}

main();
