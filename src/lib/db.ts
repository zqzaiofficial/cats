import { Pool } from "pg";

function getDatabaseUrl() {
  const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT);
  const url =
    (isRailway ? process.env.DATABASE_URL : null) ??
    process.env.DATABASE_PUBLIC_URL ??
    process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL or DATABASE_PUBLIC_URL is not set");
  }

  return url;
}

function needsSsl(connectionString: string) {
  return (
    connectionString.includes("proxy.rlwy.net") ||
    connectionString.includes("railway.app")
  );
}

declare global {
  var pgPool: Pool | undefined;
}

export function getPool() {
  if (!global.pgPool) {
    const connectionString = getDatabaseUrl();

    global.pgPool = new Pool({
      connectionString,
      ssl: needsSsl(connectionString)
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  return global.pgPool;
}

let schemaReady: Promise<void> | null = null;

export async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS views (
          id BIGSERIAL PRIMARY KEY,
          ip_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_views_ip_hash_created_at
        ON views (ip_hash, created_at DESC);
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mails (
          id BIGSERIAL PRIMARY KEY,
          ip_hash TEXT NOT NULL,
          author TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mails_ip_hash_created_at
        ON mails (ip_hash, created_at DESC);
      `);
    })();
  }

  await schemaReady;
}
