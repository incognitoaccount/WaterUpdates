-- 001_init.sql
-- Purpose: initial database schema for Water Updates ingestion + digest
-- Notes:
-- - We keep this schema intentionally small and easy to reason about.
-- - We deduplicate using a unique constraint on `url`.
-- - We store both `published_at` (from source) and `fetched_at` (when we saw it).

CREATE TABLE IF NOT EXISTS articles (
  id BIGSERIAL PRIMARY KEY,

  -- Human-friendly source label (e.g., "DENR", "LWUA", "ABS-CBN").
  source TEXT NOT NULL,

  -- Optional: a lightweight topic/category label used for filtering.
  topic TEXT NULL,

  title TEXT NOT NULL,
  url TEXT NOT NULL,

  -- If an RSS feed does not provide a published date, we fall back to fetched_at.
  published_at TIMESTAMPTZ NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optional snippet/summary for quick previews in the admin page.
  summary TEXT NULL,

  -- When we eventually send to Viber, we can mark which articles were included.
  sent_at TIMESTAMPTZ NULL
);

-- Dedupe: do not insert the same URL twice.
CREATE UNIQUE INDEX IF NOT EXISTS articles_url_unique ON articles(url);

-- Helps with digest queries by date range.
CREATE INDEX IF NOT EXISTS articles_published_at_idx ON articles(published_at DESC);

