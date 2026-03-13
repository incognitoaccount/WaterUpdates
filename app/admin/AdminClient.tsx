"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./admin.module.css";

type IngestResult =
  | {
      ok: true;
      inserted: number;
      skipped: number;
      sources: string[];
      errors: Array<{ sourceId: string; message: string }>;
    }
  | { ok: false; error: string };

type DigestResult =
  | {
      ok: true;
      forDate: string;
      tz: string;
      window: { startLocal: string; endLocal: string; startUtc: string; endUtc: string };
      count: number;
      items: Array<{
        id: number;
        source: string;
        topic: string | null;
        title: string;
        url: string;
        publishedAt: string;
        summary: string | null;
      }>;
    }
  | { ok: false; error: string };

function formatSourceError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("403")) {
    return "Access blocked by this website (HTTP 403 – Forbidden). Some sites do not allow automated RSS access.";
  }
  if (lower.includes("500")) {
    return "The website returned an internal error (HTTP 500). This is a temporary issue on their side.";
  }
  if (lower.includes("timeout")) {
    return "The request to this website timed out. The server may be slow or temporarily unavailable.";
  }
  return message;
}

function formatWindowLocal(window: { startLocal: string; endLocal: string }): string {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const start = formatter.format(new Date(window.startLocal));
  const end = formatter.format(new Date(window.endLocal));
  return `${start} \u2192 ${end}`;
}

function formatArticleTime(iso: string): string {
  const formatter = new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(new Date(iso));
}
async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : "{}",
  });
  return (await res.json()) as T;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  return (await res.json()) as T;
}

export default function AdminClient() {
  const [busy, setBusy] = useState(false);
  const [ingest, setIngest] = useState<IngestResult | null>(null);
  const [digest, setDigest] = useState<DigestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const digestItems = useMemo(() => {
    if (!digest || !("ok" in digest) || digest.ok !== true) return [];
    return digest.items;
  }, [digest]);

  async function refreshAll() {
    const previousCount =
      digest && "ok" in digest && digest.ok ? digest.count : undefined;

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const result = await postJson<IngestResult>("/api/ingest", { limit: 20 });
      setIngest(result);
      const digestResult = await getJson<DigestResult>("/api/digest");
      setDigest(digestResult);
      if (
        digestResult &&
        "ok" in digestResult &&
        digestResult.ok &&
        previousCount !== undefined &&
        digestResult.count === previousCount
      ) {
        setInfo("No new water-related articles or news were found since the last update.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  // When the dashboard opens, always show today's latest articles without forcing
  // the user to click the button again.
  useEffect(() => {
    (async () => {
      try {
        const digestResult = await getJson<DigestResult>("/api/digest");
        setDigest(digestResult);
      } catch (e) {
        // Ignore here; explicit refresh will surface any errors.
      }
    })();
    // run once on mount
  }, []);

  const ingestOk = ingest && "ok" in ingest && ingest.ok;
  const digestOk = digest && "ok" in digest && digest.ok;

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <a href="/" className={styles.topLink}>
            ← Back to site
          </a>
        </div>

        <div className={styles.titleBar}>
          <div>
            <div className={styles.title}>Water Updates Dashboard</div>
            <div className={styles.subtitle}>
              Fetch new articles from sources and review the latest water-related updates.
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryButton} onClick={refreshAll} disabled={busy}>
              {busy ? "Working..." : "Update and show latest"}
            </button>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  const res = await fetch("/api/telegram/send-digest", { method: "POST" });
                  const json = (await res.json()) as { ok: boolean; error?: string };
                  if (!json.ok) {
                    setError(json.error ?? "Failed to send Telegram message.");
                  } else {
                    setInfo("Sent the daily digest to Telegram successfully.");
                  }
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unknown error sending to Telegram.");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "Working..." : "Send digest to Telegram"}
            </button>
          </div>
        </div>

        {error ? (
          <div className={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        ) : null}

        {info ? (
          <div className={styles.errorBox} style={{ borderColor: "#bfdbfe", background: "#eff6ff", color: "#1d4ed8" }}>
            {info}
          </div>
        ) : null}

        <div className={styles.layout}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}>Source updates</div>
            <p className={styles.panelMeta}>
              When you click <strong>Update and show latest</strong>, the system connects to each configured website,
              reads its RSS feed, and saves any new water-related articles into the database.
            </p>

            {ingest && ingestOk ? (
              <>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Inserted:</span>{" "}
                  <span className={styles.pill}>{ingest.inserted}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Skipped (already stored):</span>{" "}
                  <span className={styles.pill}>{ingest.skipped}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Sources:</span>{" "}
                  <span className={styles.code}>{ingest.sources.join(", ")}</span>
                </div>
                {ingest.errors.length ? (
                  <div className={styles.errorBox}>
                    <strong>Source errors</strong>
                    <ul>
                      {ingest.errors.map((e) => (
                        <li key={e.sourceId}>
                          <span className={styles.code}>{e.sourceId}</span>: {formatSourceError(e.message)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : (
              <div className={styles.emptyState}>
                No update has been run yet. Use <strong>Update and show latest</strong> to fetch the latest articles.
              </div>
            )}
          </section>

          <section className={styles.panel}>
            <div className={styles.digestHeader}>
              <div>
                <div className={styles.panelTitle}>Latest articles/news</div>
                <p className={styles.panelMeta}>
                  Showing water-related articles and news from the last 24 hours (Asia/Manila).
                </p>
              </div>
              {digestOk ? (
                <div className={styles.digestCount}>
                  For {digest.forDate} • <span className={styles.pill}>{digest.count} items</span>
                </div>
              ) : null}
            </div>

            {digestOk ? (
              <>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>Window (local):</span>{" "}
                  <span className={styles.code}>
                    {formatWindowLocal(digest.window)}
                  </span>
                </div>

                {digestItems.length === 0 ? (
                  <div className={styles.emptyState}>
                    No items fall inside the current window. Try ingesting again or check your source feeds.
                  </div>
                ) : (
                  <ul className={styles.digestList}>
                    {digestItems.map((it) => (
                      <li key={it.id} className={styles.digestItem}>
                        <div className={styles.digestTitle}>{it.title}</div>
                        <div className={styles.digestMeta}>
                          <span className={styles.sourceTag}>{it.source}</span>
                          {it.topic ? <span>• {it.topic}</span> : ""} 
                          <span>• {formatArticleTime(it.publishedAt)}</span>
                        </div>
                        <a className={styles.digestLink} href={it.url} target="_blank" rel="noreferrer">
                          Open article ↗
                        </a>
                        {it.summary ? <div className={styles.digestSummary}>{it.summary}</div> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                No digest loaded yet. Use <strong>Update and show latest</strong> to see what is currently stored.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

