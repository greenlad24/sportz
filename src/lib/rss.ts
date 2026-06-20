import { XMLParser } from "fast-xml-parser";
import type { RawItem } from "./types";
import type { Source } from "./sources";
import { stripHtml } from "./utils";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

/** שאיבת פיד RSS/Atom יחיד והמרה ל-RawItem[] */
async function fetchSource(source: Source): Promise<RawItem[]> {
  try {
    const res = await fetch(source.url, {
      headers: {
        // חלק מהשירותים (Reddit/Google) דורשים user-agent
        "User-Agent":
          "Mozilla/5.0 (compatible; SportzBot/1.0; +https://example.com)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
      // לא לשמור במטמון - אנחנו רוצים מידע טרי כל 5 דקות
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[rss] ${source.id} -> HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const data = parser.parse(xml);

    // תמיכה גם ב-RSS 2.0 (rss.channel.item) וגם ב-Atom (feed.entry)
    const rssItems = asArray(data?.rss?.channel?.item);
    const atomEntries = asArray(data?.feed?.entry);

    const items: RawItem[] = [];

    for (const it of rssItems) {
      const title = stripHtml(String(it?.title ?? ""));
      const link =
        typeof it?.link === "string"
          ? it.link
          : it?.link?.["@_href"] ?? it?.guid?.["#text"] ?? it?.guid ?? "";
      const summary = stripHtml(
        String(it?.description ?? it?.["content:encoded"] ?? ""),
      );
      const pub = it?.pubDate ?? it?.["dc:date"] ?? it?.published;
      if (!title || !link) continue;
      items.push({
        title,
        summary,
        link: String(link),
        source: source.name,
        lang: source.lang,
        category: source.category,
        publishedAt: toIso(pub),
      });
    }

    for (const e of atomEntries) {
      const title = stripHtml(String(e?.title?.["#text"] ?? e?.title ?? ""));
      const linkRaw = asArray(e?.link).find(
        (l: any) => !l?.["@_rel"] || l?.["@_rel"] === "alternate",
      );
      const link = linkRaw?.["@_href"] ?? e?.id ?? "";
      const summary = stripHtml(
        String(e?.summary?.["#text"] ?? e?.summary ?? e?.content?.["#text"] ?? ""),
      );
      const pub = e?.updated ?? e?.published;
      if (!title || !link) continue;
      items.push({
        title,
        summary,
        link: String(link),
        source: source.name,
        lang: source.lang,
        category: source.category,
        publishedAt: toIso(pub),
      });
    }

    return items;
  } catch (err) {
    console.warn(`[rss] ${source.id} failed:`, (err as Error).message);
    return [];
  }
}

function toIso(value: unknown): string {
  if (!value) return new Date().toISOString();
  const t = new Date(String(value)).getTime();
  return Number.isNaN(t) ? new Date().toISOString() : new Date(t).toISOString();
}

/** שאיבת כל המקורות במקביל */
export async function fetchAllSources(sources: Source[]): Promise<RawItem[]> {
  const results = await Promise.all(sources.map(fetchSource));
  return results.flat();
}
