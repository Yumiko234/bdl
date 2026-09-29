import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://bdl-saintandre.fr";
const SUPABASE_URL = "https://ppmlhjcwdyaarbqpngla.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwbWxoamN3ZHlhYXJicXBuZ2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NzExOTAsImV4cCI6MjA3NTU0NzE5MH0.PvzdJ2vdKoUG7louIArChmHkZb9I60KMTcKzhurnj6E";

const STATIC = [
  ["/", "1.0", "daily"],
  ["/actualites", "0.9", "daily"],
  ["/events", "0.9", "weekly"],
  ["/documents", "0.8", "weekly"],
  ["/bdl", "0.8", "weekly"],
  ["/bdl-history", "0.6", "monthly"],
  ["/clubs", "0.7", "weekly"],
  ["/etablissement", "0.7", "monthly"],
  ["/sondage", "0.6", "weekly"],
  ["/scrutin", "0.6", "weekly"],
  ["/calendrier", "0.7", "weekly"],
  ["/conference", "0.5", "weekly"],
  ["/contact", "0.7", "monthly"],
  ["/support", "0.5", "monthly"],
  ["/faq", "0.6", "monthly"],
  ["/mentionslegales", "0.3", "yearly"],
  ["/confidentialite", "0.3", "yearly"],
];

function url(loc: string, priority: string, changefreq: string) {
  return `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

export default async function handler(): Promise<Response> {
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const [newsRes, eventsRes] = await Promise.all([
    sb.from("news").select("id, published_at").order("published_at", { ascending: false }).limit(200),
    sb.from("events").select("id, start_date").order("start_date", { ascending: false }).limit(200),
  ]);

  const parts = STATIC.map(([loc, pri, cf]) => url(loc, pri, cf));

  for (const n of newsRes.data ?? []) {
    const lastmod = n.published_at ? `\n    <lastmod>${n.published_at.slice(0, 10)}</lastmod>` : "";
    parts.push(`  <url>\n    <loc>${BASE_URL}/actualites#article-${n.id}</loc>${lastmod}\n    <changefreq>never</changefreq>\n    <priority>0.6</priority>\n  </url>`);
  }

  for (const e of eventsRes.data ?? []) {
    const lastmod = e.start_date ? `\n    <lastmod>${e.start_date.slice(0, 10)}</lastmod>` : "";
    parts.push(`  <url>\n    <loc>${BASE_URL}/events#event-${e.id}</loc>${lastmod}\n    <changefreq>never</changefreq>\n    <priority>0.6</priority>\n  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.join("\n")}\n</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
