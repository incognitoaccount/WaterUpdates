import { Pool } from "pg";

/**
 * Single shared connection pool for Next.js server code.
 *
 * Notes:
 * - Railway provides `DATABASE_URL`.
 * - In production, Railway Postgres typically requires SSL.
 * - We intentionally keep this module tiny and dependency-free.
 *
 * Important:
 * - Next.js may evaluate server modules at build-time.
 * - So we MUST NOT require `DATABASE_URL` during module import.
 * - We create the pool lazily the first time `getPool()` is called.
 */
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

// In dev, Next.js can hot-reload server modules; keep a singleton Pool.
declare global {
  var __waterUpdatesPool: Pool | undefined;
}

export function getPool(): Pool {
  const existing = globalThis.__waterUpdatesPool;
  if (existing) return existing;

  const connectionString = requireEnv("DATABASE_URL");
  const sslConfig =
    process.env.DATABASE_SSL === "false"
      ? undefined
      : process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined;
  const created = new Pool({
    connectionString,
    ssl: sslConfig,
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.__waterUpdatesPool = created;
  }

  return created;
}

