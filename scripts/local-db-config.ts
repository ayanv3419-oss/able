/** Connection settings for the embedded Postgres server used in local development. */
export const LOCAL_DB = {
  host: "localhost",
  password: "postgres",
  port: 5433,
  user: "postgres",
} as const;

export function localDbUrl(database: string): string {
  const { host, password, port, user } = LOCAL_DB;
  return `postgres://${user}:${password}@${host}:${port}/${encodeURIComponent(database)}`;
}
