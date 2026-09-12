/**
 * Runs a real Postgres server for local development with embedded-postgres.
 * The cluster lives in `.localdb/` at the repo root and is created on the first
 * run. The server keeps running until this process is stopped (Ctrl+C).
 *
 * Usage: corepack pnpm db:local
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { LOCAL_DB, localDbUrl } from "./local-db-config";

const dataDir = path.resolve(import.meta.dirname, "..", ".localdb");

async function main() {
  const server = new EmbeddedPostgres({
    authMethod: "scram-sha-256",
    databaseDir: dataDir,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onError: (error) => console.error(error),
    onLog: (message) => process.stdout.write(message),
    password: LOCAL_DB.password,
    persistent: true,
    port: LOCAL_DB.port,
    // Neon runs in UTC; match it so now() defaults line up with the UTC
    // timestamps the app writes.
    postgresFlags: ["-c", "timezone=UTC"],
    user: LOCAL_DB.user,
  });

  if (existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log(`Using the existing cluster in ${dataDir}`);
  } else {
    console.log(`Initialising a new cluster in ${dataDir}`);
    await server.initialise();
  }

  try {
    await server.start();
  } catch (error) {
    throw new Error(
      `Postgres did not start on port ${LOCAL_DB.port}. Another server may already be using the port or the data directory.`,
      { cause: error }
    );
  }

  console.log(
    `\nLocal Postgres is ready at ${localDbUrl("postgres")}. Stop it with Ctrl+C.`
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
