import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// prepare: false lets this client use Supabase's pooled (transaction-mode)
// connection string, which does not support prepared statements.
const client = postgres(process.env.POSTGRES_URL ?? "", { prepare: false });

export const db = drizzle(client);
