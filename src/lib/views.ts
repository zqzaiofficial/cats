import { ensureSchema, getPool } from "./db";
import { hashIp } from "./ip";

export { getClientIp } from "./ip";

const VIEW_COOLDOWN_MS = 5 * 60 * 1000;
const DAILY_VIEW_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function getViewCount() {
  await ensureSchema();
  const pool = getPool();
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*)::text AS count FROM views"
  );

  return Number(result.rows[0]?.count ?? 0);
}

export async function recordView(ip: string) {
  await ensureSchema();
  const pool = getPool();
  const ipHash = hashIp(ip);
  const now = Date.now();
  const cooldownSince = new Date(now - VIEW_COOLDOWN_MS);
  const daySince = new Date(now - DAY_MS);

  const recentView = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS(
        SELECT 1
        FROM views
        WHERE ip_hash = $1
          AND created_at > $2
      ) AS exists
    `,
    [ipHash, cooldownSince]
  );

  if (recentView.rows[0]?.exists) {
    return { views: await getViewCount(), counted: false };
  }

  const dailyCount = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM views
      WHERE ip_hash = $1
        AND created_at > $2
    `,
    [ipHash, daySince]
  );

  if (Number(dailyCount.rows[0]?.count ?? 0) >= DAILY_VIEW_LIMIT) {
    return { views: await getViewCount(), counted: false };
  }

  await pool.query("INSERT INTO views (ip_hash) VALUES ($1)", [ipHash]);

  return { views: await getViewCount(), counted: true };
}
