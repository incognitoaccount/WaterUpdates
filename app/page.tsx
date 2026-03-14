import styles from "./page.module.css";
import Link from "next/link";
import { DateTime } from "luxon";
import { getPool } from "@/lib/db";

// Render on each request so we never need DATABASE_URL at build time (Railway injects it at runtime).
export const dynamic = "force-dynamic";

type RecentArticle = {
  id: number;
  source: string;
  topic: string | null;
  title: string;
  url: string;
  publishedAt: string;
};

async function loadRecentArticles(): Promise<RecentArticle[]> {
  const pool = getPool();
  const base = DateTime.now().setZone("Asia/Manila");
  const windowStart = base.minus({ days: 7 }).startOf("day");

  type Row = {
    id: number;
    source: string;
    topic: string | null;
    title: string;
    url: string;
    published_at: Date;
    summary: string | null;
  };

  const res = await pool.query<Row>(
    `
      SELECT id, source, topic, title, url, published_at, summary
      FROM articles
      WHERE published_at >= $1
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
      LIMIT 10
    `,
    [windowStart.toUTC().toISO()],
  );

  return res.rows.map((row) => ({
    id: row.id,
    source: row.source,
    topic: row.topic,
    title: row.title,
    url: row.url,
    publishedAt: DateTime.fromJSDate(new Date(row.published_at)).toFormat(
      "MMM d, yyyy • HH:mm",
    ),
  }));
}

export default async function Home() {
  const recent = await loadRecentArticles();
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          <div>
            <div className={styles.brandTitle}>Water Updates</div>
            <div className={styles.brandSubtitle}>Water news digest via Telegram</div>
          </div>
        </div>
        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navLink}>
            Dashboard
          </Link>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.heroContainer}>
          <div className={styles.heroTextContent}>
            <h1 className={styles.heroTitle}>Automatic water-related updates delivered to Telegram.</h1>
            <p className={styles.heroText}>
              This tool collects water district advisories and water-related news, stores them in a database, and sends
              new articles automatically to your Telegram chat.
            </p>

            <div className={styles.heroActions}>
              <Link href="/admin" className={styles.primaryButton}>
                Open dashboard
              </Link>
              <Link href="/#recent" className={styles.secondaryButton}>
                View recent articles
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.mockupWindow}>
              <div className={styles.mockupHeader}>
                <span className={styles.mockupDot} style={{ background: "#ff5f56" }} />
                <span className={styles.mockupDot} style={{ background: "#ffbd2e" }} />
                <span className={styles.mockupDot} style={{ background: "#27c93f" }} />
              </div>
              <div className={styles.mockupBody}>
                <div className={styles.messageBubble}>
                  <div className={styles.messageSource}>💦 Water Updates Bot</div>
                  <div className={styles.messageTitle}>Daily Digest: Mar 12</div>
                  <div className={styles.messageLine}></div>
                  <div className={styles.messageLine} style={{ width: "80%" }}></div>
                </div>
                <div className={styles.messageBubble} style={{ animationDelay: "1.5s", opacity: 0 }}>
                  <div className={styles.messageSource}>⚠️ Maynilad Advisory</div>
                  <div className={styles.messageTitle}>Water Interruption</div>
                  <div className={styles.messageLine}></div>
                </div>
                <div className={styles.messageBubble} style={{ animationDelay: "3s", opacity: 0 }}>
                  <div className={styles.messageSource}>📰 DENR News</div>
                  <div className={styles.messageTitle}>New Water Policy</div>
                  <div className={styles.messageLine}></div>
                  <div className={styles.messageLine} style={{ width: "60%" }}></div>
                </div>
              </div>
            </div>

            <div className={styles.glowOne} />
            <div className={styles.glowTwo} />
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <h2>Daily digest window</h2>
            <p>
              The system selects articles between 9:00&nbsp;AM yesterday and 8:59&nbsp;AM today (Asia/Manila), matching
              the assessment specification.
            </p>
          </div>
          <div className={styles.card}>
            <h2>Multiple trusted sources</h2>
            <p>
              Sources include government agencies, major news outlets, and configurable water district websites. You can
              adjust them in <code>lib/sources.ts</code>.
            </p>
          </div>
          <div className={styles.card}>
            <h2>Telegram integration</h2>
            <p>
              New water-related articles are sent automatically to your Telegram chat. You can also send the latest
              digest on demand from the dashboard.
            </p>
          </div>
        </section>

        <section id="recent" className={styles.recentSection}>
          <div className={styles.recentHeader}>
            <h2>Recent articles (last 7 days)</h2>
            <p>
              Snapshot of water-related news and water district advisories collected in the last seven days. New items
              are sent automatically to Telegram.
            </p>
          </div>

          {recent.length === 0 ? (
            <div className={styles.recentEmpty}>
              No articles saved yet. Open the dashboard and choose <strong>Update from sources</strong> to fetch the latest
              items.
            </div>
          ) : (
            <ul className={styles.recentList}>
              {recent.map((item) => (
                <li key={item.id} className={styles.recentItem}>
                  <div className={styles.recentTitle}>{item.title}</div>
                  <div className={styles.recentMeta}>
                    <span className={styles.recentSource}>{item.source}</span>
                    {item.topic ? <span className={styles.recentDot}>•</span> : null}
                    {item.topic ? <span>{item.topic}</span> : null}
                    <span className={styles.recentDot}>•</span>
                    <span>{item.publishedAt}</span>
                  </div>
                  <a className={styles.recentLink} href={item.url} target="_blank" rel="noreferrer">
                    View article
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
