import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

// `next dev` re-runs this module on every hot reload. Reusing one pool per
// process stops each reload leaking another pool; a leak once filled all 100
// connections of the local database.
const globalForDb = globalThis as typeof globalThis & { ableSql?: Sql };

// prepare: false lets this client use Supabase's pooled (transaction-mode)
// connection string, which does not support prepared statements. Idle
// connections close after 20 seconds.
const client =
  globalForDb.ableSql ??
  postgres(process.env.POSTGRES_URL ?? "", {
    idle_timeout: 20,
    prepare: false,
  });

if (process.env.NODE_ENV === "development") {
  globalForDb.ableSql = client;
}

export const db = drizzle(client);
