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
    // Match the dashboard's window: last 24 hours in Asia/Manila time.
    const windowEnd = base;
    const windowStart = base.minus({ hours: 24 });

    const res = await pool.query<ArticleRow>(
      `
        SELECT id, source, topic, title, url, published_at, summary
        FROM articles
        WHERE published_at >= $1 AND published_at <= $2
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
      [windowStart.toUTC().toISO(), windowEnd.toUTC().toISO()],
    );

    const rows = res.rows;
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

    return NextResponse.json({
      ok: true,
      count: rows.length,
      window: {
        startLocal: windowStart.toISO(),
        endLocal: windowEnd.toISO(),
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

