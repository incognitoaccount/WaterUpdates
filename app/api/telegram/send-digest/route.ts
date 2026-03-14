import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getPool } from "@/lib/db";

type ArticleRow = {
  id: number;
  source: string;
  topic: string | null;
  title: string;
  url: string;
  published_at: Date;
  summary: string | null;
};

const TZ = "Asia/Manila";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function formatDigestMessage(rows: ArticleRow[]): string {
  // We keep the header simple so it works well both for daily digests
  // and for "near real-time" sends when new water articles arrive.
  const base = DateTime.now().setZone(TZ);
  const header = `Water Updates – ${base.toFormat("MMM d, yyyy")}\n`;

  if (rows.length === 0) {
    return `${header}\nNo new water-related articles or news were found for this digest window.`;
  }

  const lines: string[] = [];
  rows.forEach((row, idx) => {
    const when = DateTime.fromJSDate(new Date(row.published_at))
      .setZone(TZ)
      .toFormat("MMM d, HH:mm");
    lines.push(
      `${idx + 1}. [${row.source}] ${row.title} (${when})\n${row.url}`,
    );
  });

  return `${header}\n${lines.join("\n\n")}`;
}

export async function POST() {
  try {
    const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
    const chatId = requireEnv("TELEGRAM_CHAT_ID");

    const pool = getPool();
    const base = DateTime.now().setZone(TZ);
    // For automatic "whenever there is a new article" sending we:
    // - Look for water-related articles that have NOT been sent yet (sent_at IS NULL).
    // - Optionally limit to a safety window (last 7 days) so very old rows cannot flood Telegram.
    const windowStart = base.minus({ days: 7 });

    const res = await pool.query<ArticleRow>(
      `
        SELECT id, source, topic, title, url, published_at, summary
        FROM articles
        WHERE sent_at IS NULL
          AND published_at >= $1
          AND (
            LOWER(title) LIKE '%water%' OR
            LOWER(COALESCE(summary, '')) LIKE '%water%' OR
            LOWER(title) LIKE '%flood%' OR
            LOWER(COALESCE(summary, '')) LIKE '%flood%' OR
            LOWER(title) LIKE '%dam%' OR
            LOWER(COALESCE(summary, '')) LIKE '%dam%' OR
            LOWER(title) LIKE '%reservoir%' OR
            LOWER(COALESCE(summary, '')) LIKE '%reservoir%'
          )
        ORDER BY published_at DESC
        LIMIT 50
      `,
      [windowStart.toUTC().toISO()],
    );

    const rows = res.rows;

    // Only send a Telegram message when there are new articles. Otherwise we would
    // send "No new water-related articles..." every 5 minutes when the cron runs.
    if (rows.length > 0) {
      const text = formatDigestMessage(rows);
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
        }),
      });

      const data = (await resp.json().catch(() => ({}))) as {
        ok?: boolean;
        description?: string;
      };

      if (!data.ok) {
        throw new Error(data.description ?? "Telegram API returned an error.");
      }

      // Mark these articles as sent so the next cron run won't send them again.
      const ids = rows.map((row) => row.id);
      await pool.query(
        `UPDATE articles SET sent_at = NOW() WHERE id = ANY($1::bigint[])`,
        [ids],
      );
    }

    return NextResponse.json({
      ok: true,
      count: rows.length,
      window: {
        startLocal: windowStart.toISO(),
        endLocal: base.toISO(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}

// Cron webhooks often use GET; same behavior as POST (send only unsent articles).
export async function GET() {
  return POST();
}

