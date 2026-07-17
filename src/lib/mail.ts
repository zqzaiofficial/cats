import { ensureSchema, getPool } from "./db";
import { hashIp } from "./ip";

export const MAIL_COOLDOWN_MS = 5 * 60 * 1000;

export async function getMailCooldownRemainingMs(ip: string) {
  await ensureSchema();
  const pool = getPool();
  const ipHash = hashIp(ip);

  const result = await pool.query<{ created_at: Date }>(
    `
      SELECT created_at
      FROM mails
      WHERE ip_hash = $1
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [ipHash]
  );

  const lastSent = result.rows[0]?.created_at;
  if (!lastSent) return 0;

  const elapsed = Date.now() - lastSent.getTime();
  return Math.max(0, MAIL_COOLDOWN_MS - elapsed);
}

export async function sendMail(ip: string, author: string, content: string) {
  const cooldownRemainingMs = await getMailCooldownRemainingMs(ip);

  if (cooldownRemainingMs > 0) {
    return { success: false as const, cooldownRemainingMs };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("DISCORD_WEBHOOK_URL is not set");
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "new mail",
          color: 0xffffff,
          fields: [
            { name: "author", value: author, inline: true },
            { name: "content", value: content },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send Discord webhook");
  }

  await ensureSchema();
  const pool = getPool();
  await pool.query(
    "INSERT INTO mails (ip_hash, author, content) VALUES ($1, $2, $3)",
    [hashIp(ip), author, content]
  );

  return {
    success: true as const,
    cooldownRemainingMs: MAIL_COOLDOWN_MS,
  };
}
