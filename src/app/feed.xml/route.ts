import { getArticles } from "@/lib/store";
import { SITE, siteUrl } from "@/lib/site";

export const revalidate = 300;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = siteUrl();
  const articles = (await getArticles()).slice(0, 50);

  const items = articles
    .map((a) => {
      const url = `${base}/article/${a.slug}`;
      return `    <item>
      <title>${esc(a.headline)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(a.summary)}</description>
      <category>${esc(a.category)}</category>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(SITE.name)} - ${esc(SITE.tagline)}</title>
    <link>${base}</link>
    <description>${esc(SITE.description)}</description>
    <language>he</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
