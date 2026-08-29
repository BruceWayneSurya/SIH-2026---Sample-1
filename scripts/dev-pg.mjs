import EmbeddedPostgres from "embedded-postgres";
import { access } from "fs/promises";
import { mkdir } from "fs/promises";
import path from "path";

const databaseDir = "/tmp/vidyasetu-pg";
await mkdir(databaseDir, { recursive: true });

const pg = new EmbeddedPostgres({
  databaseDir,
  user: "postgres",
  password: "postgres",
  port: 5432,
  persistent: true,
  onLog: (m) => process.stdout.write(String(m)),
  onError: (e) => console.error(e),
});

const alreadyInit = await access(path.join(databaseDir, "PG_VERSION"))
  .then(() => true)
  .catch(() => false);

if (!alreadyInit) {
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase("app_db");
  console.log("created database app_db");
} catch (e) {
  console.log("createDatabase:", e?.message ?? e);
}

console.log("POSTGRES_READY");
await new Promise(() => {});
