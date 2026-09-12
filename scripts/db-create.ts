/**
 * Creates a database on the local Postgres server started by `db:local`,
 * unless it already exists.
 *
 * Usage: corepack pnpm db:create <name>
 */
import postgres from "postgres";
import { localDbUrl } from "./local-db-config";

const DATABASE_NAME = /^[A-Za-z_][A-Za-z0-9_-]{0,62}$/;

async function main() {
  const [, , name] = process.argv;

  if (!(name && DATABASE_NAME.test(name))) {
    console.error(
      "Usage: corepack pnpm db:create <name>  (letters, digits, _ and -, starting with a letter or _)"
    );
    process.exit(1);
  }

  const sql = postgres(localDbUrl("postgres"), { max: 1 });

  try {
    const existing = await sql`
      select 1 from pg_database where datname = ${name}
    `;

    if (existing.length > 0) {
      console.log(`Database "${name}" already exists.`);
      return;
    }

    await sql`create database ${sql(name)}`;
    console.log(`Created database "${name}".`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
