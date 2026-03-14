import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { z } from "zod";

import { getPool } from "@/lib/db";

const DigestQuerySchema = z.object({
  // Optional local date in YYYY-MM-DD (Asia/Manila); defaults to "today".
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

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

function computeWindow(forLocalDate?: string) {
  const base = forLocalDate
    ? DateTime.fromISO(forLocalDate, { zone: TZ })
    : DateTime.now().setZone(TZ);

  // Dashboard view: show articles from the last 48 hours in Asia/Manila time
  // so that items from both \"today\" and \"yesterday\" are visible.
  const windowEnd = base;
  const windowStart = base.minus({ hours: 48 });

  return { forDate: base.toISODate(), windowStart, windowEnd };
}

export async function GET(req: Request) {
  const pool = getPool();
  const { searchParams } = new URL(req.url);
  const parsed = DigestQuerySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid query params." },
      { status: 400 },
    );
  }

  const { forDate, windowStart, windowEnd } = computeWindow(parsed.data.date);

  const res = await pool.query(
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
      LIMIT 200
    `,
    [windowStart.toUTC().toISO(), windowEnd.toUTC().toISO()],
  );
  const rows = res.rows as ArticleRow[];

  return NextResponse.json({
    ok: true,
    forDate,
    tz: TZ,
    window: {
      startLocal: windowStart.toISO(),
      endLocal: windowEnd.toISO(),
      startUtc: windowStart.toUTC().toISO(),
      endUtc: windowEnd.toUTC().toISO(),
    },
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      source: r.source,
      topic: r.topic,
      title: r.title,
      url: r.url,
      publishedAt: DateTime.fromJSDate(new Date(r.published_at))
        .setZone(TZ)
        .toISO(),
      summary: r.summary,
    })),
  });
}

