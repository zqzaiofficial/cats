import { createHash } from "crypto";
import { ensureSchema, getPool } from "./db";

const VIEW_COOLDOWN_MS = 5 * 60 * 1000;
const DAILY_VIEW_LIMIT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashIp(ip: string) {
  const salt = process.env.VIEW_IP_SALT ?? "cats-sh-default-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");

  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

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
