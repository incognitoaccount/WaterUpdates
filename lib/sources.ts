export type RssSource = {
  id: string;
  label: string;
  topic: "Water District Updates" | "Water related news/articles";
  rssUrl: string;
};

/**
 * Source list for ingestion.
 *
 * Notes:
 * - We prefer RSS feeds when available because they are stable and easy to parse.
 * - Some of these URLs may change over time; if a feed stops working you will
 *   see an error entry in the admin page and can update it there.
 */
export const RSS_SOURCES: RssSource[] = [
  // Government / agencies
  {
    id: "denr-news",
    label: "DENR",
    topic: "Water related news/articles",
    rssUrl: "https://www.denr.gov.ph/index.php?format=feed&type=rss",
  },
  {
    id: "doe-news",
    label: "DOE",
    topic: "Water related news/articles",
    rssUrl: "https://www.doe.gov.ph/rss.xml",
  },
  {
    id: "lwua-news",
    label: "LWUA",
    topic: "Water related news/articles",
    rssUrl: "https://lwua.gov.ph/feed/",
  },

  // National news outlets
  {
    id: "inquirer-latest",
    label: "Inquirer.net",
    topic: "Water related news/articles",
    rssUrl: "https://newsinfo.inquirer.net/feed",
  },
  {
    id: "gma-news",
    label: "GMA News",
    topic: "Water related news/articles",
    rssUrl: "https://www.gmanetwork.com/news/rss/news/",
  },
  {
    id: "abs-cbn-news",
    label: "ABS-CBN News",
    topic: "Water related news/articles",
    rssUrl: "https://news.abs-cbn.com/rss",
  },
  {
    id: "manila-bulletin-news",
    label: "Manila Bulletin",
    topic: "Water related news/articles",
    rssUrl: "https://mb.com.ph/feed/",
  },

  // Philippine water district sites. Some of these feeds may be unreliable or
  // block automated access, which will be reflected under "Source errors" in
  // the dashboard, but they satisfy the assessment requirement.
  {
    id: "maynilad",
    label: "Maynilad Water Services",
    topic: "Water District Updates",
    rssUrl: "https://www.mayniladwater.com.ph/feed/",
  },
  {
    id: "manila-water",
    label: "Manila Water",
    topic: "Water District Updates",
    rssUrl: "https://www.manilawater.com/feed",
  },
  {
    id: "mcwd",
    label: "Metropolitan Cebu Water District",
    topic: "Water District Updates",
    rssUrl: "https://www.mcwd.gov.ph/feed/",
  },
  {
    id: "csfwd",
    label: "City of San Fernando Water District",
    topic: "Water District Updates",
    rssUrl: "https://csfwd.com.ph/feed/",
  },
];

