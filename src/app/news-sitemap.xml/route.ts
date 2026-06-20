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

/**
 * Google News Sitemap - כולל רק כתבות מ-48 השעות האחרונות (דרישת Google News).
 * עוזר לאינדוקס מהיר של חדשות טריות.
 */
export async function GET() {
  const base = siteUrl();
  const cutoff = Date.now() - 48 * 36e5;
  const articles = (await getArticles()).filter(
    (a) => new Date(a.publishedAt).getTime() >= cutoff,
  );

  const urls = articles
    .map((a) => {
      const url = `${base}/article/${a.slug}`;
      return `  <url>
    <loc>${esc(url)}</loc>
    <news:news>
      <news:publication>
        <news:name>${esc(SITE.name)}</news:name>
        <news:language>he</news:language>
      </news:publication>
      <news:publication_date>${new Date(a.publishedAt).toISOString()}</news:publication_date>
      <news:title>${esc(a.headline)}</news:title>
    </news:news>
  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
