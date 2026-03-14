import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { DateTime } from "luxon";
import { z } from "zod";

import { getPool } from "@/lib/db";
import { RSS_SOURCES } from "@/lib/sources";

const IngestBodySchema = z
  .object({
    // Optional: limit ingestion to a specific source id.
    sourceId: z.string().min(1).optional(),
    // Optional: how many items per feed to consider.
    limit: z.number().int().min(1).max(50).optional(),
  })
  .strict()
  .optional();

type RssItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
};

function coercePublishedAt(item: RssItem): Date {
  // rss-parser provides `isoDate` when it can.
  const raw = item.isoDate ?? item.pubDate;
  if (!raw) return new Date();

  // Try strict ISO first; fallback to JS Date parser.
  const iso = DateTime.fromISO(raw, { setZone: true });
  if (iso.isValid) return iso.toJSDate();

  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;

  return new Date();
}

export async function POST(req: Request) {
  try {
    const pool = getPool();
    const json = req.headers.get("content-type")?.includes("application/json")
      ? await req.json()
      : undefined;
    const body = IngestBodySchema.parse(json);

    const sources = body?.sourceId
      ? RSS_SOURCES.filter((s) => s.id === body.sourceId)
      : RSS_SOURCES;

    if (sources.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No sources matched." },
        { status: 400 },
      );
    }

    const parser = new Parser();

    let inserted = 0;
    let skipped = 0;
    const errors: Array<{ sourceId: string; message: string }> = [];

    for (const source of sources) {
      try {
        const feed = await parser.parseURL(source.rssUrl);
        const items = (feed.items ?? []) as RssItem[];
        const limited = items.slice(0, body?.limit ?? 20);

        for (const item of limited) {
          const title = (item.title ?? "").trim();
          const url = (item.link ?? "").trim();
          if (!title || !url) {
            skipped += 1;
            continue;
          }

          const publishedAt = coercePublishedAt(item);
          const summary = (item.contentSnippet ?? "").trim() || null;

          const res = await pool.query(
            `
              INSERT INTO articles (source, topic, title, url, published_at, summary)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (url) DO NOTHING
            `,
            [source.label, source.topic, title, url, publishedAt, summary],
          );

          if (res.rowCount === 1) inserted += 1;
          else skipped += 1;
        }
      } catch (err) {
        errors.push({
          sourceId: source.id,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    // Keep the table small and focused: remove articles older than 7 days.
    // This matches the "Recent articles (last 7 days)" behaviour on the site.
    await pool.query("DELETE FROM articles WHERE published_at < NOW() - INTERVAL '7 days'");

    return NextResponse.json({
      ok: true,
      inserted,
      skipped,
      sources: sources.map((s) => s.id),
      errors,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 400 },
    );
  }
}

// Allow simple GET-based triggers (like basic cron webhooks) by delegating to the
// POST handler with an empty Request object. When called this way we behave as
// if no JSON body was provided and ingest all configured sources with defaults.
export async function GET() {
  const fakeRequest = new Request("http://localhost");
  return POST(fakeRequest);
}

